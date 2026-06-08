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

func TestVolunteerProposalFlow(t *testing.T) {
	handler := newTestHandler(t)

	donorToken := login(t, handler, api.Donor)
	receiverToken := login(t, handler, api.Receiver)
	volunteerToken := login(t, handler, api.Volunteer)

	status, body := doJSON(t, handler, http.MethodGet, "/api/v1/me/profile", nil, receiverToken)
	if status != http.StatusOK {
		t.Fatalf("GET /me/profile status = %d body = %s", status, body)
	}
	var receiverProfile api.Profile
	decode(t, body, &receiverProfile)
	if receiverProfile.Role != api.Receiver {
		t.Fatalf("receiver profile role = %s", receiverProfile.Role)
	}

	location := testLocation()
	imageURL := "https://images.example.test/lunch-boxes.jpg"
	createBody := api.CreateDonationRequest{
		Title:          "Lunch boxes",
		Description:    "Fresh boxed meals",
		ImageUrl:       &imageURL,
		Quantity:       "12 boxed meals",
		PickupLocation: location,
		AvailableFrom:  time.Now().UTC(),
		AvailableUntil: time.Now().UTC().Add(2 * time.Hour),
	}
	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/donations", createBody, donorToken)
	if status != http.StatusCreated {
		t.Fatalf("create donation status = %d body = %s", status, body)
	}
	var donation api.Donation
	decode(t, body, &donation)
	if donation.Status != api.DonationStatusAvailable {
		t.Fatalf("donation status = %s", donation.Status)
	}
	if donation.ImageUrl == nil || *donation.ImageUrl != imageURL {
		t.Fatalf("donation imageUrl = %v, want %s", donation.ImageUrl, imageURL)
	}

	status, body = doJSON(t, handler, http.MethodGet, "/api/v1/donations/"+donation.Id, nil, donorToken)
	if status != http.StatusOK {
		t.Fatalf("get donation status = %d body = %s", status, body)
	}
	var fetchedDonation api.Donation
	decode(t, body, &fetchedDonation)
	if fetchedDonation.ImageUrl == nil || *fetchedDonation.ImageUrl != imageURL {
		t.Fatalf("fetched donation imageUrl = %v, want %s", fetchedDonation.ImageUrl, imageURL)
	}

	status, body = doJSON(t, handler, http.MethodGet, "/api/v1/donations", nil, donorToken)
	if status != http.StatusOK {
		t.Fatalf("list donations status = %d body = %s", status, body)
	}
	var listedDonations api.DonationListResponse
	decode(t, body, &listedDonations)
	if listedDonations.Total == 0 || listedDonations.Items[0].ImageUrl == nil || *listedDonations.Items[0].ImageUrl != imageURL {
		t.Fatalf("listed donation imageUrl missing from response")
	}

	status, body = doJSON(t, handler, http.MethodGet, "/api/v1/receivers", nil, volunteerToken)
	if status != http.StatusOK {
		t.Fatalf("list receivers status = %d body = %s", status, body)
	}
	var receivers api.ProfileListResponse
	decode(t, body, &receivers)
	if receivers.Total == 0 {
		t.Fatal("expected seeded receiver profile")
	}

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/delivery-proposals", api.CreateDeliveryProposalRequest{
		DonationId: donation.Id,
		ReceiverId: "user_receiver",
	}, volunteerToken)
	if status != http.StatusCreated {
		t.Fatalf("create proposal status = %d body = %s", status, body)
	}
	var proposal api.DeliveryProposal
	decode(t, body, &proposal)
	if proposal.Status != api.ProposalStatusPending {
		t.Fatalf("proposal status = %s", proposal.Status)
	}

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/delivery-proposals/"+proposal.Id+"/accept", nil, donorToken)
	if status != http.StatusOK {
		t.Fatalf("donor accept status = %d body = %s", status, body)
	}
	var donorAccepted api.DeliveryProposalAcceptResponse
	decode(t, body, &donorAccepted)
	if donorAccepted.Pickup != nil {
		t.Fatal("pickup created before receiver accepted")
	}

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/delivery-proposals/"+proposal.Id+"/accept", nil, receiverToken)
	if status != http.StatusOK {
		t.Fatalf("receiver accept status = %d body = %s", status, body)
	}
	var receiverAccepted api.DeliveryProposalAcceptResponse
	decode(t, body, &receiverAccepted)
	if receiverAccepted.Proposal.Status != api.ProposalStatusAccepted {
		t.Fatalf("proposal status after both accept = %s", receiverAccepted.Proposal.Status)
	}
	if receiverAccepted.Pickup == nil {
		t.Fatal("pickup missing after both accept")
	}
	if receiverAccepted.Pickup.Status != api.PickupStatusAssigned {
		t.Fatalf("pickup status = %s", receiverAccepted.Pickup.Status)
	}

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/pickups/"+receiverAccepted.Pickup.Id+"/pickup", api.UpdatePickupStatusRequest{}, volunteerToken)
	if status != http.StatusOK {
		t.Fatalf("mark picked up status = %d body = %s", status, body)
	}

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/pickups/"+receiverAccepted.Pickup.Id+"/deliver", api.UpdatePickupStatusRequest{}, volunteerToken)
	if status != http.StatusOK {
		t.Fatalf("mark delivered status = %d body = %s", status, body)
	}
	var delivered api.Pickup
	decode(t, body, &delivered)
	if delivered.Status != api.PickupStatusDelivered {
		t.Fatalf("delivered pickup status = %s", delivered.Status)
	}
}

