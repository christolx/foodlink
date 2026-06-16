package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"
)

type messageHub struct {
	mu   sync.RWMutex
	subs map[string]map[string]chan models.Message
}

func newMessageHub() *messageHub {
	return &messageHub{subs: make(map[string]map[string]chan models.Message)}
}

func (h *messageHub) subscribe(convID string) (<-chan models.Message, func()) {
	subID := store.NewID("sub")
	ch := make(chan models.Message, 32)
	h.mu.Lock()
	if h.subs[convID] == nil {
		h.subs[convID] = make(map[string]chan models.Message)
	}
	h.subs[convID][subID] = ch
	h.mu.Unlock()
	return ch, func() {
		h.mu.Lock()
		delete(h.subs[convID], subID)
		if len(h.subs[convID]) == 0 {
			delete(h.subs, convID)
		}
		h.mu.Unlock()
	}
}

func (h *messageHub) publish(convID string, msg models.Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, ch := range h.subs[convID] {
		select {
		case ch <- msg:
		default:
		}
	}
}

func (s *Server) ListChatConversations(ctx context.Context, request api.ListChatConversationsRequestObject) (api.ListChatConversationsResponseObject, error) {
	userID, ok := ctx.Value(userIDContextKey).(string)
	if !ok || userID == "" {
		return api.ListChatConversations401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	convs, err := s.store.ListConversations(userID)
	if err != nil {
		return api.ListChatConversations500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	out := make([]api.Conversation, 0, len(convs))
	for _, conv := range convs {
		out = append(out, s.chatConversationDTO(conv, userID))
	}
	return api.ListChatConversations200JSONResponse(out), nil
}

func (s *Server) GetOrCreateChatConversation(ctx context.Context, request api.GetOrCreateChatConversationRequestObject) (api.GetOrCreateChatConversationResponseObject, error) {
	userID, ok := ctx.Value(userIDContextKey).(string)
	if !ok || userID == "" {
		return api.GetOrCreateChatConversation401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	if request.Body == nil || strings.TrimSpace(request.Body.OtherUserId) == "" {
		return api.GetOrCreateChatConversation400JSONResponse{BadRequestJSONResponse: badRequest("otherUserId required")}, nil
	}
	conv, err := s.store.GetOrCreateConversation(userID, strings.TrimSpace(request.Body.OtherUserId))
	if isForbidden(err) {
		return api.GetOrCreateChatConversation403JSONResponse{ForbiddenJSONResponse: forbidden(err.Error())}, nil
	}
	if err != nil {
		return api.GetOrCreateChatConversation500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.GetOrCreateChatConversation200JSONResponse(s.chatConversationDTO(conv, userID)), nil
}

func (s *Server) ListChatMessages(ctx context.Context, request api.ListChatMessagesRequestObject) (api.ListChatMessagesResponseObject, error) {
	userID, ok := ctx.Value(userIDContextKey).(string)
	if !ok || userID == "" {
		return api.ListChatMessages401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	conv, status, err := s.chatMemberConversation(request.Id, userID)
	if err != nil {
		switch status {
		case http.StatusNotFound:
			return api.ListChatMessages404JSONResponse{NotFoundJSONResponse: notFound("conversation not found")}, nil
		case http.StatusForbidden:
			return api.ListChatMessages403JSONResponse{ForbiddenJSONResponse: forbidden("not conversation member")}, nil
		default:
			return api.ListChatMessages500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
		}
	}
	msgs, err := s.store.ListMessages(conv.ID, 200)
	if err != nil {
		return api.ListChatMessages500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	out := make([]api.ChatMessage, 0, len(msgs))
	for _, msg := range msgs {
		out = append(out, chatMessageDTO(msg))
	}
	return api.ListChatMessages200JSONResponse(out), nil
}

func (s *Server) SendChatMessage(ctx context.Context, request api.SendChatMessageRequestObject) (api.SendChatMessageResponseObject, error) {
	userID, ok := ctx.Value(userIDContextKey).(string)
	if !ok || userID == "" {
		return api.SendChatMessage401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	conv, status, err := s.chatMemberConversation(request.Id, userID)
	if err != nil {
		switch status {
		case http.StatusNotFound:
			return api.SendChatMessage404JSONResponse{NotFoundJSONResponse: notFound("conversation not found")}, nil
		case http.StatusForbidden:
			return api.SendChatMessage403JSONResponse{ForbiddenJSONResponse: forbidden("not conversation member")}, nil
		default:
			return api.SendChatMessage500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
		}
	}
	if request.Body == nil || strings.TrimSpace(request.Body.Body) == "" {
		return api.SendChatMessage400JSONResponse{BadRequestJSONResponse: badRequest("body required")}, nil
	}
	msg, err := s.store.CreateMessage(conv.ID, userID, strings.TrimSpace(request.Body.Body))
	if err != nil {
		return api.SendChatMessage500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	s.hub.publish(conv.ID, msg)
	return api.SendChatMessage201JSONResponse(chatMessageDTO(msg)), nil
}

func (s *Server) StreamChatMessages(ctx context.Context, request api.StreamChatMessagesRequestObject) (api.StreamChatMessagesResponseObject, error) {
	userID, err := parseBearer("Bearer "+request.Params.Token, s.jwtSecret)
	if err != nil {
		return api.StreamChatMessages401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	conv, status, err := s.chatMemberConversation(request.Id, userID)
	if err != nil {
		if status == http.StatusForbidden || status == http.StatusNotFound {
			return api.StreamChatMessages403JSONResponse{ForbiddenJSONResponse: forbidden("not conversation member")}, nil
		}
		return api.StreamChatMessages500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}

	reader, writer := io.Pipe()
	msgCh, unsubscribe := s.hub.subscribe(conv.ID)
	go func() {
		defer unsubscribe()
		defer writer.Close()
		_, _ = fmt.Fprint(writer, ": connected\n\n")
		for {
			select {
			case <-ctx.Done():
				return
			case msg := <-msgCh:
				data, _ := json.Marshal(chatMessageDTO(msg))
				if _, err := fmt.Fprintf(writer, "event: message\ndata: %s\n\n", data); err != nil {
					return
				}
			}
		}
	}()

	return api.StreamChatMessages200TexteventStreamResponse{Body: reader}, nil
}

func (s *Server) chatConversationDTO(conv models.Conversation, myID string) api.Conversation {
	otherID := conv.User2ID
	if otherID == myID {
		otherID = conv.User1ID
	}
	displayName, role := otherID, "unknown"
	if profile, err := s.store.ProfileByUserID(otherID); err == nil {
		displayName = profile.DisplayName
		role = profile.Role
	}
	return api.Conversation{
		Id: conv.ID,
		OtherUser: api.ChatUserSummary{
			Id:          otherID,
			DisplayName: displayName,
			Role:        role,
		},
		CreatedAt: conv.CreatedAt,
		UpdatedAt: conv.UpdatedAt,
	}
}

func chatMessageDTO(msg models.Message) api.ChatMessage {
	return api.ChatMessage{
		Id:             msg.ID,
		ConversationId: msg.ConversationID,
		SenderId:       msg.SenderID,
		Body:           msg.Body,
		CreatedAt:      msg.CreatedAt,
	}
}

func (s *Server) chatMemberConversation(convID, userID string) (models.Conversation, int, error) {
	conv, err := s.store.ConversationByID(convID)
	if errors.Is(err, store.ErrNotFound) {
		return conv, http.StatusNotFound, err
	}
	if err != nil {
		return conv, http.StatusInternalServerError, err
	}
	if conv.User1ID != userID && conv.User2ID != userID {
		return conv, http.StatusForbidden, store.ErrForbidden("not_conversation_member")
	}
	return conv, http.StatusOK, nil
}
