package server_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/server"
	"foodlink-be/internal/store"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestAuthAndDonationFlow(t *testing.T) {
	handler := newTestHandler(t)

	donorToken := login(t, handler, api.Donor)
	receiverToken := login(t, handler, api.Receiver)

	meStatus, _ := doJSON(t, handler, http.MethodGet, "/api/v1/me", nil, "")
	if meStatus != http.StatusUnauthorized {
		t.Fatalf("GET /me without token status = %d, want %d", meStatus, http.StatusUnauthorized)
	}

	location := api.Location{
		AddressLine1: "Jl. Sudirman 1",
		City:         "Jakarta",
		Region:       "DKI Jakarta",
		PostalCode:   "10220",
		Country:      "ID",
	}
	createBody := api.CreateDonationRequest{
		Title:          "Lunch boxes",
		Description:    "Fresh boxed meals",
		Quantity:       "12 boxed meals",
		PickupLocation: location,
		AvailableFrom:  time.Now().UTC(),
		AvailableUntil: time.Now().UTC().Add(2 * time.Hour),
	}
	status, body := doJSON(t, handler, http.MethodPost, "/api/v1/donations", createBody, donorToken)
	if status != http.StatusCreated {
		t.Fatalf("create donation status = %d body = %s", status, body)
	}
	var donation api.Donation
	decode(t, body, &donation)
	if donation.Status != api.DonationStatusAvailable {
		t.Fatalf("donation status = %s", donation.Status)
	}

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/donations/"+donation.Id+"/claim", api.ClaimDonationRequest{Note: ptr("Can pick up soon")}, receiverToken)
	if status != http.StatusCreated {
		t.Fatalf("claim donation status = %d body = %s", status, body)
	}
	var claim api.Claim
	decode(t, body, &claim)
	if claim.Status != api.ClaimStatusPending {
		t.Fatalf("claim status = %s", claim.Status)
	}

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/claims/"+claim.Id+"/approve", api.ApproveClaimRequest{DeliveryLocation: location}, donorToken)
	if status != http.StatusOK {
		t.Fatalf("approve claim status = %d body = %s", status, body)
	}
	var approved api.ApproveClaimResponse
	decode(t, body, &approved)
	if approved.Pickup.Status != api.PendingAssignment {
		t.Fatalf("pickup status = %s", approved.Pickup.Status)
	}

	assign := api.AssignVolunteerRequest{VolunteerId: "user_volunteer"}
	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/pickups/"+approved.Pickup.Id+"/assign-volunteer", assign, donorToken)
	if status != http.StatusOK {
		t.Fatalf("assign volunteer status = %d body = %s", status, body)
	}

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/pickups/"+approved.Pickup.Id+"/pickup", api.UpdatePickupStatusRequest{}, donorToken)
	if status != http.StatusOK {
		t.Fatalf("mark picked up status = %d body = %s", status, body)
	}

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/pickups/"+approved.Pickup.Id+"/deliver", api.UpdatePickupStatusRequest{}, donorToken)
	if status != http.StatusOK {
		t.Fatalf("mark delivered status = %d body = %s", status, body)
	}
	var delivered api.Pickup
	decode(t, body, &delivered)
	if delivered.Status != api.Delivered {
		t.Fatalf("delivered pickup status = %s", delivered.Status)
	}
}

func TestClaimUnavailableDonationReturnsConflict(t *testing.T) {
	handler := newTestHandler(t)
	donorToken := login(t, handler, api.Donor)
	receiverToken := login(t, handler, api.Receiver)

	location := api.Location{
		AddressLine1: "Jl. Sudirman 1",
		City:         "Jakarta",
		Region:       "DKI Jakarta",
		PostalCode:   "10220",
		Country:      "ID",
	}
	status, body := doJSON(t, handler, http.MethodPost, "/api/v1/donations", api.CreateDonationRequest{
		Title:          "Dinner boxes",
		Description:    "Fresh meals",
		Quantity:       "8 boxes",
		PickupLocation: location,
		AvailableFrom:  time.Now().UTC(),
		AvailableUntil: time.Now().UTC().Add(time.Hour),
	}, donorToken)
	if status != http.StatusCreated {
		t.Fatalf("create donation status = %d body = %s", status, body)
	}
	var donation api.Donation
	decode(t, body, &donation)

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/donations/"+donation.Id+"/claim", api.ClaimDonationRequest{}, receiverToken)
	if status != http.StatusCreated {
		t.Fatalf("first claim status = %d body = %s", status, body)
	}

	status, _ = doJSON(t, handler, http.MethodPost, "/api/v1/donations/"+donation.Id+"/claim", api.ClaimDonationRequest{}, receiverToken)
	if status != http.StatusConflict {
		t.Fatalf("second claim status = %d, want %d", status, http.StatusConflict)
	}
}

func newTestHandler(t *testing.T) http.Handler {
	t.Helper()
	conn, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	st := store.New(conn)
	if err := st.AutoMigrate(); err != nil {
		t.Fatal(err)
	}
	if err := st.SeedDemoData(); err != nil {
		t.Fatal(err)
	}
	return server.Handler(st, "test-secret")
}

func login(t *testing.T, handler http.Handler, role api.UserRole) string {
	t.Helper()
	status, body := doJSON(t, handler, http.MethodPost, "/api/v1/auth/demo-login", api.DemoLoginRequest{Role: &role}, "")
	if status != http.StatusOK {
		t.Fatalf("login status = %d body = %s", status, body)
	}
	var response api.DemoLoginResponse
	decode(t, body, &response)
	return response.AccessToken
}

func doJSON(t *testing.T, handler http.Handler, method string, path string, payload any, token string) (int, []byte) {
	t.Helper()
	var body bytes.Buffer
	if payload != nil {
		if err := json.NewEncoder(&body).Encode(payload); err != nil {
			t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, &body)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	return res.Code, res.Body.Bytes()
}

func decode(t *testing.T, body []byte, value any) {
	t.Helper()
	if err := json.Unmarshal(body, value); err != nil {
		t.Fatalf("decode body %s: %v", body, err)
	}
}

func ptr(value string) *string {
	return &value
}
