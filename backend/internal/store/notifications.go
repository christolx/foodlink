package store

import (
	"errors"
	"time"

	"foodlink-be/internal/models"

	"gorm.io/gorm"
)

func (s *Store) ListNotifications(userID string, page, pageSize int) ([]models.Notification, int64, error) {
	var notifications []models.Notification
	query := s.db.Model(&models.Notification{}).Where("user_id = ?", userID)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&notifications).Error
	return notifications, total, err
}

func (s *Store) MarkNotificationRead(id, userID string) (models.Notification, error) {
	var notification models.Notification
	err := s.db.First(&notification, "id = ? AND user_id = ?", id, userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return notification, ErrNotFound
	}
	if err != nil {
		return notification, err
	}
	now := time.Now().UTC()
	if err := s.db.Model(&notification).Updates(map[string]any{"read": true, "read_at": now}).Error; err != nil {
		return notification, err
	}
	notification.Read = true
	notification.ReadAt = &now
	return notification, nil
}

func createNotification(tx *gorm.DB, userID, notificationType, title, body string, donationID, proposalID, pickupID *string) error {
	return tx.Create(&models.Notification{
		ID:         NewID("notif"),
		UserID:     userID,
		Type:       notificationType,
		Title:      title,
		Body:       body,
		Read:       false,
		DonationID: donationID,
		ProposalID: proposalID,
		PickupID:   pickupID,
		CreatedAt:  time.Now().UTC(),
	}).Error
}
