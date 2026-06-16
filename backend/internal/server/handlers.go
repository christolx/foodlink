package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"
)

func (s *Server) DemoLogin(ctx context.Context, request api.DemoLoginRequestObject) (api.DemoLoginResponseObject, error) {
	if request.Body == nil || (request.Body.UserId == nil && request.Body.Role == nil) {
		return api.DemoLogin400JSONResponse{BadRequestJSONResponse: badRequest("missing userId or role")}, nil
	}

	var user models.User
	var err error
	if request.Body.UserId != nil {
		user, err = s.store.UserByID(*request.Body.UserId)
	} else {
		user, err = s.store.UserByRole(*request.Body.Role)
	}
	if errors.Is(err, store.ErrNotFound) {
		return api.DemoLogin400JSONResponse{BadRequestJSONResponse: badRequest("demo user not found")}, nil
	}
	if err != nil {
		return api.DemoLogin500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}

	token, err := s.signToken(user.ID)
	if err != nil {
		return api.DemoLogin500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	tokenType := api.Bearer
	return api.DemoLogin200JSONResponse{
		AccessToken: token,
		TokenType:   &tokenType,
		User:        userDTO(user),
	}, nil
}

func (s *Server) GetMe(ctx context.Context, request api.GetMeRequestObject) (api.GetMeResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.GetMe401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	return api.GetMe200JSONResponse(userDTO(user)), nil
}

func (s *Server) GetMyProfile(ctx context.Context, request api.GetMyProfileRequestObject) (api.GetMyProfileResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.GetMyProfile401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	profile, err := s.store.ProfileByUserID(user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.GetMyProfile404JSONResponse{NotFoundJSONResponse: notFound("profile not found")}, nil
	}
	if err != nil {
		return api.GetMyProfile500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.GetMyProfile200JSONResponse(profileDTO(profile)), nil
}

func (s *Server) UpdateMyProfile(ctx context.Context, request api.UpdateMyProfileRequestObject) (api.UpdateMyProfileResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.UpdateMyProfile401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	if request.Body == nil || strings.TrimSpace(request.Body.DisplayName) == "" || strings.TrimSpace(request.Body.ContactValue) == "" {
		return api.UpdateMyProfile400JSONResponse{BadRequestJSONResponse: badRequest("displayName and contactValue are required")}, nil
	}
	profile := models.Profile{
		UserID:           user.ID,
		DisplayName:      request.Body.DisplayName,
		Role:             user.Role,
		ContactMethod:    string(request.Body.ContactMethod),
		ContactValue:     request.Body.ContactValue,
		Location:         locationModel(request.Body.Location),
		EntityType:       entityTypeString(request.Body.EntityType),
		OperationalHours: request.Body.OperationalHours,
		Notes:            request.Body.Notes,
	}
	updated, err := s.store.UpsertProfile(profile)
	if err != nil {
		return api.UpdateMyProfile500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.UpdateMyProfile200JSONResponse(profileDTO(updated)), nil
}

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

func (s *Server) ListReceivers(ctx context.Context, request api.ListReceiversRequestObject) (api.ListReceiversResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.ListReceivers401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	if user.Role != string(api.Volunteer) {
		return api.ListReceivers403JSONResponse{ForbiddenJSONResponse: forbidden("volunteer role required")}, nil
	}
	page, pageSize, err := pagination(request.Params.Page, request.Params.PageSize)
	if err != nil {
		return api.ListReceivers400JSONResponse{BadRequestJSONResponse: badRequest(err.Error())}, nil
	}
	profiles, total, err := s.store.ListReceivers(page, pageSize)
	if err != nil {
		return api.ListReceivers500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	items := make([]api.Profile, 0, len(profiles))
	for _, profile := range profiles {
		items = append(items, profileDTO(profile))
	}
	return api.ListReceivers200JSONResponse{Items: items, Page: page, PageSize: pageSize, Total: int(total)}, nil
}

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
	items := make([]api.DeliveryProposal, 0, len(proposals))
	for _, proposal := range proposals {
		items = append(items, s.deliveryProposalDTO(proposal))
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
