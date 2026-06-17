package server

import (
	"context"
	"errors"

	"foodlink-be/internal/api"
	"foodlink-be/internal/store"
)

func (s *Server) ListDeliveryProposals(ctx context.Context, request api.ListDeliveryProposalsRequestObject) (api.ListDeliveryProposalsResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.ListDeliveryProposals401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	page, pageSize, err := pagination(request.Params.Page, request.Params.PageSize)
	if err != nil {
		return api.ListDeliveryProposals400JSONResponse{BadRequestJSONResponse: badRequest(err.Error())}, nil
	}
	proposals, total, err := s.store.ListDeliveryProposals(page, pageSize, request.Params.Status, user)
	if err != nil {
		return api.ListDeliveryProposals500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	items, err := s.deliveryProposalListDTOs(proposals)
	if err != nil {
		return api.ListDeliveryProposals500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.ListDeliveryProposals200JSONResponse{Items: items, Page: page, PageSize: pageSize, Total: int(total)}, nil
}

func (s *Server) CreateDeliveryProposal(ctx context.Context, request api.CreateDeliveryProposalRequestObject) (api.CreateDeliveryProposalResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.CreateDeliveryProposal401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	if user.Role != string(api.Volunteer) {
		return api.CreateDeliveryProposal403JSONResponse{ForbiddenJSONResponse: forbidden("volunteer role required")}, nil
	}
	if request.Body == nil || request.Body.DonationId == "" || request.Body.ReceiverId == "" {
		return api.CreateDeliveryProposal400JSONResponse{BadRequestJSONResponse: badRequest("donationId and receiverId are required")}, nil
	}
	proposal, err := s.store.CreateDeliveryProposal(request.Body.DonationId, request.Body.ReceiverId, user.ID, request.Body.VolunteerContactOverride)
	if errors.Is(err, store.ErrNotFound) {
		return api.CreateDeliveryProposal404JSONResponse{NotFoundJSONResponse: notFound("donation or receiver not found")}, nil
	}
	if isConflict(err) {
		return api.CreateDeliveryProposal409JSONResponse{ConflictJSONResponse: conflict(err.Error())}, nil
	}
	if err != nil {
		return api.CreateDeliveryProposal500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.CreateDeliveryProposal201JSONResponse(s.deliveryProposalDTO(proposal)), nil
}

func (s *Server) AcceptDeliveryProposal(ctx context.Context, request api.AcceptDeliveryProposalRequestObject) (api.AcceptDeliveryProposalResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.AcceptDeliveryProposal401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	proposal, pickup, err := s.store.AcceptDeliveryProposal(request.Id, user)
	if errors.Is(err, store.ErrNotFound) {
		return api.AcceptDeliveryProposal404JSONResponse{NotFoundJSONResponse: notFound("proposal not found")}, nil
	}
	if isForbidden(err) {
		return api.AcceptDeliveryProposal403JSONResponse{ForbiddenJSONResponse: forbidden(err.Error())}, nil
	}
	if isConflict(err) {
		return api.AcceptDeliveryProposal409JSONResponse{ConflictJSONResponse: conflict(err.Error())}, nil
	}
	if err != nil {
		return api.AcceptDeliveryProposal500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	response := api.DeliveryProposalAcceptResponse{Proposal: s.deliveryProposalDTO(proposal)}
	if pickup != nil {
		dto := s.pickupDTO(*pickup)
		response.Pickup = &dto
	}
	return api.AcceptDeliveryProposal200JSONResponse(response), nil
}

func (s *Server) RejectDeliveryProposal(ctx context.Context, request api.RejectDeliveryProposalRequestObject) (api.RejectDeliveryProposalResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.RejectDeliveryProposal401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	proposal, err := s.store.RejectDeliveryProposal(request.Id, user)
	if errors.Is(err, store.ErrNotFound) {
		return api.RejectDeliveryProposal404JSONResponse{NotFoundJSONResponse: notFound("proposal not found")}, nil
	}
	if isForbidden(err) {
		return api.RejectDeliveryProposal403JSONResponse{ForbiddenJSONResponse: forbidden(err.Error())}, nil
	}
	if isConflict(err) {
		return api.RejectDeliveryProposal409JSONResponse{ConflictJSONResponse: conflict(err.Error())}, nil
	}
	if err != nil {
		return api.RejectDeliveryProposal500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.RejectDeliveryProposal200JSONResponse(s.deliveryProposalDTO(proposal)), nil
}
