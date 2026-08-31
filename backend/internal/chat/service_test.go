package chat

import (
	"testing"
	"time"

	"foodlink-be/internal/models"
)

func TestServiceSendPublishesMessage(t *testing.T) {
	repository := &fakeRepository{}
	service := New(repository)
	messages, unsubscribe := service.Subscribe("conversation_1")
	defer unsubscribe()

	message, err := service.Send("conversation_1", "user_1", "hello")
	if err != nil {
		t.Fatalf("Send() error = %v", err)
	}
	if message.Body != "hello" {
		t.Fatalf("Send() body = %q, want hello", message.Body)
	}
	select {
	case received := <-messages:
		if received.ID != message.ID {
			t.Fatalf("received message ID = %q, want %q", received.ID, message.ID)
		}
	case <-time.After(time.Second):
		t.Fatal("Send() did not publish message")
	}
}

type fakeRepository struct{}

func (fakeRepository) GetOrCreateConversation(string, string) (models.Conversation, error) {
	return models.Conversation{}, nil
}
func (fakeRepository) ConversationByID(string) (models.Conversation, error) {
	return models.Conversation{}, nil
}
func (fakeRepository) ListConversations(string) ([]models.Conversation, error) { return nil, nil }
func (fakeRepository) ListMessages(string, int) ([]models.Message, error)      { return nil, nil }
func (fakeRepository) CreateMessage(conversationID, senderID, body string) (models.Message, error) {
	return models.Message{ID: "message_1", ConversationID: conversationID, SenderID: senderID, Body: body}, nil
}
func (fakeRepository) ProfileByUserID(string) (models.Profile, error)       { return models.Profile{}, nil }
func (fakeRepository) ProfilesByUserIDs([]string) ([]models.Profile, error) { return nil, nil }
