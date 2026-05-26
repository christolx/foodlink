package store

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/db"
	"foodlink-be/internal/models"

	"gorm.io/gorm"
)

var ErrNotFound = errors.New("not found")

type Store struct {
	db *gorm.DB
}

func New(conn *gorm.DB) *Store {
	return &Store{db: conn}
}

func (s *Store) AutoMigrate() error {
	return db.AutoMigrate(s.db)
}

func (s *Store) SeedDemoData() error {
	users := []models.User{
		{ID: "user_donor", Name: "Demo Donor", Email: "donor@foodlink.local", Role: string(api.Donor), CreatedAt: time.Now().UTC()},
		{ID: "user_receiver", Name: "Demo Receiver", Email: "receiver@foodlink.local", Role: string(api.Receiver), CreatedAt: time.Now().UTC()},
		{ID: "user_volunteer", Name: "Demo Volunteer", Email: "volunteer@foodlink.local", Role: string(api.Volunteer), CreatedAt: time.Now().UTC()},
	}
	for _, user := range users {
		if err := s.db.Where("id = ?", user.ID).FirstOrCreate(&user).Error; err != nil {
			return err
		}
	}
	return nil
}

func NewID(prefix string) string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return prefix + "_" + time.Now().UTC().Format("20060102150405")
	}
	return prefix + "_" + hex.EncodeToString(b[:])
}

func (s *Store) UserByID(id string) (models.User, error) {
	var user models.User
	err := s.db.First(&user, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return user, ErrNotFound
	}
	return user, err
}

func (s *Store) UserByRole(role api.UserRole) (models.User, error) {
	var user models.User
	err := s.db.First(&user, "role = ?", string(role)).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return user, ErrNotFound
	}
	return user, err
}

func (s *Store) CreateDonation(donation models.Donation) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&donation).Error; err != nil {
			return err
		}
		return createNotification(tx, donation.DonorID, string(api.DonationCreated), "Donation created", "Your donation is available.", &donation.ID, nil, nil)
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

func (s *Store) ListDonations(page, pageSize int, status *api.DonationStatus, role *api.UserRole, userID string) ([]models.Donation, int64, error) {
	var donations []models.Donation
	query := s.db.Model(&models.Donation{})
	if status != nil {
		query = query.Where("status = ?", string(*status))
	}
	if role != nil {
		switch *role {
		case api.Donor:
			query = query.Where("donor_id = ?", userID)
		case api.Volunteer:
			query = query.Where("status IN ?", []string{
				string(api.DonationStatusApproved),
				string(api.DonationStatusPickupAssigned),
				string(api.DonationStatusPickedUp),
				string(api.DonationStatusDelivered),
			})
		}
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&donations).Error
	return donations, total, err
}

