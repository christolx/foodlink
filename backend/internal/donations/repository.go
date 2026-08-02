package donations

import (
	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
)

// Repository is implemented by the persistence adapter. The module owns this
// contract so its use cases do not depend on GORM.
type Repository interface {
	CreateDonation(models.Donation) error
	DonationByID(string) (models.Donation, error)
	ListDonations(int, int, *api.DonationStatus, models.User) ([]models.Donation, int64, error)
}
