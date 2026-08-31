// Package profiles owns profile use cases and persistence boundary.
package profiles

import "foodlink-be/internal/models"

type Service struct{ repository Repository }

func New(repository Repository) *Service { return &Service{repository: repository} }
func (s *Service) Get(userID string) (models.Profile, error) {
	return s.repository.ProfileByUserID(userID)
}
func (s *Service) Save(profile models.Profile) (models.Profile, error) {
	return s.repository.UpsertProfile(profile)
}
func (s *Service) ListReceivers(page, pageSize int) ([]models.Profile, int64, error) {
	return s.repository.ListReceivers(page, pageSize)
}
