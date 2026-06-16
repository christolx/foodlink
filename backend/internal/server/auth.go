package server

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const userIDContextKey contextKey = "userID"

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
