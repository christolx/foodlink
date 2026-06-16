package store

import (
	"time"

	"foodlink-be/internal/models"

	"gorm.io/gorm"
)

func (s *Store) GetOrCreateConversation(userA, userB string) (models.Conversation, error) {
	// Normalise order so (A,B) and (B,A) resolve to the same row.
	u1, u2 := userA, userB
	if u1 > u2 {
		u1, u2 = u2, u1
	}
	var conv models.Conversation
	err := s.db.Where("user1_id = ? AND user2_id = ?", u1, u2).First(&conv).Error
	if err == nil {
		return conv, nil
	}
	if err != gorm.ErrRecordNotFound {
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
	return conv, s.db.First(&conv, "id = ?", id).Error
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
