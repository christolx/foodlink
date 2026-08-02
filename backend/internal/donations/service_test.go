package donations

import (
	"errors"
	"testing"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
)

type fakeRepository struct {
	created models.Donation
}

func (r *fakeRepository) CreateDonation(donation models.Donation) error {
	r.created = donation
	return nil
}

func (r *fakeRepository) DonationByID(string) (models.Donation, error) { return models.Donation{}, nil }
func (r *fakeRepository) ListDonations(int, int, *api.DonationStatus, models.User) ([]models.Donation, int64, error) {
	return nil, 0, nil
}

func TestCreateBuildsAvailableDonation(t *testing.T) {
	repository := &fakeRepository{}
	service := New(repository)
	service.now = func() time.Time { return time.Date(2026, 8, 3, 0, 0, 0, 0, time.UTC) }
	service.newID = func(prefix string) string { return prefix + "_test" }

	donation, err := service.Create(CreateInput{
		DonorID:        "donor_1",
		Title:          "Rice",
		Quantity:       "10 boxes",
		ImageURL:       "https://res.cloudinary.com/demo/image/upload/rice.jpg",
		AvailableFrom:  time.Date(2026, 8, 3, 9, 0, 0, 0, time.UTC),
		AvailableUntil: time.Date(2026, 8, 3, 10, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if donation.ID != "donation_test" || donation.Status != string(api.DonationStatusAvailable) {
		t.Fatalf("unexpected donation: %#v", donation)
	}
	if repository.created.ID != donation.ID {
		t.Fatal("repository did not receive donation")
	}
}

func TestCreateRejectsNonCloudinaryImage(t *testing.T) {
	service := New(&fakeRepository{})
	_, err := service.Create(CreateInput{
		Title: "Rice", Quantity: "10 boxes", ImageURL: "https://example.com/rice.jpg",
		AvailableFrom: time.Now(), AvailableUntil: time.Now().Add(time.Hour),
	})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("Create() error = %v, want invalid input", err)
	}
}
