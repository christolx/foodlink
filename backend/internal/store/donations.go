package store

import (
	"errors"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"

	"gorm.io/gorm"
)

func (s *Store) CreateDonation(donation models.Donation) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&donation).Error; err != nil {
			return err
		}
		return createNotification(tx, donation.DonorID, string(api.NotificationTypeDonationCreated), "Donation created", "Your donation is available for volunteer matching.", &donation.ID, nil, nil)
	})
}

func (s *Store) DonationByID(id string) (models.Donation, error) {
	var donation models.Donation
	err := s.db.First(&donation, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return donation, ErrNotFound
	}
	return donation, err
}

func (s *Store) DonationsByIDs(ids []string) ([]models.Donation, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var donations []models.Donation
	err := s.db.Where("id IN ?", ids).Find(&donations).Error
	return donations, err
}

func (s *Store) ListDonations(page, pageSize int, status *api.DonationStatus, user models.User) ([]models.Donation, int64, error) {
	var donations []models.Donation
	query := s.db.Model(&models.Donation{})
	if status != nil {
		query = query.Where("status = ?", string(*status))
	}
	switch user.Role {
	case string(api.Donor):
		query = query.Where("donor_id = ?", user.ID)
	case string(api.Volunteer):
		query = query.Where("status IN ?", []string{
			string(api.DonationStatusAvailable),
			string(api.DonationStatusProposalPending),
			string(api.DonationStatusPickupAssigned),
			string(api.DonationStatusPickedUp),
			string(api.DonationStatusDelivered),
		})
	default:
		query = query.Where("1 = 0")
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&donations).Error
	return donations, total, err
}
