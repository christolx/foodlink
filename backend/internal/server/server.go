package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"

	"github.com/golang-jwt/jwt/v5"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type contextKey string

const userIDContextKey contextKey = "userID"

type Server struct {
	store     *store.Store
	jwtSecret []byte
}

func New(st *store.Store, jwtSecret string) *Server {
	return &Server{store: st, jwtSecret: []byte(jwtSecret)}
}

func Handler(st *store.Store, jwtSecret string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	strict := api.NewStrictHandlerWithOptions(
		New(st, jwtSecret),
		[]api.StrictMiddlewareFunc{authMiddleware(jwtSecret)},
		api.StrictHTTPServerOptions{
			RequestErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
				writeJSON(w, http.StatusBadRequest, api.ErrorResponse{Code: "bad_request", Message: err.Error()})
			},
			ResponseErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
				writeJSON(w, http.StatusInternalServerError, api.ErrorResponse{Code: "internal_error", Message: err.Error()})
			},
		},
	)
	return api.HandlerFromMuxWithBaseURL(strict, mux, "/api/v1")
}

func authMiddleware(secret string) api.StrictMiddlewareFunc {
	return func(next api.StrictHandlerFunc, operationID string) api.StrictHandlerFunc {
		return func(ctx context.Context, w http.ResponseWriter, r *http.Request, request any) (any, error) {
			if operationID == "DemoLogin" {
				return next(ctx, w, r, request)
			}
			userID, err := parseBearer(r.Header.Get("Authorization"), []byte(secret))
			if err == nil {
				ctx = context.WithValue(ctx, userIDContextKey, userID)
			}
			return next(ctx, w, r, request)
		}
	}
}

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

func (s *Server) authUser(ctx context.Context) (models.User, bool) {
	userID, ok := ctx.Value(userIDContextKey).(string)
	if !ok || userID == "" {
		return models.User{}, false
	}
	user, err := s.store.UserByID(userID)
	return user, err == nil
}

func (s *Server) signToken(userID string) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   userID,
		IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
		ExpiresAt: jwt.NewNumericDate(time.Now().UTC().Add(24 * time.Hour)),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
}

func parseBearer(header string, secret []byte) (string, error) {
	raw, ok := strings.CutPrefix(header, "Bearer ")
	if !ok {
		return "", errors.New("missing bearer token")
	}
	claims := jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(raw, &claims, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil || !token.Valid || claims.Subject == "" {
		return "", errors.New("invalid bearer token")
	}
	return claims.Subject, nil
}

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
