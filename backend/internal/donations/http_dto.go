package donations

import (
	"errors"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
)

func pagination(pagePtr *int, pageSizePtr *int) (int, int, error) {
	page, pageSize := 1, 20
	if pagePtr != nil {
		page = *pagePtr
	}
	if pageSizePtr != nil {
		pageSize = *pageSizePtr
	}
	if page < 1 {
		return 0, 0, errors.New("page must be >= 1")
	}
	if pageSize < 1 || pageSize > 100 {
		return 0, 0, errors.New("pageSize must be between 1 and 100")
	}
	return page, pageSize, nil
}

func donationDTO(donation models.Donation) api.Donation {
	imageURL := ""
	if donation.ImageURL != nil {
		imageURL = *donation.ImageURL
	}
	return api.Donation{
		Id:                  donation.ID,
		DonorId:             donation.DonorID,
		Title:               donation.Title,
		Description:         donation.Description,
		Quantity:            donation.Quantity,
		ImageUrl:            imageURL,
		Status:              api.DonationStatus(donation.Status),
		PickupLocation:      locationDTO(donation.PickupLocation),
		AvailableFrom:       donation.AvailableFrom,
		AvailableUntil:      donation.AvailableUntil,
		SpecialInstructions: donation.SpecialInstructions,
		CreatedAt:           donation.CreatedAt,
		UpdatedAt:           donation.UpdatedAt,
	}
}

func locationDTO(location models.LocationFields) api.Location {
	return api.Location{
		AddressLine1: location.AddressLine1,
		AddressLine2: location.AddressLine2,
		City:         location.City,
		Region:       location.Region,
		PostalCode:   location.PostalCode,
		Country:      location.Country,
		Latitude:     location.Latitude,
		Longitude:    location.Longitude,
	}
}

func locationModel(location api.Location) models.LocationFields {
	return models.LocationFields{
		AddressLine1: location.AddressLine1,
		AddressLine2: location.AddressLine2,
		City:         location.City,
		Region:       location.Region,
		PostalCode:   location.PostalCode,
		Country:      location.Country,
		Latitude:     location.Latitude,
		Longitude:    location.Longitude,
	}
}

func badRequest(message string) api.BadRequestJSONResponse {
	return api.BadRequestJSONResponse(api.ErrorResponse{Code: "bad_request", Message: message})
}

func unauthorized() api.UnauthorizedJSONResponse {
	return api.UnauthorizedJSONResponse(api.ErrorResponse{Code: "unauthorized", Message: "missing or invalid bearer token"})
}

func forbidden(message string) api.ForbiddenJSONResponse {
	return api.ForbiddenJSONResponse(api.ErrorResponse{Code: "forbidden", Message: message})
}

func notFound(message string) api.NotFoundJSONResponse {
	return api.NotFoundJSONResponse(api.ErrorResponse{Code: "not_found", Message: message})
}

func internalError() api.InternalServerErrorJSONResponse {
	return api.InternalServerErrorJSONResponse(api.ErrorResponse{Code: "internal_error", Message: "unexpected server error"})
}
