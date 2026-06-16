package server

import (
	"context"
	"errors"
	"strings"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"
)

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
