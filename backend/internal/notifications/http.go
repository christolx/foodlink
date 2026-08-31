package notifications

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"

	"foodlink-be/internal/api"
	"foodlink-be/internal/httpx"
	"foodlink-be/internal/store"
)

type HTTPHandler struct {
	service      *Service
	authenticate httpx.Authenticate
}

func NewHTTPHandler(service *Service, authenticate httpx.Authenticate) *HTTPHandler {
	return &HTTPHandler{service: service, authenticate: authenticate}
}
func (h *HTTPHandler) ListNotifications(ctx context.Context, request api.ListNotificationsRequestObject) (api.ListNotificationsResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.ListNotifications401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	page, pageSize, err := httpx.Pagination(request.Params.Page, request.Params.PageSize)
	if err != nil {
		return api.ListNotifications400JSONResponse{BadRequestJSONResponse: httpx.BadRequest(err.Error())}, nil
	}
	notifications, total, err := h.service.List(user.ID, page, pageSize)
	if err != nil {
		return api.ListNotifications500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	items := make([]api.Notification, 0, len(notifications))
	for _, notification := range notifications {
		items = append(items, notificationDTO(notification))
	}
	return api.ListNotifications200JSONResponse{Items: items, Page: page, PageSize: pageSize, Total: int(total)}, nil
}
func (h *HTTPHandler) MarkNotificationRead(ctx context.Context, request api.MarkNotificationReadRequestObject) (api.MarkNotificationReadResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.MarkNotificationRead401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	notification, err := h.service.MarkRead(request.Id, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.MarkNotificationRead404JSONResponse{NotFoundJSONResponse: httpx.NotFound("notification not found")}, nil
	}
	if err != nil {
		return api.MarkNotificationRead500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	return api.MarkNotificationRead200JSONResponse(notificationDTO(notification)), nil
}
func (h *HTTPHandler) StreamNotifications(ctx context.Context, _ api.StreamNotificationsRequestObject) (api.StreamNotificationsResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.StreamNotifications401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	notifications, _, err := h.service.List(user.ID, 1, 20)
	if err != nil {
		return api.StreamNotifications500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	reader, writer := io.Pipe()
	go func() {
		defer writer.Close()
		encoder := json.NewEncoder(writer)
		for _, notification := range notifications {
			_, _ = fmt.Fprint(writer, "event: notification\n")
			_, _ = fmt.Fprint(writer, "data: ")
			if encoder.Encode(notificationDTO(notification)) != nil {
				return
			}
			_, _ = fmt.Fprint(writer, "\n")
		}
	}()
	return api.StreamNotifications200TexteventStreamResponse{Body: reader}, nil
}