func (s *Store) CreateClaim(donationID, receiverID string, note *string) (models.Claim, error) {
	var claim models.Claim
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var donation models.Donation
		if err := tx.First(&donation, "id = ?", donationID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if donation.Status != string(api.DonationStatusAvailable) {
			return ErrConflict("donation_not_available")
		}
		now := time.Now().UTC()
		claim = models.Claim{
			ID:         NewID("claim"),
			DonationID: donationID,
			ReceiverID: receiverID,
			Status:     string(api.ClaimStatusPending),
			Note:       note,
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		if err := tx.Create(&claim).Error; err != nil {
			return err
		}
		if err := tx.Model(&donation).Updates(map[string]any{
			"status":     string(api.DonationStatusClaimed),
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
		return createNotification(tx, donation.DonorID, string(api.ClaimCreated), "New claim", "A receiver claimed your donation.", &donation.ID, &claim.ID, nil)
	})
	return claim, err
}

func (s *Store) ApproveClaim(claimID string, delivery models.LocationFields) (models.Claim, models.Pickup, error) {
	var claim models.Claim
	var pickup models.Pickup
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&claim, "id = ?", claimID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if claim.Status != string(api.ClaimStatusPending) && claim.Status != string(api.ClaimStatusApproved) {
			return ErrConflict("claim_not_pending")
		}
		if err := tx.First(&pickup, "claim_id = ?", claimID).Error; err == nil {
			return nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		var donation models.Donation
		if err := tx.First(&donation, "id = ?", claim.DonationID).Error; err != nil {
			return err
		}
		now := time.Now().UTC()
		if err := tx.Model(&claim).Updates(map[string]any{
			"status":     string(api.ClaimStatusApproved),
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
		claim.Status = string(api.ClaimStatusApproved)
		claim.UpdatedAt = now
		if err := tx.Model(&donation).Updates(map[string]any{
			"status":     string(api.DonationStatusApproved),
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
		pickup = models.Pickup{
			ID:               NewID("pickup"),
			DonationID:       donation.ID,
			ClaimID:          claim.ID,
			Status:           string(api.PendingAssignment),
			PickupLocation:   donation.PickupLocation,
			DeliveryLocation: delivery,
			CreatedAt:        now,
			UpdatedAt:        now,
		}
		if err := tx.Create(&pickup).Error; err != nil {
			return err
		}
		return createNotification(tx, claim.ReceiverID, string(api.ClaimApproved), "Claim approved", "Your claim was approved.", &donation.ID, &claim.ID, &pickup.ID)
	})
	return claim, pickup, err
}

func (s *Store) RejectClaim(claimID string, reason *string) (models.Claim, error) {
	var claim models.Claim
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&claim, "id = ?", claimID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if claim.Status != string(api.ClaimStatusPending) {
			return ErrConflict("claim_not_pending")
		}
		now := time.Now().UTC()
		updates := map[string]any{"status": string(api.ClaimStatusRejected), "updated_at": now}
		if reason != nil {
			updates["note"] = reason
		}
		if err := tx.Model(&claim).Updates(updates).Error; err != nil {
			return err
		}
		claim.Status = string(api.ClaimStatusRejected)
		claim.UpdatedAt = now
		claim.Note = reason
		return createNotification(tx, claim.ReceiverID, string(api.ClaimRejected), "Claim rejected", "Your claim was rejected.", &claim.DonationID, &claim.ID, nil)
	})
	return claim, err
}

func (s *Store) AssignVolunteer(pickupID, volunteerID string) (models.Pickup, error) {
	var pickup models.Pickup
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var volunteer models.User
		if err := tx.First(&volunteer, "id = ? AND role = ?", volunteerID, string(api.Volunteer)).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if err := tx.First(&pickup, "id = ?", pickupID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if pickup.Status != string(api.PendingAssignment) {
			return ErrConflict("pickup_not_pending_assignment")
		}
		now := time.Now().UTC()
		if err := tx.Model(&pickup).Updates(map[string]any{
			"volunteer_id": volunteerID,
			"status":       string(api.Assigned),
			"updated_at":   now,
		}).Error; err != nil {
			return err
		}
		pickup.VolunteerID = &volunteerID
		pickup.Status = string(api.Assigned)
		pickup.UpdatedAt = now
		if err := tx.Model(&models.Donation{}).Where("id = ?", pickup.DonationID).Updates(map[string]any{
			"status":     string(api.DonationStatusPickupAssigned),
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
		return createNotification(tx, volunteerID, string(api.PickupAssigned), "Pickup assigned", "You were assigned to a pickup.", &pickup.DonationID, &pickup.ClaimID, &pickup.ID)
	})
	return pickup, err
}

func (s *Store) MarkPickedUp(pickupID string, occurredAt time.Time) (models.Pickup, error) {
	return s.markPickup(pickupID, string(api.Assigned), string(api.PickedUp), string(api.DonationStatusPickedUp), "picked_up_at", occurredAt)
}

func (s *Store) MarkDelivered(pickupID string, occurredAt time.Time) (models.Pickup, error) {
	return s.markPickup(pickupID, string(api.PickedUp), string(api.Delivered), string(api.DonationStatusDelivered), "delivered_at", occurredAt)
}

func (s *Store) markPickup(pickupID, from, to, donationStatus, timeField string, occurredAt time.Time) (models.Pickup, error) {
	var pickup models.Pickup
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&pickup, "id = ?", pickupID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
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
		if to == string(api.Delivered) {
			var claim models.Claim
			if err := tx.First(&claim, "id = ?", pickup.ClaimID).Error; err != nil {
				return err
			}
			return createNotification(tx, claim.ReceiverID, string(api.PickupCompleted), "Pickup completed", "Your pickup was delivered.", &pickup.DonationID, &pickup.ClaimID, &pickup.ID)
		}
		return nil
	})
	return pickup, err
}

func (s *Store) ListNotifications(userID string, page, pageSize int) ([]models.Notification, int64, error) {
	var notifications []models.Notification
	query := s.db.Model(&models.Notification{}).Where("user_id = ?", userID)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&notifications).Error
	return notifications, total, err
}

func (s *Store) MarkNotificationRead(id, userID string) (models.Notification, error) {
	var notification models.Notification
	err := s.db.First(&notification, "id = ? AND user_id = ?", id, userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return notification, ErrNotFound
	}
	if err != nil {
		return notification, err
	}
	now := time.Now().UTC()
	if err := s.db.Model(&notification).Updates(map[string]any{"read": true, "read_at": now}).Error; err != nil {
		return notification, err
	}
	notification.Read = true
	notification.ReadAt = &now
	return notification, nil
}

type ConflictError struct {
	Code string
}

func (e ConflictError) Error() string {
	return e.Code
}

func ErrConflict(code string) error {
	return ConflictError{Code: code}
}

func createNotification(tx *gorm.DB, userID, notificationType, title, body string, donationID, claimID, pickupID *string) error {
	return tx.Create(&models.Notification{
		ID:         NewID("notif"),
		UserID:     userID,
		Type:       notificationType,
		Title:      title,
		Body:       body,
		Read:       false,
		DonationID: donationID,
		ClaimID:    claimID,
		PickupID:   pickupID,
		CreatedAt:  time.Now().UTC(),
	}).Error
}
