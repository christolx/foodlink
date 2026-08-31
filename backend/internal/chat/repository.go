package chat

import "foodlink-be/internal/models"

type Repository interface {
	GetOrCreateConversation(string, string) (models.Conversation, error)
	ConversationByID(string) (models.Conversation, error)
	ListConversations(string) ([]models.Conversation, error)
	ListMessages(string, int) ([]models.Message, error)
	CreateMessage(string, string, string) (models.Message, error)
	ProfileByUserID(string) (models.Profile, error)
	ProfilesByUserIDs([]string) ([]models.Profile, error)
}
