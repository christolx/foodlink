// Package notifications owns notification use cases and persistence boundary.
package notifications

import "foodlink-be/internal/models"

type Service struct{ repository Repository }

func New(repository Repository) *Service { return &Service{repository: repository} }
func (s *Service) List(userID string, page, pageSize int) ([]models.Notification, int64, error) {
	return s.repository.ListNotifications(userID, page, pageSize)
}
func (s *Service) MarkRead(id, userID string) (models.Notification, error) {
	return s.repository.MarkNotificationRead(id, userID)
}
