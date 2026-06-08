package store

import (
	"testing"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestCleanupSmokeData(t *testing.T) {
	st := newTestStore(t)
	now := time.Now().UTC()
	smokeDonation := models.Donation{
		ID:             "donation_smoke",
		DonorID:        "user_donor",
		Title:          "[SMOKE_TEST] Donation",
		Description:    "Smoke donation",
		Quantity:       "1 box",
		Status:         string(api.DonationStatusDelivered),
		PickupLocation: testLocation(),
		AvailableFrom:  now,
		AvailableUntil: now.Add(time.Hour),
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	regularDonation := models.Donation{
		ID:             "donation_regular",
		DonorID:        "user_donor",
		Title:          "Regular Donation",
		Description:    "Regular donation",
		Quantity:       "1 box",
		Status:         string(api.DonationStatusAvailable),
		PickupLocation: testLocation(),
		AvailableFrom:  now,
		AvailableUntil: now.Add(time.Hour),
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	legacySmokeDonation := models.Donation{
		ID:             "donation_legacy_smoke",
		DonorID:        "user_donor",
		Title:          "Smoke duplicate transition",
		Description:    "Legacy smoke donation",
		Quantity:       "1 box",
		Status:         string(api.DonationStatusDelivered),
		PickupLocation: testLocation(),
		AvailableFrom:  now,
		AvailableUntil: now.Add(time.Hour),
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := st.db.Create(&smokeDonation).Error; err != nil {
		t.Fatal(err)
	}
	if err := st.db.Create(&legacySmokeDonation).Error; err != nil {
		t.Fatal(err)
	}
	if err := st.db.Create(&regularDonation).Error; err != nil {
		t.Fatal(err)
	}
	if err := st.db.Create(&models.DeliveryProposal{
		ID:          "proposal_smoke",
		DonationID:  smokeDonation.ID,
		ReceiverID:  "user_receiver",
		VolunteerID: "user_volunteer",
		Status:      string(api.ProposalStatusAccepted),
		CreatedAt:   now,
		UpdatedAt:   now,
	}).Error; err != nil {
		t.Fatal(err)
	}
	if err := st.db.Create(&models.Pickup{
		ID:               "pickup_smoke",
		DonationID:       smokeDonation.ID,
		ProposalID:       "proposal_smoke",
		ReceiverID:       "user_receiver",
		VolunteerID:      "user_volunteer",
		Status:           string(api.PickupStatusDelivered),
		PickupLocation:   testLocation(),
		DeliveryLocation: testLocation(),
		CreatedAt:        now,
		UpdatedAt:        now,
	}).Error; err != nil {
		t.Fatal(err)
	}
	if err := st.db.Create(&models.Notification{
		ID:         "notification_smoke",
		UserID:     "user_donor",
		Type:       string(api.NotificationTypePickupCompleted),
		Title:      "Smoke",
		Body:       "Smoke",
		DonationID: &smokeDonation.ID,
		CreatedAt:  now,
	}).Error; err != nil {
		t.Fatal(err)
	}

	if err := st.CleanupSmokeData(); err != nil {
		t.Fatal(err)
	}

	assertCount(t, st.db, &models.Donation{}, "id = ?", smokeDonation.ID, 0)
	assertCount(t, st.db, &models.DeliveryProposal{}, "donation_id = ?", smokeDonation.ID, 0)
	assertCount(t, st.db, &models.Pickup{}, "donation_id = ?", smokeDonation.ID, 0)
	assertCount(t, st.db, &models.Notification{}, "donation_id = ?", smokeDonation.ID, 0)
	assertCount(t, st.db, &models.Donation{}, "id = ?", legacySmokeDonation.ID, 0)
	assertCount(t, st.db, &models.Donation{}, "id = ?", regularDonation.ID, 1)
}

func TestSeedDemoDataCreatesDashboardFixtures(t *testing.T) {
	st := newTestStore(t)

	if err := st.SeedDemoData(); err != nil {
		t.Fatal(err)
	}

	assertCount(t, st.db, &models.Donation{}, "id LIKE ?", "demo_donation_%", 5)
	assertCount(t, st.db, &models.DeliveryProposal{}, "id LIKE ?", "demo_proposal_%", 4)
	assertCount(t, st.db, &models.Pickup{}, "id LIKE ?", "demo_pickup_%", 2)
	assertCount(t, st.db, &models.Notification{}, "id LIKE ?", "demo_notif_%", 11)

	var donor models.User
	if err := st.db.First(&donor, "id = ?", "user_donor").Error; err != nil {
		t.Fatal(err)
	}

	_, total, err := st.ListDonations(1, 20, nil, donor)
	if err != nil {
		t.Fatal(err)
	}
	if total < 5 {
		t.Fatalf("donor donation total = %d, want at least 5", total)
	}
	var freshVegetables models.Donation
	if err := st.db.First(&freshVegetables, "id = ?", "demo_donation_fresh_vegetables").Error; err != nil {
		t.Fatal(err)
	}
	if freshVegetables.ImageURL == nil || *freshVegetables.ImageURL == "" {
		t.Fatal("fresh vegetables seed missing image URL")
	}

	proposals, total, err := st.ListDeliveryProposals(1, 20, nil, donor)
	if err != nil {
		t.Fatal(err)
	}
	if total < 4 || len(proposals) == 0 {
		t.Fatalf("donor proposal total = %d len = %d, want seeded proposals", total, len(proposals))
	}

	notifications, total, err := st.ListNotifications(donor.ID, 1, 20)
	if err != nil {
		t.Fatal(err)
	}
	if total < 6 || len(notifications) == 0 {
		t.Fatalf("donor notification total = %d len = %d, want seeded notifications", total, len(notifications))
	}
}

func TestNukeDatabase(t *testing.T) {
	st := newTestStore(t)

	// Verify tables exist
	assertCount(t, st.db, &models.User{}, "1 = 1", nil, 3)

	if err := st.NukeDatabase(); err != nil {
		t.Fatal(err)
	}

	// Verify tables are dropped (querying should error)
	if err := st.db.Model(&models.User{}).Find(&[]models.User{}).Error; err == nil {
		t.Fatal("expected error querying dropped table 'users', but got nil")
	}

	// Verify rerun migrate and seed works
	if err := st.AutoMigrate(); err != nil {
		t.Fatal(err)
	}
	if err := st.SeedDemoData(); err != nil {
		t.Fatal(err)
	}

	// Verify data is back
	assertCount(t, st.db, &models.User{}, "1 = 1", nil, 3)
}

func newTestStore(t *testing.T) *Store {
	t.Helper()
	conn, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	st := New(conn)
	if err := st.AutoMigrate(); err != nil {
		t.Fatal(err)
	}
	if err := st.SeedDemoData(); err != nil {
		t.Fatal(err)
	}
	return st
}

func testLocation() models.LocationFields {
	return models.LocationFields{
		AddressLine1: "Jl. Test 1",
		City:         "Jakarta",
		Region:       "DKI Jakarta",
		PostalCode:   "10220",
		Country:      "ID",
	}
}

func assertCount(t *testing.T, db *gorm.DB, model any, query string, value any, want int64) {
	t.Helper()
	var got int64
	if err := db.Model(model).Where(query, value).Count(&got).Error; err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("count for %T = %d, want %d", model, got, want)
	}
}
