// Package donations owns donation use cases and their persistence boundary.
package donations

import (
	"errors"
	"net/url"
	"strings"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"
)

var ErrInvalidInput = errors.New("invalid donation input")

type Service struct {
	repository Repository
	now        func() time.Time
	newID      func(string) string
}

func New(repository Repository) *Service {
	return &Service{
		repository: repository,
		now:        func() time.Time { return time.Now().UTC() },
		newID:      store.NewID,
	}
}

type CreateInput struct {
	DonorID             string
	Title               string
	Description         string
	Quantity            string
	ImageURL            string
	PickupLocation      models.LocationFields
	AvailableFrom       time.Time
	AvailableUntil      time.Time
	SpecialInstructions *string
}

func (s *Service) List(page, pageSize int, status *api.DonationStatus, user models.User) ([]models.Donation, int64, error) {
	return s.repository.ListDonations(page, pageSize, status, user)
}

func (s *Service) Get(id string) (models.Donation, error) {
	return s.repository.DonationByID(id)
}

func (s *Service) Create(input CreateInput) (models.Donation, error) {
	if strings.TrimSpace(input.Title) == "" || strings.TrimSpace(input.Quantity) == "" {
		return models.Donation{}, inputError("title and quantity are required")
	}
	if !input.AvailableUntil.After(input.AvailableFrom) {
		return models.Donation{}, inputError("availableUntil must be after availableFrom")
	}
	imageURL, err := cloudinaryImageURL(input.ImageURL)
	if err != nil {
		return models.Donation{}, err
	}

	now := s.now()
	donation := models.Donation{
		ID:                  s.newID("donation"),
		DonorID:             input.DonorID,
		Title:               input.Title,
		Description:         input.Description,
		Quantity:            input.Quantity,
		ImageURL:            &imageURL,
		Status:              string(api.DonationStatusAvailable),
		PickupLocation:      input.PickupLocation,
		AvailableFrom:       input.AvailableFrom,
		AvailableUntil:      input.AvailableUntil,
		SpecialInstructions: input.SpecialInstructions,
		CreatedAt:           now,
		UpdatedAt:           now,
	}
	if err := s.repository.CreateDonation(donation); err != nil {
		return models.Donation{}, err
	}
	return donation, nil
}

func inputError(message string) error {
	return validationError{message: message}
}

type validationError struct{ message string }

func (e validationError) Error() string { return e.message }
func (e validationError) Unwrap() error { return ErrInvalidInput }

func cloudinaryImageURL(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", inputError("imageUrl is required")
	}
	if len(trimmed) > 2048 {
		return "", inputError("imageUrl must be 2048 characters or fewer")
	}
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Host != "res.cloudinary.com" || parsed.Scheme != "https" {
		return "", inputError("imageUrl must be a Cloudinary HTTPS URL")
	}
	return trimmed, nil
}
