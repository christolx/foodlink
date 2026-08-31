package auth

import (
	"context"
	"errors"

	"foodlink-be/internal/api"
	"foodlink-be/internal/httpx"
	"foodlink-be/internal/store"
)

type IssueToken func(string) (string, error)
type HTTPHandler struct {
	service    *Service
	issueToken IssueToken
}

func NewHTTPHandler(service *Service, issueToken IssueToken) *HTTPHandler {
	return &HTTPHandler{service: service, issueToken: issueToken}
}
func (h *HTTPHandler) DemoLogin(_ context.Context, request api.DemoLoginRequestObject) (api.DemoLoginResponseObject, error) {
	if request.Body == nil || (request.Body.UserId == nil && request.Body.Role == nil) {
		return api.DemoLogin400JSONResponse{BadRequestJSONResponse: httpx.BadRequest("missing userId or role")}, nil
	}
	user, err := h.service.DemoUser(request.Body.UserId, request.Body.Role)
	if errors.Is(err, store.ErrNotFound) {
		return api.DemoLogin400JSONResponse{BadRequestJSONResponse: httpx.BadRequest("demo user not found")}, nil
	}
	if err != nil {
		return api.DemoLogin500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	token, err := h.issueToken(user.ID)
	if err != nil {
		return api.DemoLogin500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	tokenType := api.Bearer
	return api.DemoLogin200JSONResponse{AccessToken: token, TokenType: &tokenType, User: userDTO(user)}, nil
}
