package server

import (
	"context"
	"errors"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/store"
)

func (s *Server) ListPickups(ctx context.Context, request api.ListPickupsRequestObject) (api.ListPickupsResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.ListPickups401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	page, pageSize, err := pagination(request.Params.Page, request.Params.PageSize)
	if err != nil {
		return api.ListPickups400JSONResponse{BadRequestJSONResponse: badRequest(err.Error())}, nil
	}
	pickups, total, err := s.store.ListPickups(page, pageSize, request.Params.Status, user)
	if err != nil {
		return api.ListPickups500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	items := make([]api.Pickup, 0, len(pickups))
	for _, pickup := range pickups {
		items = append(items, s.pickupDTO(pickup))
	}
	return api.ListPickups200JSONResponse{Items: items, Page: page, PageSize: pageSize, Total: int(total)}, nil
}

func (s *Server) MarkPickupPickedUp(ctx context.Context, request api.MarkPickupPickedUpRequestObject) (api.MarkPickupPickedUpResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.MarkPickupPickedUp401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	if user.Role != string(api.Volunteer) {
		return api.MarkPickupPickedUp403JSONResponse{ForbiddenJSONResponse: forbidden("volunteer role required")}, nil
	}
	occurredAt := time.Now().UTC()
	if request.Body != nil && request.Body.OccurredAt != nil {
		occurredAt = *request.Body.OccurredAt
	}
	pickup, err := s.store.MarkPickedUp(request.Id, user.ID, occurredAt)
	if errors.Is(err, store.ErrNotFound) {
		return api.MarkPickupPickedUp404JSONResponse{NotFoundJSONResponse: notFound("pickup not found")}, nil
	}
	if isForbidden(err) {
		return api.MarkPickupPickedUp403JSONResponse{ForbiddenJSONResponse: forbidden(err.Error())}, nil
	}
	if isConflict(err) {
		return api.MarkPickupPickedUp409JSONResponse{ConflictJSONResponse: conflict(err.Error())}, nil
	}
	if err != nil {
		return api.MarkPickupPickedUp500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.MarkPickupPickedUp200JSONResponse(s.pickupDTO(pickup)), nil
}

func (s *Server) MarkPickupDelivered(ctx context.Context, request api.MarkPickupDeliveredRequestObject) (api.MarkPickupDeliveredResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.MarkPickupDelivered401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	if user.Role != string(api.Volunteer) && user.Role != string(api.Receiver) {
		return api.MarkPickupDelivered403JSONResponse{ForbiddenJSONResponse: forbidden("volunteer or receiver role required")}, nil
	}
	occurredAt := time.Now().UTC()
	if request.Body != nil && request.Body.OccurredAt != nil {
		occurredAt = *request.Body.OccurredAt
	}
	pickup, err := s.store.MarkDelivered(request.Id, user.ID, user.Role, occurredAt)
	if errors.Is(err, store.ErrNotFound) {
		return api.MarkPickupDelivered404JSONResponse{NotFoundJSONResponse: notFound("pickup not found")}, nil
	}
	if isForbidden(err) {
		return api.MarkPickupDelivered403JSONResponse{ForbiddenJSONResponse: forbidden(err.Error())}, nil
	}
	if isConflict(err) {
		return api.MarkPickupDelivered409JSONResponse{ConflictJSONResponse: conflict(err.Error())}, nil
	}
	if err != nil {
		return api.MarkPickupDelivered500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.MarkPickupDelivered200JSONResponse(s.pickupDTO(pickup)), nil
}
