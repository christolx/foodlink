package notifications

import "foodlink-be/internal/models"

type Repository interface {
	ListNotifications(string, int, int) ([]models.Notification, int64, error)
	MarkNotificationRead(string, string) (models.Notification, error)
}
