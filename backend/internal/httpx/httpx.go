// Package httpx contains transport helpers shared by feature HTTP adapters.
package httpx

import (
	"context"
	"errors"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
)

type Authenticate func(context.Context) (models.User, bool)

func Pagination(pagePtr, pageSizePtr *int) (int, int, error) {
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

func ValidDonationStatus(value *api.DonationStatus) bool {
	if value == nil {
		return true
	}
	switch *value {
	case api.DonationStatusAvailable,
		api.DonationStatusProposalPending,
		api.DonationStatusPickupAssigned,
		api.DonationStatusPickedUp,
		api.DonationStatusDelivered,
		api.DonationStatusCanceled:
		return true
	default:
		return false
	}
}

func ValidProposalStatus(value *api.ProposalStatus) bool {
	if value == nil {
		return true
	}
	switch *value {
	case api.ProposalStatusPending,
		api.ProposalStatusAccepted,
		api.ProposalStatusRejected,
		api.ProposalStatusCanceled:
		return true
	default:
		return false
	}
}

func ValidPickupStatus(value *api.PickupStatus) bool {
	if value == nil {
		return true
	}
	switch *value {
	case api.PickupStatusAssigned,
		api.PickupStatusPickedUp,
		api.PickupStatusDelivered,
		api.PickupStatusCanceled:
		return true
	default:
		return false
	}
}

func BadRequest(message string) api.BadRequestJSONResponse {
	return api.BadRequestJSONResponse(api.ErrorResponse{Code: "bad_request", Message: message})
}
func Unauthorized() api.UnauthorizedJSONResponse {
	return api.UnauthorizedJSONResponse(api.ErrorResponse{Code: "unauthorized", Message: "missing or invalid bearer token"})
}
func Forbidden(message string) api.ForbiddenJSONResponse {
	return api.ForbiddenJSONResponse(api.ErrorResponse{Code: "forbidden", Message: message})
}
func NotFound(message string) api.NotFoundJSONResponse {
	return api.NotFoundJSONResponse(api.ErrorResponse{Code: "not_found", Message: message})
}
func Conflict(message string) api.ConflictJSONResponse {
	return api.ConflictJSONResponse(api.ErrorResponse{Code: "conflict", Message: message})
}
func InternalError() api.InternalServerErrorJSONResponse {
	return api.InternalServerErrorJSONResponse(api.ErrorResponse{Code: "internal_error", Message: "unexpected server error"})
}
