package server

import (
	"context"
	"errors"
	"strings"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"
)

func (s *Server) ListDonations(ctx context.Context, request api.ListDonationsRequestObject) (api.ListDonationsResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.ListDonations401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	page, pageSize, err := pagination(request.Params.Page, request.Params.PageSize)
	if err != nil {
		return api.ListDonations400JSONResponse{BadRequestJSONResponse: badRequest(err.Error())}, nil
	}
	donations, total, err := s.store.ListDonations(page, pageSize, request.Params.Status, user)
	if err != nil {
		return api.ListDonations500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	items := make([]api.Donation, 0, len(donations))
	for _, donation := range donations {
		items = append(items, donationDTO(donation))
	}
	return api.ListDonations200JSONResponse{Items: items, Page: page, PageSize: pageSize, Total: int(total)}, nil
}

func (s *Server) CreateDonation(ctx context.Context, request api.CreateDonationRequestObject) (api.CreateDonationResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.CreateDonation401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	if user.Role != string(api.Donor) {
		return api.CreateDonation403JSONResponse{ForbiddenJSONResponse: forbidden("donor role required")}, nil
	}
	if request.Body == nil || strings.TrimSpace(request.Body.Title) == "" || strings.TrimSpace(request.Body.Quantity) == "" {
		return api.CreateDonation400JSONResponse{BadRequestJSONResponse: badRequest("title and quantity are required")}, nil
	}
	if !request.Body.AvailableUntil.After(request.Body.AvailableFrom) {
		return api.CreateDonation400JSONResponse{BadRequestJSONResponse: badRequest("availableUntil must be after availableFrom")}, nil
	}
	imageURL, err := requiredCloudinaryImageURL(request.Body.ImageUrl)
	if err != nil {
		return api.CreateDonation400JSONResponse{BadRequestJSONResponse: badRequest(err.Error())}, nil
	}
	now := time.Now().UTC()
	donation := models.Donation{
		ID:                  store.NewID("donation"),
		DonorID:             user.ID,
		Title:               request.Body.Title,
		Description:         request.Body.Description,
		Quantity:            request.Body.Quantity,
		ImageURL:            &imageURL,
		Status:              string(api.DonationStatusAvailable),
		PickupLocation:      locationModel(request.Body.PickupLocation),
		AvailableFrom:       request.Body.AvailableFrom,
		AvailableUntil:      request.Body.AvailableUntil,
		SpecialInstructions: request.Body.SpecialInstructions,
		CreatedAt:           now,
		UpdatedAt:           now,
	}
	if err := s.store.CreateDonation(donation); err != nil {
		return api.CreateDonation500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.CreateDonation201JSONResponse(donationDTO(donation)), nil
}

func (s *Server) GetDonation(ctx context.Context, request api.GetDonationRequestObject) (api.GetDonationResponseObject, error) {
	if _, ok := s.authUser(ctx); !ok {
		return api.GetDonation401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	donation, err := s.store.DonationByID(request.Id)
	if errors.Is(err, store.ErrNotFound) {
		return api.GetDonation404JSONResponse{NotFoundJSONResponse: notFound("donation not found")}, nil
	}
	if err != nil {
		return api.GetDonation500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.GetDonation200JSONResponse(donationDTO(donation)), nil
}
