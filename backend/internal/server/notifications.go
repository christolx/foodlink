package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"

	"foodlink-be/internal/api"
	"foodlink-be/internal/store"
)

func (s *Server) ListNotifications(ctx context.Context, request api.ListNotificationsRequestObject) (api.ListNotificationsResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.ListNotifications401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	page, pageSize, err := pagination(request.Params.Page, request.Params.PageSize)
	if err != nil {
		return api.ListNotifications400JSONResponse{BadRequestJSONResponse: badRequest(err.Error())}, nil
	}
	notifications, total, err := s.store.ListNotifications(user.ID, page, pageSize)
	if err != nil {
		return api.ListNotifications500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	items := make([]api.Notification, 0, len(notifications))
	for _, notification := range notifications {
		items = append(items, notificationDTO(notification))
	}
	return api.ListNotifications200JSONResponse{Items: items, Page: page, PageSize: pageSize, Total: int(total)}, nil
}

func (s *Server) MarkNotificationRead(ctx context.Context, request api.MarkNotificationReadRequestObject) (api.MarkNotificationReadResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.MarkNotificationRead401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	notification, err := s.store.MarkNotificationRead(request.Id, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.MarkNotificationRead404JSONResponse{NotFoundJSONResponse: notFound("notification not found")}, nil
	}
	if err != nil {
		return api.MarkNotificationRead500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.MarkNotificationRead200JSONResponse(notificationDTO(notification)), nil
}

func (s *Server) StreamNotifications(ctx context.Context, request api.StreamNotificationsRequestObject) (api.StreamNotificationsResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.StreamNotifications401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	notifications, _, err := s.store.ListNotifications(user.ID, 1, 20)
	if err != nil {
		return api.StreamNotifications500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	pr, pw := io.Pipe()
	go func() {
		defer pw.Close()
		enc := json.NewEncoder(pw)
		for _, notification := range notifications {
			_, _ = fmt.Fprint(pw, "event: notification\n")
			_, _ = fmt.Fprint(pw, "data: ")
			if err := enc.Encode(notificationDTO(notification)); err != nil {
				return
			}
			_, _ = fmt.Fprint(pw, "\n")
		}
	}()
	return api.StreamNotifications200TexteventStreamResponse{Body: pr}, nil
}
