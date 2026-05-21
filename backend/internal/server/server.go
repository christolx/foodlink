package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
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

func (s *Server) ListDonations(ctx context.Context, request api.ListDonationsRequestObject) (api.ListDonationsResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.ListDonations401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	page, pageSize, err := pagination(request.Params.Page, request.Params.PageSize)
	if err != nil {
		return api.ListDonations400JSONResponse{BadRequestJSONResponse: badRequest(err.Error())}, nil
	}
	donations, total, err := s.store.ListDonations(page, pageSize, request.Params.Status, request.Params.Role, user.ID)
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
	if request.Body == nil || strings.TrimSpace(request.Body.Title) == "" || strings.TrimSpace(request.Body.Quantity) == "" {
		return api.CreateDonation400JSONResponse{BadRequestJSONResponse: badRequest("title and quantity are required")}, nil
	}
	if !request.Body.AvailableUntil.After(request.Body.AvailableFrom) {
		return api.CreateDonation400JSONResponse{BadRequestJSONResponse: badRequest("availableUntil must be after availableFrom")}, nil
	}
	now := time.Now().UTC()
	donation := models.Donation{
		ID:                  store.NewID("donation"),
		DonorID:             user.ID,
		Title:               request.Body.Title,
		Description:         request.Body.Description,
		Quantity:            request.Body.Quantity,
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

func (s *Server) ClaimDonation(ctx context.Context, request api.ClaimDonationRequestObject) (api.ClaimDonationResponseObject, error) {
	user, ok := s.authUser(ctx)
	if !ok {
		return api.ClaimDonation401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	var note *string
	if request.Body != nil {
		note = request.Body.Note
	}
	claim, err := s.store.CreateClaim(request.Id, user.ID, note)
	if errors.Is(err, store.ErrNotFound) {
		return api.ClaimDonation404JSONResponse{NotFoundJSONResponse: notFound("donation not found")}, nil
	}
	if isConflict(err) {
		return api.ClaimDonation409JSONResponse{ConflictJSONResponse: conflict(err.Error())}, nil
	}
	if err != nil {
		return api.ClaimDonation500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.ClaimDonation201JSONResponse(claimDTO(claim)), nil
}

func (s *Server) ApproveClaim(ctx context.Context, request api.ApproveClaimRequestObject) (api.ApproveClaimResponseObject, error) {
	if _, ok := s.authUser(ctx); !ok {
		return api.ApproveClaim401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	if request.Body == nil {
		return api.ApproveClaim400JSONResponse{BadRequestJSONResponse: badRequest("deliveryLocation is required")}, nil
	}
	claim, pickup, err := s.store.ApproveClaim(request.Id, locationModel(request.Body.DeliveryLocation))
	if errors.Is(err, store.ErrNotFound) {
		return api.ApproveClaim404JSONResponse{NotFoundJSONResponse: notFound("claim not found")}, nil
	}
	if isConflict(err) {
		return api.ApproveClaim409JSONResponse{ConflictJSONResponse: conflict(err.Error())}, nil
	}
	if err != nil {
		return api.ApproveClaim500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.ApproveClaim200JSONResponse{Claim: claimDTO(claim), Pickup: pickupDTO(pickup)}, nil
}

func (s *Server) RejectClaim(ctx context.Context, request api.RejectClaimRequestObject) (api.RejectClaimResponseObject, error) {
	if _, ok := s.authUser(ctx); !ok {
		return api.RejectClaim401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	var reason *string
	if request.Body != nil {
		reason = request.Body.Reason
	}
	claim, err := s.store.RejectClaim(request.Id, reason)
	if errors.Is(err, store.ErrNotFound) {
		return api.RejectClaim404JSONResponse{NotFoundJSONResponse: notFound("claim not found")}, nil
	}
	if isConflict(err) {
		return api.RejectClaim409JSONResponse{ConflictJSONResponse: conflict(err.Error())}, nil
	}
	if err != nil {
		return api.RejectClaim500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.RejectClaim200JSONResponse(claimDTO(claim)), nil
}

func (s *Server) AssignPickupVolunteer(ctx context.Context, request api.AssignPickupVolunteerRequestObject) (api.AssignPickupVolunteerResponseObject, error) {
	if _, ok := s.authUser(ctx); !ok {
		return api.AssignPickupVolunteer401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	if request.Body == nil || request.Body.VolunteerId == "" {
		return api.AssignPickupVolunteer400JSONResponse{BadRequestJSONResponse: badRequest("volunteerId is required")}, nil
	}
	pickup, err := s.store.AssignVolunteer(request.Id, request.Body.VolunteerId)
	if errors.Is(err, store.ErrNotFound) {
		return api.AssignPickupVolunteer404JSONResponse{NotFoundJSONResponse: notFound("pickup or volunteer not found")}, nil
	}
	if isConflict(err) {
		return api.AssignPickupVolunteer409JSONResponse{ConflictJSONResponse: conflict(err.Error())}, nil
	}
	if err != nil {
		return api.AssignPickupVolunteer500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.AssignPickupVolunteer200JSONResponse(pickupDTO(pickup)), nil
}

func (s *Server) MarkPickupPickedUp(ctx context.Context, request api.MarkPickupPickedUpRequestObject) (api.MarkPickupPickedUpResponseObject, error) {
	if _, ok := s.authUser(ctx); !ok {
		return api.MarkPickupPickedUp401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	occurredAt := time.Now().UTC()
	if request.Body != nil && request.Body.OccurredAt != nil {
		occurredAt = *request.Body.OccurredAt
	}
	pickup, err := s.store.MarkPickedUp(request.Id, occurredAt)
	if errors.Is(err, store.ErrNotFound) {
		return api.MarkPickupPickedUp404JSONResponse{NotFoundJSONResponse: notFound("pickup not found")}, nil
	}
	if isConflict(err) {
		return api.MarkPickupPickedUp409JSONResponse{ConflictJSONResponse: conflict(err.Error())}, nil
	}
	if err != nil {
		return api.MarkPickupPickedUp500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.MarkPickupPickedUp200JSONResponse(pickupDTO(pickup)), nil
}

func (s *Server) MarkPickupDelivered(ctx context.Context, request api.MarkPickupDeliveredRequestObject) (api.MarkPickupDeliveredResponseObject, error) {
	if _, ok := s.authUser(ctx); !ok {
		return api.MarkPickupDelivered401JSONResponse{UnauthorizedJSONResponse: unauthorized()}, nil
	}
	occurredAt := time.Now().UTC()
	if request.Body != nil && request.Body.OccurredAt != nil {
		occurredAt = *request.Body.OccurredAt
	}
	pickup, err := s.store.MarkDelivered(request.Id, occurredAt)
	if errors.Is(err, store.ErrNotFound) {
		return api.MarkPickupDelivered404JSONResponse{NotFoundJSONResponse: notFound("pickup not found")}, nil
	}
	if isConflict(err) {
		return api.MarkPickupDelivered409JSONResponse{ConflictJSONResponse: conflict(err.Error())}, nil
	}
	if err != nil {
		return api.MarkPickupDelivered500JSONResponse{InternalServerErrorJSONResponse: internalError()}, nil
	}
	return api.MarkPickupDelivered200JSONResponse(pickupDTO(pickup)), nil
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

func donationDTO(donation models.Donation) api.Donation {
	return api.Donation{
		Id:                  donation.ID,
		DonorId:             donation.DonorID,
		Title:               donation.Title,
		Description:         donation.Description,
		Quantity:            donation.Quantity,
		Status:              api.DonationStatus(donation.Status),
		PickupLocation:      locationDTO(donation.PickupLocation),
		AvailableFrom:       donation.AvailableFrom,
		AvailableUntil:      donation.AvailableUntil,
		SpecialInstructions: donation.SpecialInstructions,
		CreatedAt:           donation.CreatedAt,
		UpdatedAt:           donation.UpdatedAt,
	}
}

func claimDTO(claim models.Claim) api.Claim {
	return api.Claim{
		Id:         claim.ID,
		DonationId: claim.DonationID,
		ReceiverId: claim.ReceiverID,
		Status:     api.ClaimStatus(claim.Status),
		Note:       claim.Note,
		CreatedAt:  claim.CreatedAt,
		UpdatedAt:  claim.UpdatedAt,
	}
}

func pickupDTO(pickup models.Pickup) api.Pickup {
	return api.Pickup{
		Id:               pickup.ID,
		DonationId:       pickup.DonationID,
		ClaimId:          pickup.ClaimID,
		VolunteerId:      pickup.VolunteerID,
		Status:           api.PickupStatus(pickup.Status),
		PickupLocation:   locationDTO(pickup.PickupLocation),
		DeliveryLocation: locationDTO(pickup.DeliveryLocation),
		PickedUpAt:       pickup.PickedUpAt,
		DeliveredAt:      pickup.DeliveredAt,
		CreatedAt:        pickup.CreatedAt,
		UpdatedAt:        pickup.UpdatedAt,
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
		ClaimId:    notification.ClaimID,
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

func badRequest(message string) api.BadRequestJSONResponse {
	return api.BadRequestJSONResponse(api.ErrorResponse{Code: "bad_request", Message: message})
}

func unauthorized() api.UnauthorizedJSONResponse {
	return api.UnauthorizedJSONResponse(api.ErrorResponse{Code: "unauthorized", Message: "missing or invalid bearer token"})
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

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
