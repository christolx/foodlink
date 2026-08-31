// Package chat owns conversation use cases, persistence boundary, and in-process stream fan-out.
package chat

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"foodlink-be/internal/models"
)

type Service struct {
	repository Repository
	hub        *hub
}

func New(repository Repository) *Service { return &Service{repository: repository, hub: newHub()} }
func (s *Service) ListConversations(userID string) ([]models.Conversation, error) {
	return s.repository.ListConversations(userID)
}
func (s *Service) GetOrCreate(userID, otherUserID string) (models.Conversation, error) {
	return s.repository.GetOrCreateConversation(userID, otherUserID)
}
func (s *Service) Conversation(id string) (models.Conversation, error) {
	return s.repository.ConversationByID(id)
}
func (s *Service) Messages(conversationID string) ([]models.Message, error) {
	return s.repository.ListMessages(conversationID, 200)
}
func (s *Service) Send(conversationID, senderID, body string) (models.Message, error) {
	message, err := s.repository.CreateMessage(conversationID, senderID, body)
	if err == nil {
		s.hub.publish(conversationID, message)
	}
	return message, err
}
func (s *Service) Profile(userID string) (models.Profile, error) {
	return s.repository.ProfileByUserID(userID)
}
func (s *Service) Profiles(userIDs []string) ([]models.Profile, error) {
	return s.repository.ProfilesByUserIDs(userIDs)
}
func (s *Service) Subscribe(conversationID string) (<-chan models.Message, func()) {
	return s.hub.subscribe(conversationID)
}

type hub struct {
	mu   sync.RWMutex
	subs map[string]map[string]chan models.Message
}

func newHub() *hub { return &hub{subs: make(map[string]map[string]chan models.Message)} }
func (h *hub) subscribe(conversationID string) (<-chan models.Message, func()) {
	id := newID("sub")
	ch := make(chan models.Message, 32)
	h.mu.Lock()
	if h.subs[conversationID] == nil {
		h.subs[conversationID] = make(map[string]chan models.Message)
	}
	h.subs[conversationID][id] = ch
	h.mu.Unlock()
	return ch, func() {
		h.mu.Lock()
		delete(h.subs[conversationID], id)
		if len(h.subs[conversationID]) == 0 {
			delete(h.subs, conversationID)
		}
		h.mu.Unlock()
	}
}
func (h *hub) publish(conversationID string, message models.Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, ch := range h.subs[conversationID] {
		select {
		case ch <- message:
		default:
		}
	}
}
func newID(prefix string) string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return prefix + "_" + time.Now().UTC().Format("20060102150405")
	}
	return prefix + "_" + hex.EncodeToString(b[:])
}
