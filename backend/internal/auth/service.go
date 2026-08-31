// Package auth owns authentication use cases and user lookup boundary.
package auth

import (
	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
)

type Service struct{ repository Repository }

func New(repository Repository) *Service { return &Service{repository: repository} }

func (s *Service) User(id string) (models.User, error) { return s.repository.UserByID(id) }

func (s *Service) DemoUser(userID *string, role *api.UserRole) (models.User, error) {
	if userID != nil {
		return s.repository.UserByID(*userID)
	}
	return s.repository.UserByRole(*role)
}
