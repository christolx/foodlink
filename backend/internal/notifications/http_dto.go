package notifications

import (
	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
)

func notificationDTO(notification models.Notification) api.Notification {
	return api.Notification{Id: notification.ID, UserId: notification.UserID, Type: api.NotificationType(notification.Type), Title: notification.Title, Body: notification.Body, Read: notification.Read, DonationId: notification.DonationID, ProposalId: notification.ProposalID, PickupId: notification.PickupID, CreatedAt: notification.CreatedAt, ReadAt: notification.ReadAt}
}
