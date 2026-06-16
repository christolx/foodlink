package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"

	openapi_types "github.com/oapi-codegen/runtime/types"
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

func userDTO(user models.User) api.User {
	return api.User{
		Id:        user.ID,
		Name:      user.Name,
		Email:     openapi_types.Email(user.Email),
		Role:      api.UserRole(user.Role),
		Phone:     user.Phone,
		CreatedAt: user.CreatedAt,
	}
}

func profileDTO(profile models.Profile) api.Profile {
	return api.Profile{
		UserId:           profile.UserID,
		DisplayName:      profile.DisplayName,
		Role:             api.UserRole(profile.Role),
		ContactMethod:    api.ContactMethod(profile.ContactMethod),
		ContactValue:     profile.ContactValue,
		Location:         locationDTO(profile.Location),
		EntityType:       entityTypeDTO(profile.EntityType),
		OperationalHours: profile.OperationalHours,
		Notes:            profile.Notes,
		CreatedAt:        profile.CreatedAt,
		UpdatedAt:        profile.UpdatedAt,
	}
}

func donationDTO(donation models.Donation) api.Donation {
	return api.Donation{
		Id:                  donation.ID,
		DonorId:             donation.DonorID,
		Title:               donation.Title,
		Description:         donation.Description,
		Quantity:            donation.Quantity,
		ImageUrl:            donationImageURL(donation.ImageURL),
		Status:              api.DonationStatus(donation.Status),
		PickupLocation:      locationDTO(donation.PickupLocation),
		AvailableFrom:       donation.AvailableFrom,
		AvailableUntil:      donation.AvailableUntil,
		SpecialInstructions: donation.SpecialInstructions,
		CreatedAt:           donation.CreatedAt,
		UpdatedAt:           donation.UpdatedAt,
	}
}

func donationImageURL(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func requiredCloudinaryImageURL(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", fmt.Errorf("imageUrl is required")
	}
	if len(trimmed) > 2048 {
		return "", fmt.Errorf("imageUrl must be 2048 characters or fewer")
	}
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Host == "" || parsed.Scheme != "https" {
		return "", fmt.Errorf("imageUrl must be a Cloudinary HTTPS URL")
	}
	if parsed.Host != "res.cloudinary.com" {
		return "", fmt.Errorf("imageUrl must be a Cloudinary HTTPS URL")
	}
	return trimmed, nil
}

func (s *Server) deliveryProposalDTO(proposal models.DeliveryProposal) api.DeliveryProposal {
	dto := api.DeliveryProposal{
		Id:                       proposal.ID,
		DonationId:               proposal.DonationID,
		ReceiverId:               proposal.ReceiverID,
		VolunteerId:              proposal.VolunteerID,
		Status:                   api.ProposalStatus(proposal.Status),
		VolunteerContactOverride: proposal.VolunteerContactOverride,
		DonorAcceptedAt:          proposal.DonorAcceptedAt,
		ReceiverAcceptedAt:       proposal.ReceiverAcceptedAt,
		RejectedByUserId:         proposal.RejectedByUserID,
		CreatedAt:                proposal.CreatedAt,
		UpdatedAt:                proposal.UpdatedAt,
	}
	s.enrichDashboardRelations(&dto, nil)
	return dto
}

func (s *Server) pickupDTO(pickup models.Pickup) api.Pickup {
	dto := api.Pickup{
		Id:               pickup.ID,
		DonationId:       pickup.DonationID,
		ProposalId:       pickup.ProposalID,
		ReceiverId:       pickup.ReceiverID,
		VolunteerId:      pickup.VolunteerID,
		Status:           api.PickupStatus(pickup.Status),
		PickupLocation:   locationDTO(pickup.PickupLocation),
		DeliveryLocation: locationDTO(pickup.DeliveryLocation),
		PickedUpAt:       pickup.PickedUpAt,
		DeliveredAt:      pickup.DeliveredAt,
		CreatedAt:        pickup.CreatedAt,
		UpdatedAt:        pickup.UpdatedAt,
	}
	s.enrichDashboardRelations(nil, &dto)
	return dto
}

func (s *Server) enrichDashboardRelations(proposal *api.DeliveryProposal, pickup *api.Pickup) {
	var donationID string
	var receiverID string
	var volunteerID string
	if proposal != nil {
		donationID = proposal.DonationId
		receiverID = proposal.ReceiverId
		volunteerID = proposal.VolunteerId
	}
	if pickup != nil {
		donationID = pickup.DonationId
		receiverID = pickup.ReceiverId
		volunteerID = pickup.VolunteerId
	}

	donation, err := s.store.DonationByID(donationID)
	if err == nil {
		donationDTO := donationDTO(donation)
		if proposal != nil {
			proposal.Donation = &donationDTO
		}
		if pickup != nil {
			pickup.Donation = &donationDTO
		}
		if profile, err := s.store.ProfileByUserID(donation.DonorID); err == nil {
			profileDTO := profileDTO(profile)
			if proposal != nil {
				proposal.DonorProfile = &profileDTO
			}
			if pickup != nil {
				pickup.DonorProfile = &profileDTO
			}
		}
	}
	if profile, err := s.store.ProfileByUserID(receiverID); err == nil {
		profileDTO := profileDTO(profile)
		if proposal != nil {
			proposal.ReceiverProfile = &profileDTO
		}
		if pickup != nil {
			pickup.ReceiverProfile = &profileDTO
		}
	}
	if profile, err := s.store.ProfileByUserID(volunteerID); err == nil {
		profileDTO := profileDTO(profile)
		if proposal != nil {
			proposal.VolunteerProfile = &profileDTO
		}
		if pickup != nil {
			pickup.VolunteerProfile = &profileDTO
		}
	}
}

func notificationDTO(notification models.Notification) api.Notification {
	return api.Notification{
		Id:         notification.ID,
		UserId:     notification.UserID,
		Type:       api.NotificationType(notification.Type),
		Title:      notification.Title,
		Body:       notification.Body,
		Read:       notification.Read,
		DonationId: notification.DonationID,
		ProposalId: notification.ProposalID,
		PickupId:   notification.PickupID,
		CreatedAt:  notification.CreatedAt,
		ReadAt:     notification.ReadAt,
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

func entityTypeDTO(value *string) *api.EntityType {
	if value == nil {
		return nil
	}
	entityType := api.EntityType(*value)
	return &entityType
}

func entityTypeString(value *api.EntityType) *string {
	if value == nil {
		return nil
	}
	stringValue := string(*value)
	return &stringValue
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

func conflict(message string) api.ConflictJSONResponse {
	return api.ConflictJSONResponse(api.ErrorResponse{Code: "conflict", Message: message})
}

func internalError() api.InternalServerErrorJSONResponse {
	return api.InternalServerErrorJSONResponse(api.ErrorResponse{Code: "internal_error", Message: "unexpected server error"})
}

func isConflict(err error) bool {
	var conflictErr store.ConflictError
	return errors.As(err, &conflictErr)
}

func isForbidden(err error) bool {
	var forbiddenErr store.ForbiddenError
	return errors.As(err, &forbiddenErr)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
