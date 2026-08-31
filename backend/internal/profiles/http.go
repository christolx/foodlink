package profiles

import (
	"context"
	"errors"
	"strings"

	"foodlink-be/internal/api"
	"foodlink-be/internal/httpx"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"

	openapi_types "github.com/oapi-codegen/runtime/types"
)

type HTTPHandler struct {
	service      *Service
	authenticate httpx.Authenticate
}

func NewHTTPHandler(service *Service, authenticate httpx.Authenticate) *HTTPHandler {
	return &HTTPHandler{service: service, authenticate: authenticate}
}
func (h *HTTPHandler) GetMe(ctx context.Context, _ api.GetMeRequestObject) (api.GetMeResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.GetMe401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	return api.GetMe200JSONResponse(userDTO(user)), nil
}
func (h *HTTPHandler) GetMyProfile(ctx context.Context, _ api.GetMyProfileRequestObject) (api.GetMyProfileResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.GetMyProfile401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	profile, err := h.service.Get(user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.GetMyProfile404JSONResponse{NotFoundJSONResponse: httpx.NotFound("profile not found")}, nil
	}
	if err != nil {
		return api.GetMyProfile500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	return api.GetMyProfile200JSONResponse(profileDTO(profile)), nil
}
func (h *HTTPHandler) UpdateMyProfile(ctx context.Context, request api.UpdateMyProfileRequestObject) (api.UpdateMyProfileResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.UpdateMyProfile401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	if request.Body == nil || strings.TrimSpace(request.Body.DisplayName) == "" || strings.TrimSpace(request.Body.ContactValue) == "" {
		return api.UpdateMyProfile400JSONResponse{BadRequestJSONResponse: httpx.BadRequest("displayName and contactValue are required")}, nil
	}
	updated, err := h.service.Save(models.Profile{UserID: user.ID, DisplayName: request.Body.DisplayName, Role: user.Role, ContactMethod: string(request.Body.ContactMethod), ContactValue: request.Body.ContactValue, Location: locationModel(request.Body.Location), EntityType: entityTypeString(request.Body.EntityType), OperationalHours: request.Body.OperationalHours, Notes: request.Body.Notes})
	if err != nil {
		return api.UpdateMyProfile500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	return api.UpdateMyProfile200JSONResponse(profileDTO(updated)), nil
}
func (h *HTTPHandler) ListReceivers(ctx context.Context, request api.ListReceiversRequestObject) (api.ListReceiversResponseObject, error) {
	user, ok := h.authenticate(ctx)
	if !ok {
		return api.ListReceivers401JSONResponse{UnauthorizedJSONResponse: httpx.Unauthorized()}, nil
	}
	if user.Role != string(api.Volunteer) {
		return api.ListReceivers403JSONResponse{ForbiddenJSONResponse: httpx.Forbidden("volunteer role required")}, nil
	}
	page, pageSize, err := httpx.Pagination(request.Params.Page, request.Params.PageSize)
	if err != nil {
		return api.ListReceivers400JSONResponse{BadRequestJSONResponse: httpx.BadRequest(err.Error())}, nil
	}
	profiles, total, err := h.service.ListReceivers(page, pageSize)
	if err != nil {
		return api.ListReceivers500JSONResponse{InternalServerErrorJSONResponse: httpx.InternalError()}, nil
	}
	items := make([]api.Profile, 0, len(profiles))
	for _, profile := range profiles {
		items = append(items, profileDTO(profile))
	}
	return api.ListReceivers200JSONResponse{Items: items, Page: page, PageSize: pageSize, Total: int(total)}, nil
}
func userDTO(user models.User) api.User {
	return api.User{Id: user.ID, Name: user.Name, Email: openapi_types.Email(user.Email), Role: api.UserRole(user.Role), Phone: user.Phone, CreatedAt: user.CreatedAt}
}
