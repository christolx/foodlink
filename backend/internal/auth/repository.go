package auth

import (
	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
)

type Repository interface {
	UserByID(string) (models.User, error)
	UserByRole(api.UserRole) (models.User, error)
}
