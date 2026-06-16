package store

import (
	"errors"
	"time"

	"foodlink-be/internal/models"

	"gorm.io/gorm"
)

func (s *Store) GetOrCreateConversation(userA, userB string) (models.Conversation, error) {
	u1, u2 := normalizeConversationUsers(userA, userB)
	if u1 == "" || u2 == "" || u1 == u2 {
		return models.Conversation{}, ErrForbidden("invalid_chat_users")
	}
	allowed, err := s.UsersRelatedForChat(u1, u2)
	if err != nil {
		return models.Conversation{}, err
	}
	if !allowed {
		return models.Conversation{}, ErrForbidden("chat_users_not_related")
	}

	var conv models.Conversation
	err = s.db.Where("user1_id = ? AND user2_id = ?", u1, u2).First(&conv).Error
	if err == nil {
		return conv, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return conv, err
	}

	now := time.Now().UTC()
	conv = models.Conversation{
		ID:        NewID("conv"),
		User1ID:   u1,
		User2ID:   u2,
		CreatedAt: now,
		UpdatedAt: now,
	}
	return conv, s.db.Create(&conv).Error
}

func (s *Store) ConversationByID(id string) (models.Conversation, error) {
	var conv models.Conversation
	err := s.db.First(&conv, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return conv, ErrNotFound
	}
	return conv, err
}

func (s *Store) ListConversations(userID string) ([]models.Conversation, error) {
	var convs []models.Conversation
	err := s.db.Where("user1_id = ? OR user2_id = ?", userID, userID).
		Order("updated_at desc").
		Find(&convs).Error
	return convs, err
}

func (s *Store) ListMessages(convID string, limit int) ([]models.Message, error) {
	var msgs []models.Message
	err := s.db.Where("conversation_id = ?", convID).
		Order("created_at asc").
		Limit(limit).
		Find(&msgs).Error
	return msgs, err
}

func (s *Store) CreateMessage(convID, senderID, body string) (models.Message, error) {
	now := time.Now().UTC()
	msg := models.Message{
		ID:             NewID("msg"),
		ConversationID: convID,
		SenderID:       senderID,
		Body:           body,
		CreatedAt:      now,
	}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&msg).Error; err != nil {
			return err
		}
		return tx.Model(&models.Conversation{}).
			Where("id = ?", convID).
			Update("updated_at", now).Error
	})
	return msg, err
}

func (s *Store) UsersRelatedForChat(userA, userB string) (bool, error) {
	if userA == userB {
		return false, nil
	}
	var count int64
	err := s.db.Model(&models.DeliveryProposal{}).
		Joins("JOIN donations ON donations.id = delivery_proposals.donation_id").
		Where(
			"(donations.donor_id = ? AND (delivery_proposals.receiver_id = ? OR delivery_proposals.volunteer_id = ?)) OR "+
				"(donations.donor_id = ? AND (delivery_proposals.receiver_id = ? OR delivery_proposals.volunteer_id = ?)) OR "+
				"(delivery_proposals.receiver_id = ? AND delivery_proposals.volunteer_id = ?) OR "+
				"(delivery_proposals.receiver_id = ? AND delivery_proposals.volunteer_id = ?)",
			userA, userB, userB,
			userB, userA, userA,
			userA, userB,
			userB, userA,
		).
		Limit(1).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	if count > 0 {
		return true, nil
	}

	err = s.db.Model(&models.Pickup{}).
		Joins("JOIN donations ON donations.id = pickups.donation_id").
		Where(
			"(donations.donor_id = ? AND (pickups.receiver_id = ? OR pickups.volunteer_id = ?)) OR "+
				"(donations.donor_id = ? AND (pickups.receiver_id = ? OR pickups.volunteer_id = ?)) OR "+
				"(pickups.receiver_id = ? AND pickups.volunteer_id = ?) OR "+
				"(pickups.receiver_id = ? AND pickups.volunteer_id = ?)",
			userA, userB, userB,
			userB, userA, userA,
			userA, userB,
			userB, userA,
		).
		Limit(1).
		Count(&count).Error
	return count > 0, err
}

func normalizeConversationUsers(userA, userB string) (string, string) {
	if userA > userB {
		return userB, userA
	}
	return userA, userB
}
