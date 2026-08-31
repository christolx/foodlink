package chat

import (
	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
)

func conversationDTO(conv models.Conversation, myID string, profiles map[string]models.Profile) api.Conversation {
	otherID := conv.User2ID
	if otherID == myID {
		otherID = conv.User1ID
	}
	displayName, role := otherID, "unknown"
	if profile, ok := profiles[otherID]; ok {
		displayName, role = profile.DisplayName, profile.Role
	}
	return api.Conversation{Id: conv.ID, OtherUser: api.ChatUserSummary{Id: otherID, DisplayName: displayName, Role: role}, CreatedAt: conv.CreatedAt, UpdatedAt: conv.UpdatedAt}
}
func messageDTO(message models.Message) api.ChatMessage {
	return api.ChatMessage{Id: message.ID, ConversationId: message.ConversationID, SenderId: message.SenderID, Body: message.Body, CreatedAt: message.CreatedAt}
}
