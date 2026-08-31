// Package pickups owns pickup state transitions and persistence boundary.
package pickups

import (
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
)

type Service struct{ repository Repository }

func New(repository Repository) *Service { return &Service{repository: repository} }
func (s *Service) List(page, pageSize int, status *api.PickupStatus, user models.User) ([]models.Pickup, int64, error) {
	return s.repository.ListPickups(page, pageSize, status, user)
}
func (s *Service) MarkPickedUp(id, volunteerID string, occurredAt time.Time) (models.Pickup, error) {
	return s.repository.MarkPickedUp(id, volunteerID, occurredAt)
}
func (s *Service) MarkDelivered(id, userID, role string, occurredAt time.Time) (models.Pickup, error) {
	return s.repository.MarkDelivered(id, userID, role, occurredAt)
}
