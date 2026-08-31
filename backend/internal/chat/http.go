package chat

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"foodlink-be/internal/api"
	"foodlink-be/internal/httpx"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"
)

type ParseToken func(string) (string, error)
type AuthenticateID func(context.Context) (string, bool)
type HTTPHandler struct {
	service      *Service
	authenticate AuthenticateID
	parseToken   ParseToken
}

func NewHTTPHandler(service *Service, authenticate AuthenticateID, parseToken ParseToken) *HTTPHandler {
	return &HTTPHandler{service: service, authenticate: authenticate, parseToken: parseToken}
}
func (h *HTTPHandler) ListChatConversations(ctx context.Context, _ api.ListChatConversationsRequestObject) (api.ListChatConversationsResponseObject, error) {
	userID, ok := h.authenticate(ctx)
	if !ok {
		return api.ListChatConversations401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	values, err := h.service.ListConversations(userID)
	if err != nil {
		return api.ListChatConversations500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	profiles, err := h.profiles(values, userID)
	if err != nil {
		return api.ListChatConversations500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	result := make([]api.Conversation, 0, len(values))
	for _, value := range values {
		result = append(result, conversationDTO(value, userID, profiles))
	}
	return api.ListChatConversations200JSONResponse(result), nil
}
func (h *HTTPHandler) GetOrCreateChatConversation(ctx context.Context, request api.GetOrCreateChatConversationRequestObject) (api.GetOrCreateChatConversationResponseObject, error) {
	userID, ok := h.authenticate(ctx)
	if !ok {
		return api.GetOrCreateChatConversation401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	if request.Body == nil || strings.TrimSpace(request.Body.OtherUserId) == "" {
		return api.GetOrCreateChatConversation400JSONResponse{BadRequestJSONResponse: httpx.BadRequest("otherUserId required")}, nil
	}
	value, err := h.service.GetOrCreate(userID, strings.TrimSpace(request.Body.OtherUserId))
	if store.IsForbidden(err) {
		return api.GetOrCreateChatConversation403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden(err.Error())}, nil
	}
	if err != nil {
		return api.GetOrCreateChatConversation500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	profiles, _ := h.profiles([]models.Conversation{value}, userID)
	return api.GetOrCreateChatConversation200JSONResponse(conversationDTO(value, userID, profiles)), nil
}
func (h *HTTPHandler) ListChatMessages(ctx context.Context, request api.ListChatMessagesRequestObject) (api.ListChatMessagesResponseObject, error) {
	userID, ok := h.authenticate(ctx)
	if !ok {
		return api.ListChatMessages401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	_, status, err := h.member(request.Id, userID)
	if err != nil {
		if status == http.StatusNotFound {
			return api.ListChatMessages404JSONResponse{NotFoundJSONResponse: httpx.NotFound("conversation not found")}, nil
		}
		if status == http.StatusForbidden {
			return api.ListChatMessages403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden("not conversation member")}, nil
		}
		return api.ListChatMessages500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	messages, err := h.service.Messages(request.Id)
	if err != nil {
		return api.ListChatMessages500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	result := make([]api.ChatMessage, 0, len(messages))
	for _, message := range messages {
		result = append(result, messageDTO(message))
	}
	return api.ListChatMessages200JSONResponse(result), nil
}
func (h *HTTPHandler) SendChatMessage(ctx context.Context, request api.SendChatMessageRequestObject) (api.SendChatMessageResponseObject, error) {
	userID, ok := h.authenticate(ctx)
	if !ok {
		return api.SendChatMessage401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	_, status, err := h.member(request.Id, userID)
	if err != nil {
		if status == http.StatusNotFound {
			return api.SendChatMessage404JSONResponse{NotFoundJSONResponse: httpx.NotFound("conversation not found")}, nil
		}
		if status == http.StatusForbidden {
			return api.SendChatMessage403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden("not conversation member")}, nil
		}
		return api.SendChatMessage500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	if request.Body == nil || strings.TrimSpace(request.Body.Body) == "" {
		return api.SendChatMessage400JSONResponse{BadRequestJSONResponse: httpx.BadRequest("body required")}, nil
	}
	message, err := h.service.Send(request.Id, userID, strings.TrimSpace(request.Body.Body))
	if err != nil {
		return api.SendChatMessage500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	return api.SendChatMessage201JSONResponse(messageDTO(message)), nil
}
func (h *HTTPHandler) StreamChatMessages(ctx context.Context, request api.StreamChatMessagesRequestObject) (api.StreamChatMessagesResponseObject, error) {
	userID, err := h.parseToken(request.Params.Token)
	if err != nil {
		return api.StreamChatMessages401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	_, status, err := h.member(request.Id, userID)
	if err != nil {
		if status == http.StatusForbidden || status == http.StatusNotFound {
			return api.StreamChatMessages403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden("not conversation member")}, nil
		}
		return api.StreamChatMessages500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	reader, writer := io.Pipe()
	messages, unsubscribe := h.service.Subscribe(request.Id)
	go func() {
		defer unsubscribe()
		defer writer.Close()
		_, _ = fmt.Fprint(writer, ": connected\n\n")
		for {
			select {
			case <-ctx.Done():
				return
			case message := <-messages:
				data, _ := json.Marshal(messageDTO(message))
				if _, err := fmt.Fprintf(writer, "event: message\ndata: %s\n\n", data); err != nil {
					return
				}
			}
		}
	}()
	return api.StreamChatMessages200TexteventStreamResponse{Body: reader}, nil
}
func (h *HTTPHandler) member(conversationID, userID string) (models.Conversation, int, error) {
	conversation, err := h.service.Conversation(conversationID)
	if errors.Is(err, store.ErrNotFound) {
		return conversation, http.StatusNotFound, err
	}
	if err != nil {
		return conversation, http.StatusInternalServerError, err
	}
	if conversation.User1ID != userID && conversation.User2ID != userID {
		return conversation, http.StatusForbidden, store.ErrForbidden("not_conversation_member")
	}
	return conversation, http.StatusOK, nil
}
func (h *HTTPHandler) profiles(conversations []models.Conversation, myID string) (map[string]models.Profile, error) {
	ids := make([]string, 0, len(conversations))
	for _, conversation := range conversations {
		id := conversation.User2ID
		if id == myID {
			id = conversation.User1ID
		}
		ids = append(ids, id)
	}
	values, err := h.service.Profiles(ids)
	if err != nil {
		return nil, err
	}
	result := make(map[string]models.Profile, len(values))
	for _, value := range values {
		result[value.UserID] = value
	}
	return result, nil
}
