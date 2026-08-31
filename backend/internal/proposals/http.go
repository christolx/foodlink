package proposals

import (
	"context"
	"errors"

	"foodlink-be/internal/api"
	"foodlink-be/internal/httpx"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"
)

type Presenter interface {
	Proposal(models.DeliveryProposal) api.DeliveryProposal
	Proposals([]models.DeliveryProposal) ([]api.DeliveryProposal, error)
	Pickup(models.Pickup) api.Pickup
}
type HTTPHandler struct {
	service      *Service
	authenticate httpx.Authenticate
	presenter    Presenter
}

func NewHTTPHandler(service *Service, authenticate httpx.Authenticate, presenter Presenter) *HTTPHandler {
	return &HTTPHandler{service: service, authenticate: authenticate, presenter: presenter}
}
func (h *HTTPHandler) ListDeliveryProposals(ctx context.Context, request api.ListDeliveryProposalsRequestObject) (api.ListDeliveryProposalsResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.ListDeliveryProposals401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	page, pageSize, err := httpx.Pagination(request.Params.Page, request.Params.PageSize)
	if err != nil {
		return api.ListDeliveryProposals400JSONResponse{BadRequestJSONResponse: httpx.BadRequest(err.Error())}, nil
	}
	if !httpx.ValidProposalStatus(request.Params.Status) {
		return api.ListDeliveryProposals400JSONResponse{BadRequestJSONResponse: httpx.BadRequest("invalid status")}, nil
	}
	values, total, err := h.service.List(page, pageSize, request.Params.Status, user)
	if err != nil {
		return api.ListDeliveryProposals500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	items, err := h.presenter.Proposals(values)
	if err != nil {
		return api.ListDeliveryProposals500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	return api.ListDeliveryProposals200JSONResponse{Items: items, Page: page, PageSize: pageSize, Total: int(total)}, nil
}
func (h *HTTPHandler) CreateDeliveryProposal(ctx context.Context, request api.CreateDeliveryProposalRequestObject) (api.CreateDeliveryProposalResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.CreateDeliveryProposal401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	if user.Role != string(api.Volunteer) {
		return api.CreateDeliveryProposal403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden("volunteer role required")}, nil
	}
	if request.Body == nil || request.Body.DonationId == "" || request.Body.ReceiverId == "" {
		return api.CreateDeliveryProposal400JSONResponse{BadRequestJSONResponse: httpx.BadRequest("donationId and receiverId are required")}, nil
	}
	proposal, err := h.service.Create(request.Body.DonationId, request.Body.ReceiverId, user, request.Body.VolunteerContactOverride)
	if errors.Is(err, store.ErrNotFound) {
		return api.CreateDeliveryProposal404JSONResponse{NotFoundJSONResponse: httpx.NotFound("donation or receiver not found")}, nil
	}
	if store.IsForbidden(err) {
		return api.CreateDeliveryProposal403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden(err.Error())}, nil
	}
	if store.IsConflict(err) {
		return api.CreateDeliveryProposal409JSONResponse{ConflictJSONResponse: httpx.Conflict(err.Error())}, nil
	}
	if err != nil {
		return api.CreateDeliveryProposal500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	return api.CreateDeliveryProposal201JSONResponse(h.presenter.Proposal(proposal)), nil
}
func (h *HTTPHandler) AcceptDeliveryProposal(ctx context.Context, request api.AcceptDeliveryProposalRequestObject) (api.AcceptDeliveryProposalResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.AcceptDeliveryProposal401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	proposal, pickup, err := h.service.Accept(request.Id, user)
	if errors.Is(err, store.ErrNotFound) {
		return api.AcceptDeliveryProposal404JSONResponse{NotFoundJSONResponse: httpx.NotFound("proposal not found")}, nil
	}
	if store.IsForbidden(err) {
		return api.AcceptDeliveryProposal403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden(err.Error())}, nil
	}
	if store.IsConflict(err) {
		return api.AcceptDeliveryProposal409JSONResponse{ConflictJSONResponse: httpx.Conflict(err.Error())}, nil
	}
	if err != nil {
		return api.AcceptDeliveryProposal500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	response := api.DeliveryProposalAcceptResponse{Proposal: h.presenter.Proposal(proposal)}
	if pickup != nil {
		dto := h.presenter.Pickup(*pickup)
		response.Pickup = &dto
	}
	return api.AcceptDeliveryProposal200JSONResponse(response), nil
}
func (h *HTTPHandler) RejectDeliveryProposal(ctx context.Context, request api.RejectDeliveryProposalRequestObject) (api.RejectDeliveryProposalResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.RejectDeliveryProposal401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	proposal, err := h.service.Reject(request.Id, user)
	if errors.Is(err, store.ErrNotFound) {
		return api.RejectDeliveryProposal404JSONResponse{NotFoundJSONResponse: httpx.NotFound("proposal not found")}, nil
	}
	if store.IsForbidden(err) {
		return api.RejectDeliveryProposal403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden(err.Error())}, nil
	}
	if store.IsConflict(err) {
		return api.RejectDeliveryProposal409JSONResponse{ConflictJSONResponse: httpx.Conflict(err.Error())}, nil
	}
	if err != nil {
		return api.RejectDeliveryProposal500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	return api.RejectDeliveryProposal200JSONResponse(h.presenter.Proposal(proposal)), nil
}
