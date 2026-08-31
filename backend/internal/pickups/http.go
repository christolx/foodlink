package pickups

import (
	"context"
	"errors"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/httpx"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"
)

type Presenter interface {
	Pickup(models.Pickup) api.Pickup
	Pickups([]models.Pickup) ([]api.Pickup, error)
}
type HTTPHandler struct {
	service      *Service
	authenticate httpx.Authenticate
	presenter    Presenter
}

func NewHTTPHandler(service *Service, authenticate httpx.Authenticate, presenter Presenter) *HTTPHandler {
	return &HTTPHandler{service: service, authenticate: authenticate, presenter: presenter}
}
func (h *HTTPHandler) ListPickups(ctx context.Context, request api.ListPickupsRequestObject) (api.ListPickupsResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.ListPickups401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	page, pageSize, err := httpx.Pagination(request.Params.Page, request.Params.PageSize)
	if err != nil {
		return api.ListPickups400JSONResponse{BadRequestJSONResponse: httpx.BadRequest(err.Error())}, nil
	}
	if !httpx.ValidPickupStatus(request.Params.Status) {
		return api.ListPickups400JSONResponse{BadRequestJSONResponse: httpx.BadRequest("invalid status")}, nil
	}
	values, total, err := h.service.List(page, pageSize, request.Params.Status, user)
	if err != nil {
		return api.ListPickups500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	items, err := h.presenter.Pickups(values)
	if err != nil {
		return api.ListPickups500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	return api.ListPickups200JSONResponse{Items: items, Page: page, PageSize: pageSize, Total: int(total)}, nil
}
func (h *HTTPHandler) MarkPickupPickedUp(ctx context.Context, request api.MarkPickupPickedUpRequestObject) (api.MarkPickupPickedUpResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.MarkPickupPickedUp401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	if user.Role != string(api.Volunteer) {
		return api.MarkPickupPickedUp403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden("volunteer role required")}, nil
	}
	occurredAt := time.Now().UTC()
	if request.Body != nil && request.Body.OccurredAt != nil {
		occurredAt = *request.Body.OccurredAt
	}
	pickup, err := h.service.MarkPickedUp(request.Id, user.ID, occurredAt)
	if errors.Is(err, store.ErrNotFound) {
		return api.MarkPickupPickedUp404JSONResponse{NotFoundJSONResponse: httpx.NotFound("pickup not found")}, nil
	}
	if store.IsForbidden(err) {
		return api.MarkPickupPickedUp403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden(err.Error())}, nil
	}
	if store.IsConflict(err) {
		return api.MarkPickupPickedUp409JSONResponse{ConflictJSONResponse: httpx.Conflict(err.Error())}, nil
	}
	if err != nil {
		return api.MarkPickupPickedUp500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	return api.MarkPickupPickedUp200JSONResponse(h.presenter.Pickup(pickup)), nil
}
func (h *HTTPHandler) MarkPickupDelivered(ctx context.Context, request api.MarkPickupDeliveredRequestObject) (api.MarkPickupDeliveredResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.MarkPickupDelivered401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	if user.Role != string(api.Volunteer) && user.Role != string(api.Receiver) {
		return api.MarkPickupDelivered403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden("volunteer or receiver role required")}, nil
	}
	occurredAt := time.Now().UTC()
	if request.Body != nil && request.Body.OccurredAt != nil {
		occurredAt = *request.Body.OccurredAt
	}
	pickup, err := h.service.MarkDelivered(request.Id, user.ID, user.Role, occurredAt)
	if errors.Is(err, store.ErrNotFound) {
		return api.MarkPickupDelivered404JSONResponse{NotFoundJSONResponse: httpx.NotFound("pickup not found")}, nil
	}
	if store.IsForbidden(err) {
		return api.MarkPickupDelivered403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden(err.Error())}, nil
	}
	if store.IsConflict(err) {
		return api.MarkPickupDelivered409JSONResponse{ConflictJSONResponse: httpx.Conflict(err.Error())}, nil
	}
	if err != nil {
		return api.MarkPickupDelivered500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	return api.MarkPickupDelivered200JSONResponse(h.presenter.Pickup(pickup)), nil
}
