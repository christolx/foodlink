package donations

import (
	"context"
	"errors"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"
)

// HTTPHandler adapts generated OpenAPI requests to donation use cases.
type HTTPHandler struct {
	service      *Service
	authenticate func(context.Context) (models.User, bool)
}

func NewHTTPHandler(service *Service, authenticate func(context.Context) (models.User, bool)) *HTTPHandler {
	return &HTTPHandler{service: service, authenticate: authenticate}
}

func (h *HTTPHandler) ListDonations(ctx context.Context, request api.ListDonationsRequestObject) (api.ListDonationsResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.ListDonations401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	page, pageSize, err := pagination(request.Params.Page, request.Params.PageSize)
	if err != nil {
		return api.ListDonations400JSONResponse{BadRequestJSONResponse: badRequest(err.Error())}, nil
	}
	donations, total, err := h.service.List(page, pageSize, request.Params.Status, user)
	if err != nil {
		return api.ListDonations500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	items := make([]api.Donation, 0, len(donations))
	for _, donation := range donations {
		items = append(items, donationDTO(donation))
	}
	return api.ListDonations200JSONResponse{Items: items, Page: page, PageSize: pageSize, Total: int(total)}, nil
}

func (h *HTTPHandler) CreateDonation(ctx context.Context, request api.CreateDonationRequestObject) (api.CreateDonationResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.CreateDonation401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	if user.Role != string(api.Donor) {
		return api.CreateDonation403JSONResponse{ForbiddenJSONResponse: forbidden("donor role required")}, nil
	}
	if request.Body == nil {
		return api.CreateDonation400JSONResponse{BadRequestJSONResponse: badRequest("title and quantity are required")}, nil
	}
	donation, err := h.service.Create(CreateInput{
		DonorID:             user.ID,
		Title:               request.Body.Title,
		Description:         request.Body.Description,
		Quantity:            request.Body.Quantity,
		ImageURL:            request.Body.ImageUrl,
		PickupLocation:      locationModel(request.Body.PickupLocation),
		AvailableFrom:       request.Body.AvailableFrom,
		AvailableUntil:      request.Body.AvailableUntil,
		SpecialInstructions: request.Body.SpecialInstructions,
	})
	if errors.Is(err, ErrInvalidInput) {
		return api.CreateDonation400JSONResponse{BadRequestJSONResponse: badRequest(err.Error())}, nil
	}
	if err != nil {
		return api.CreateDonation500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.CreateDonation201JSONResponse(donationDTO(donation)), nil
}

func (h *HTTPHandler) GetDonation(ctx context.Context, request api.GetDonationRequestObject) (api.GetDonationResponseObject, error) {
	if _, ok := h.authenticate(ctx); !ok {
		return api.GetDonation401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	donation, err := h.service.Get(request.Id)
	if errors.Is(err, store.ErrNotFound) {
		return api.GetDonation404JSONResponse{NotFoundJSONResponse: notFound("donation not found")}, nil
	}
	if err != nil {
		return api.GetDonation500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.GetDonation200JSONResponse(donationDTO(donation)), nil
}