func TestRoleGatesAndProposalRejection(t *testing.T) {
	handler := newTestHandler(t)
	donorToken := login(t, handler, api.Donor)
	receiverToken := login(t, handler, api.Receiver)
	volunteerToken := login(t, handler, api.Volunteer)

	status, _ := doJSON(t, handler, http.MethodPost, "/api/v1/donations", api.CreateDonationRequest{
		Title:          "Dinner boxes",
		Description:    "Fresh meals",
		Quantity:       "8 boxes",
		PickupLocation: testLocation(),
		AvailableFrom:  time.Now().UTC(),
		AvailableUntil: time.Now().UTC().Add(time.Hour),
	}, receiverToken)
	if status != http.StatusForbidden {
		t.Fatalf("receiver create donation status = %d, want %d", status, http.StatusForbidden)
	}

	status, body := doJSON(t, handler, http.MethodPost, "/api/v1/donations", api.CreateDonationRequest{
		Title:          "Dinner boxes",
		Description:    "Fresh meals",
		Quantity:       "8 boxes",
		PickupLocation: testLocation(),
		AvailableFrom:  time.Now().UTC(),
		AvailableUntil: time.Now().UTC().Add(time.Hour),
	}, donorToken)
	if status != http.StatusCreated {
		t.Fatalf("create donation status = %d body = %s", status, body)
	}
	var donation api.Donation
	decode(t, body, &donation)

	status, _ = doJSON(t, handler, http.MethodGet, "/api/v1/receivers", nil, donorToken)
	if status != http.StatusForbidden {
		t.Fatalf("donor list receivers status = %d, want %d", status, http.StatusForbidden)
	}

	status, _ = doJSON(t, handler, http.MethodPost, "/api/v1/delivery-proposals", api.CreateDeliveryProposalRequest{
		DonationId: donation.Id,
		ReceiverId: "user_receiver",
	}, donorToken)
	if status != http.StatusForbidden {
		t.Fatalf("donor create proposal status = %d, want %d", status, http.StatusForbidden)
	}

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/delivery-proposals", api.CreateDeliveryProposalRequest{
		DonationId: donation.Id,
		ReceiverId: "user_receiver",
	}, volunteerToken)
	if status != http.StatusCreated {
		t.Fatalf("create proposal status = %d body = %s", status, body)
	}
	var proposal api.DeliveryProposal
	decode(t, body, &proposal)

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/delivery-proposals/"+proposal.Id+"/reject", nil, receiverToken)
	if status != http.StatusOK {
		t.Fatalf("receiver reject status = %d body = %s", status, body)
	}
	var rejected api.DeliveryProposal
	decode(t, body, &rejected)
	if rejected.Status != api.ProposalStatusRejected {
		t.Fatalf("proposal status = %s", rejected.Status)
	}

	status, body = doJSON(t, handler, http.MethodPost, "/api/v1/delivery-proposals", api.CreateDeliveryProposalRequest{
		DonationId: donation.Id,
		ReceiverId: "user_receiver",
	}, volunteerToken)
	if status != http.StatusCreated {
		t.Fatalf("create proposal after rejection status = %d body = %s", status, body)
	}
}

func TestCreateDonationRejectsInvalidImageURL(t *testing.T) {
	handler := newTestHandler(t)
	donorToken := login(t, handler, api.Donor)
	imageURL := "javascript:alert(1)"

	status, body := doJSON(t, handler, http.MethodPost, "/api/v1/donations", api.CreateDonationRequest{
		Title:          "Dinner boxes",
		Description:    "Fresh meals",
		ImageUrl:       &imageURL,
		Quantity:       "8 boxes",
		PickupLocation: testLocation(),
		AvailableFrom:  time.Now().UTC(),
		AvailableUntil: time.Now().UTC().Add(time.Hour),
	}, donorToken)
	if status != http.StatusBadRequest {
		t.Fatalf("create donation with invalid imageUrl status = %d body = %s", status, body)
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

func testLocation() api.Location {
	return api.Location{
		AddressLine1: "Jl. Sudirman 1",
		City:         "Jakarta",
		Region:       "DKI Jakarta",
		PostalCode:   "10220",
		Country:      "ID",
	}
}
