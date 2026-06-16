package store

import (
	"errors"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"

	"gorm.io/gorm"
)

func (s *Store) ListPickups(page, pageSize int, status *api.PickupStatus, user models.User) ([]models.Pickup, int64, error) {
	var pickups []models.Pickup
	query := s.db.Model(&models.Pickup{})
	if status != nil {
		query = query.Where("status = ?", string(*status))
	}
	switch user.Role {
	case string(api.Donor):
		query = query.Joins("JOIN donations ON donations.id = pickups.donation_id").Where("donations.donor_id = ?", user.ID)
	case string(api.Receiver):
		query = query.Where("receiver_id = ?", user.ID)
	case string(api.Volunteer):
		query = query.Where("volunteer_id = ?", user.ID)
	default:
		query = query.Where("1 = 0")
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("pickups.created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&pickups).Error
	return pickups, total, err
}

func (s *Store) MarkPickedUp(pickupID, volunteerID string, occurredAt time.Time) (models.Pickup, error) {
	return s.markPickup(pickupID, volunteerID, string(api.PickupStatusAssigned), string(api.PickupStatusPickedUp), string(api.DonationStatusPickedUp), "picked_up_at", occurredAt)
}

func (s *Store) MarkDelivered(pickupID, userID, userRole string, occurredAt time.Time) (models.Pickup, error) {
	var pickup models.Pickup
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&pickup, "id = ?", pickupID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if userRole == string(api.Volunteer) {
			if pickup.VolunteerID != userID {
				return ErrForbidden("not_assigned_volunteer")
			}
		} else if userRole == string(api.Receiver) {
			if pickup.ReceiverID != userID {
				return ErrForbidden("not_assigned_receiver")
			}
		} else {
			return ErrForbidden("invalid_role")
		}
		if pickup.Status != string(api.PickupStatusPickedUp) {
			return ErrConflict("invalid_pickup_state")
		}
		now := time.Now().UTC()
		updates := map[string]any{
			"status":       string(api.PickupStatusDelivered),
			"updated_at":   now,
			"delivered_at": occurredAt,
		}
		if err := tx.Model(&pickup).Updates(updates).Error; err != nil {
			return err
		}
		pickup.Status = string(api.PickupStatusDelivered)
		pickup.UpdatedAt = now
		pickup.DeliveredAt = &occurredAt
		if err := tx.Model(&models.Donation{}).Where("id = ?", pickup.DonationID).Updates(map[string]any{
			"status":     string(api.DonationStatusDelivered),
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
		if userRole == string(api.Volunteer) {
			return createNotification(tx, pickup.ReceiverID, string(api.NotificationTypePickupCompleted), "Pickup completed", "Your delivery was completed.", &pickup.DonationID, &pickup.ProposalID, &pickup.ID)
		}
		return createNotification(tx, pickup.VolunteerID, string(api.NotificationTypePickupCompleted), "Pickup completed", "The receiver confirmed your delivery.", &pickup.DonationID, &pickup.ProposalID, &pickup.ID)
	})
	return pickup, err
}

func (s *Store) markPickup(pickupID, volunteerID, from, to, donationStatus, timeField string, occurredAt time.Time) (models.Pickup, error) {
	var pickup models.Pickup
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&pickup, "id = ?", pickupID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if pickup.VolunteerID != volunteerID {
			return ErrForbidden("not_assigned_volunteer")
		}
		if pickup.Status != from {
			return ErrConflict("invalid_pickup_state")
		}
		now := time.Now().UTC()
		updates := map[string]any{"status": to, "updated_at": now, timeField: occurredAt}
		if err := tx.Model(&pickup).Updates(updates).Error; err != nil {
			return err
		}
		pickup.Status = to
		pickup.UpdatedAt = now
		if timeField == "picked_up_at" {
			pickup.PickedUpAt = &occurredAt
		} else {
			pickup.DeliveredAt = &occurredAt
		}
		if err := tx.Model(&models.Donation{}).Where("id = ?", pickup.DonationID).Updates(map[string]any{
			"status":     donationStatus,
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
		if to == string(api.PickupStatusDelivered) {
			return createNotification(tx, pickup.ReceiverID, string(api.NotificationTypePickupCompleted), "Pickup completed", "Your delivery was completed.", &pickup.DonationID, &pickup.ProposalID, &pickup.ID)
		}
		return nil
	})
	return pickup, err
}
