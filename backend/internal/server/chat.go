package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"foodlink-be/internal/models"
	"foodlink-be/internal/store"
)

// messageHub broadcasts new messages to SSE subscribers per conversation.
type messageHub struct {
	mu   sync.RWMutex
	subs map[string]map[string]chan models.Message // convID -> subID -> ch
}

func newMessageHub() *messageHub {
	return &messageHub{subs: make(map[string]map[string]chan models.Message)}
}

func (h *messageHub) subscribe(convID string) (<-chan models.Message, func()) {
	subID := store.NewID("sub")
	ch := make(chan models.Message, 32)
	h.mu.Lock()
	if h.subs[convID] == nil {
		h.subs[convID] = make(map[string]chan models.Message)
	}
	h.subs[convID][subID] = ch
	h.mu.Unlock()
	return ch, func() {
		h.mu.Lock()
		delete(h.subs[convID], subID)
		if len(h.subs[convID]) == 0 {
			delete(h.subs, convID)
		}
		h.mu.Unlock()
	}
}

func (h *messageHub) publish(convID string, msg models.Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, ch := range h.subs[convID] {
		select {
		case ch <- msg:
		default:
		}
	}
}

// chatHandler wires up the chat HTTP endpoints.
type chatHandler struct {
	st        *store.Store
	hub       *messageHub
	jwtSecret []byte
}

type convResponse struct {
	ID        string      `json:"id"`
	OtherUser userSummary `json:"otherUser"`
	CreatedAt time.Time   `json:"createdAt"`
	UpdatedAt time.Time   `json:"updatedAt"`
}

type userSummary struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

type msgResponse struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversationId"`
	SenderID       string    `json:"senderId"`
	Body           string    `json:"body"`
	CreatedAt      time.Time `json:"createdAt"`
}

func (h *chatHandler) auth(r *http.Request) (string, bool) {
	// Accept token from Authorization header or ?token= query param (needed for EventSource).
	bearer := r.Header.Get("Authorization")
	if bearer == "" {
		if t := r.URL.Query().Get("token"); t != "" {
			bearer = "Bearer " + t
		}
	}
	userID, err := parseBearer(bearer, h.jwtSecret)
	return userID, err == nil
}

func (h *chatHandler) json(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (h *chatHandler) buildConv(conv models.Conversation, myID string) convResponse {
	otherID := conv.User2ID
	if otherID == myID {
		otherID = conv.User1ID
	}
	displayName, role := otherID, "unknown"
	if p, err := h.st.ProfileByUserID(otherID); err == nil {
		displayName = p.DisplayName
		role = p.Role
	}
	return convResponse{
		ID:        conv.ID,
		OtherUser: userSummary{ID: otherID, DisplayName: displayName, Role: role},
		CreatedAt: conv.CreatedAt,
		UpdatedAt: conv.UpdatedAt,
	}
}

func toMsgResponse(m models.Message) msgResponse {
	return msgResponse{
		ID:             m.ID,
		ConversationID: m.ConversationID,
		SenderID:       m.SenderID,
		Body:           m.Body,
		CreatedAt:      m.CreatedAt,
	}
}

// POST /api/v1/chat/conversations  {"otherUserId":"…"}
func (h *chatHandler) handleGetOrCreate(w http.ResponseWriter, r *http.Request) {
	myID, ok := h.auth(r)
	if !ok {
		h.json(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body struct {
		OtherUserID string `json:"otherUserId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.OtherUserID == "" {
		h.json(w, http.StatusBadRequest, map[string]string{"error": "otherUserId required"})
		return
	}
	conv, err := h.st.GetOrCreateConversation(myID, body.OtherUserID)
	if err != nil {
		h.json(w, http.StatusInternalServerError, map[string]string{"error": "server error"})
		return
	}
	h.json(w, http.StatusOK, h.buildConv(conv, myID))
}

// GET /api/v1/chat/conversations
func (h *chatHandler) handleList(w http.ResponseWriter, r *http.Request) {
	myID, ok := h.auth(r)
	if !ok {
		h.json(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	convs, err := h.st.ListConversations(myID)
	if err != nil {
		h.json(w, http.StatusInternalServerError, map[string]string{"error": "server error"})
		return
	}
	out := make([]convResponse, 0, len(convs))
	for _, c := range convs {
		out = append(out, h.buildConv(c, myID))
	}
	h.json(w, http.StatusOK, out)
}

// GET /api/v1/chat/conversations/{id}/messages
func (h *chatHandler) handleMessages(w http.ResponseWriter, r *http.Request) {
	myID, ok := h.auth(r)
	if !ok {
		h.json(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	convID := r.PathValue("id")
	conv, err := h.st.ConversationByID(convID)
	if err != nil {
		h.json(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	if conv.User1ID != myID && conv.User2ID != myID {
		h.json(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	msgs, err := h.st.ListMessages(convID, 200)
	if err != nil {
		h.json(w, http.StatusInternalServerError, map[string]string{"error": "server error"})
		return
	}
	out := make([]msgResponse, 0, len(msgs))
	for _, m := range msgs {
		out = append(out, toMsgResponse(m))
	}
	h.json(w, http.StatusOK, out)
}

// POST /api/v1/chat/conversations/{id}/messages  {"body":"…"}
func (h *chatHandler) handleSend(w http.ResponseWriter, r *http.Request) {
	myID, ok := h.auth(r)
	if !ok {
		h.json(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	convID := r.PathValue("id")
	conv, err := h.st.ConversationByID(convID)
	if err != nil {
		h.json(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	if conv.User1ID != myID && conv.User2ID != myID {
		h.json(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	var body struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Body) == "" {
		h.json(w, http.StatusBadRequest, map[string]string{"error": "body required"})
		return
	}
	msg, err := h.st.CreateMessage(convID, myID, strings.TrimSpace(body.Body))
	if err != nil {
		h.json(w, http.StatusInternalServerError, map[string]string{"error": "server error"})
		return
	}
	h.hub.publish(convID, msg)
	h.json(w, http.StatusCreated, toMsgResponse(msg))
}

// GET /api/v1/chat/conversations/{id}/events  (SSE)
func (h *chatHandler) handleStream(w http.ResponseWriter, r *http.Request) {
	myID, ok := h.auth(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	convID := r.PathValue("id")
	conv, err := h.st.ConversationByID(convID)
	if err != nil || (conv.User1ID != myID && conv.User2ID != myID) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	msgCh, unsub := h.hub.subscribe(convID)
	defer unsub()

	fmt.Fprintf(w, ": connected\n\n")
	flusher.Flush()

	for {
		select {
		case <-r.Context().Done():
			return
		case msg := <-msgCh:
			data, _ := json.Marshal(toMsgResponse(msg))
			fmt.Fprintf(w, "event: message\ndata: %s\n\n", data)
			flusher.Flush()
		}
	}
}
