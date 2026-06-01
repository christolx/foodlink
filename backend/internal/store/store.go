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
	now := time.Now().UTC()
	users := []models.User{
		{ID: "user_donor", Name: "Demo Donor", Email: "donor@foodlink.local", Role: string(api.Donor), CreatedAt: now},
		{ID: "user_receiver", Name: "Demo Receiver", Email: "receiver@foodlink.local", Role: string(api.Receiver), CreatedAt: now},
		{ID: "user_volunteer", Name: "Demo Volunteer", Email: "volunteer@foodlink.local", Role: string(api.Volunteer), CreatedAt: now},
	}
	location := models.LocationFields{
		AddressLine1: "Jl. Sudirman 1",
		City:         "Jakarta",
		Region:       "DKI Jakarta",
		PostalCode:   "10220",
		Country:      "ID",
	}
	profiles := []models.Profile{
		{UserID: "user_donor", DisplayName: "Demo Donor", Role: string(api.Donor), ContactMethod: string(api.ContactMethodWhatsapp), ContactValue: "+628111111111", Location: location, CreatedAt: now, UpdatedAt: now},
		{UserID: "user_receiver", DisplayName: "Demo Receiver Shelter", Role: string(api.Receiver), ContactMethod: string(api.ContactMethodWhatsapp), ContactValue: "+628122222222", Location: location, EntityType: strPtr(string(api.EntityTypeShelter)), OperationalHours: strPtr("Mon-Fri 09:00-17:00"), CreatedAt: now, UpdatedAt: now},
		{UserID: "user_volunteer", DisplayName: "Demo Volunteer", Role: string(api.Volunteer), ContactMethod: string(api.ContactMethodWhatsapp), ContactValue: "+628133333333", Location: location, CreatedAt: now, UpdatedAt: now},
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, user := range users {
			if err := tx.Where("id = ?", user.ID).FirstOrCreate(&user).Error; err != nil {
				return err
			}
		}
		for _, profile := range profiles {
			if err := tx.Where("user_id = ?", profile.UserID).FirstOrCreate(&profile).Error; err != nil {
				return err
			}
		}
		return nil
	})
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

func (s *Store) ProfileByUserID(userID string) (models.Profile, error) {
	var profile models.Profile
	err := s.db.First(&profile, "user_id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return profile, ErrNotFound
	}
	return profile, err
}

func (s *Store) UpsertProfile(profile models.Profile) (models.Profile, error) {
	now := time.Now().UTC()
	var existing models.Profile
	err := s.db.First(&existing, "user_id = ?", profile.UserID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		profile.CreatedAt = now
		profile.UpdatedAt = now
		return profile, s.db.Create(&profile).Error
	}
	if err != nil {
		return profile, err
	}
	updates := map[string]any{
		"display_name":           profile.DisplayName,
		"contact_method":         profile.ContactMethod,
		"contact_value":          profile.ContactValue,
		"location_address_line1": profile.Location.AddressLine1,
		"location_address_line2": profile.Location.AddressLine2,
		"location_city":          profile.Location.City,
		"location_region":        profile.Location.Region,
		"location_postal_code":   profile.Location.PostalCode,
		"location_country":       profile.Location.Country,
		"location_latitude":      profile.Location.Latitude,
		"location_longitude":     profile.Location.Longitude,
		"entity_type":            profile.EntityType,
		"operational_hours":      profile.OperationalHours,
		"notes":                  profile.Notes,
		"updated_at":             now,
	}
	if err := s.db.Model(&existing).Updates(updates).Error; err != nil {
		return profile, err
	}
	return s.ProfileByUserID(profile.UserID)
}

func (s *Store) ListReceivers(page, pageSize int) ([]models.Profile, int64, error) {
	var profiles []models.Profile
	query := s.db.Model(&models.Profile{}).Where("role = ?", string(api.Receiver))
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("display_name asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&profiles).Error
	return profiles, total, err
}

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

func (s *Store) CreateDeliveryProposal(donationID, receiverID, volunteerID string) (models.DeliveryProposal, error) {
	var proposal models.DeliveryProposal
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
		var receiver models.User
		if err := tx.First(&receiver, "id = ? AND role = ?", receiverID, string(api.Receiver)).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if err := tx.First(&models.Profile{}, "user_id = ? AND role = ?", receiverID, string(api.Receiver)).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		now := time.Now().UTC()
		proposal = models.DeliveryProposal{
			ID:          NewID("proposal"),
			DonationID:  donationID,
			ReceiverID:  receiverID,
			VolunteerID: volunteerID,
			Status:      string(api.ProposalStatusPending),
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if err := tx.Create(&proposal).Error; err != nil {
			return err
		}
		if err := tx.Model(&donation).Updates(map[string]any{
			"status":     string(api.DonationStatusProposalPending),
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
		if err := createNotification(tx, donation.DonorID, string(api.NotificationTypeProposalCreated), "Delivery proposal", "A volunteer proposed a receiver for your donation.", &donation.ID, &proposal.ID, nil); err != nil {
			return err
		}
		return createNotification(tx, receiverID, string(api.NotificationTypeProposalCreated), "Incoming food proposal", "A volunteer proposed a donation for your profile.", &donation.ID, &proposal.ID, nil)
	})
	return proposal, err
}

func (s *Store) ListDeliveryProposals(page, pageSize int, status *api.ProposalStatus, user models.User) ([]models.DeliveryProposal, int64, error) {
	var proposals []models.DeliveryProposal
	query := s.db.Model(&models.DeliveryProposal{})
	if status != nil {
		query = query.Where("status = ?", string(*status))
	}
	switch user.Role {
	case string(api.Donor):
		query = query.Joins("JOIN donations ON donations.id = delivery_proposals.donation_id").Where("donations.donor_id = ?", user.ID)
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
	err := query.Order("delivery_proposals.created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&proposals).Error
	return proposals, total, err
}

func (s *Store) AcceptDeliveryProposal(proposalID string, user models.User) (models.DeliveryProposal, *models.Pickup, error) {
	var proposal models.DeliveryProposal
	var pickup *models.Pickup
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&proposal, "id = ?", proposalID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if proposal.Status != string(api.ProposalStatusPending) {
			return ErrConflict("proposal_not_pending")
		}
		var donation models.Donation
		if err := tx.First(&donation, "id = ?", proposal.DonationID).Error; err != nil {
			return err
		}
		now := time.Now().UTC()
		updates := map[string]any{"updated_at": now}
		switch user.Role {
		case string(api.Donor):
			if donation.DonorID != user.ID {
				return ErrForbidden("not_proposal_donor")
			}
			updates["donor_accepted_at"] = now
			proposal.DonorAcceptedAt = &now
		case string(api.Receiver):
			if proposal.ReceiverID != user.ID {
				return ErrForbidden("not_proposal_receiver")
			}
			updates["receiver_accepted_at"] = now
			proposal.ReceiverAcceptedAt = &now
		default:
			return ErrForbidden("role_cannot_accept_proposal")
		}
		if err := tx.Model(&proposal).Updates(updates).Error; err != nil {
			return err
		}
		if proposal.DonorAcceptedAt == nil || proposal.ReceiverAcceptedAt == nil {
			if err := tx.First(&proposal, "id = ?", proposalID).Error; err != nil {
				return err
			}
		}
		if proposal.DonorAcceptedAt != nil && proposal.ReceiverAcceptedAt != nil {
			var receiverProfile models.Profile
			if err := tx.First(&receiverProfile, "user_id = ?", proposal.ReceiverID).Error; err != nil {
				return err
			}
			proposal.Status = string(api.ProposalStatusAccepted)
			proposal.UpdatedAt = now
			if err := tx.Model(&proposal).Updates(map[string]any{
				"status":     proposal.Status,
				"updated_at": now,
			}).Error; err != nil {
				return err
			}
			newPickup := models.Pickup{
				ID:               NewID("pickup"),
				DonationID:       donation.ID,
				ProposalID:       proposal.ID,
				ReceiverID:       proposal.ReceiverID,
				VolunteerID:      proposal.VolunteerID,
				Status:           string(api.PickupStatusAssigned),
				PickupLocation:   donation.PickupLocation,
				DeliveryLocation: receiverProfile.Location,
				CreatedAt:        now,
				UpdatedAt:        now,
			}
			if err := tx.Create(&newPickup).Error; err != nil {
				return err
			}
			if err := tx.Model(&donation).Updates(map[string]any{
				"status":     string(api.DonationStatusPickupAssigned),
				"updated_at": now,
			}).Error; err != nil {
				return err
			}
			if err := createNotification(tx, proposal.VolunteerID, string(api.NotificationTypePickupAssigned), "Pickup assigned", "Both parties accepted. Your delivery task is ready.", &donation.ID, &proposal.ID, &newPickup.ID); err != nil {
				return err
			}
			pickup = &newPickup
		}
		return createNotification(tx, proposal.VolunteerID, string(api.NotificationTypeProposalAccepted), "Proposal accepted", "A party accepted your delivery proposal.", &donation.ID, &proposal.ID, nil)
	})
	return proposal, pickup, err
}

func (s *Store) RejectDeliveryProposal(proposalID string, user models.User) (models.DeliveryProposal, error) {
	var proposal models.DeliveryProposal
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&proposal, "id = ?", proposalID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if proposal.Status != string(api.ProposalStatusPending) {
			return ErrConflict("proposal_not_pending")
		}
		var donation models.Donation
		if err := tx.First(&donation, "id = ?", proposal.DonationID).Error; err != nil {
			return err
		}
		if user.Role == string(api.Donor) && donation.DonorID != user.ID {
			return ErrForbidden("not_proposal_donor")
		}
		if user.Role == string(api.Receiver) && proposal.ReceiverID != user.ID {
			return ErrForbidden("not_proposal_receiver")
		}
		if user.Role != string(api.Donor) && user.Role != string(api.Receiver) {
			return ErrForbidden("role_cannot_reject_proposal")
		}
		now := time.Now().UTC()
		if err := tx.Model(&proposal).Updates(map[string]any{
			"status":              string(api.ProposalStatusRejected),
			"rejected_by_user_id": user.ID,
			"updated_at":          now,
		}).Error; err != nil {
			return err
		}
		if err := tx.Model(&donation).Updates(map[string]any{
			"status":     string(api.DonationStatusAvailable),
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
		proposal.Status = string(api.ProposalStatusRejected)
		proposal.RejectedByUserID = &user.ID
		proposal.UpdatedAt = now
		return createNotification(tx, proposal.VolunteerID, string(api.NotificationTypeProposalRejected), "Proposal rejected", "A party rejected your delivery proposal.", &donation.ID, &proposal.ID, nil)
	})
	return proposal, err
}

func (s *Store) MarkPickedUp(pickupID, volunteerID string, occurredAt time.Time) (models.Pickup, error) {
	return s.markPickup(pickupID, volunteerID, string(api.PickupStatusAssigned), string(api.PickupStatusPickedUp), string(api.DonationStatusPickedUp), "picked_up_at", occurredAt)
}

func (s *Store) MarkDelivered(pickupID, volunteerID string, occurredAt time.Time) (models.Pickup, error) {
	return s.markPickup(pickupID, volunteerID, string(api.PickupStatusPickedUp), string(api.PickupStatusDelivered), string(api.DonationStatusDelivered), "delivered_at", occurredAt)
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

type ForbiddenError struct {
	Code string
}

func (e ForbiddenError) Error() string {
	return e.Code
}

func ErrForbidden(code string) error {
	return ForbiddenError{Code: code}
}

func createNotification(tx *gorm.DB, userID, notificationType, title, body string, donationID, proposalID, pickupID *string) error {
	return tx.Create(&models.Notification{
		ID:         NewID("notif"),
		UserID:     userID,
		Type:       notificationType,
		Title:      title,
		Body:       body,
		Read:       false,
		DonationID: donationID,
		ProposalID: proposalID,
		PickupID:   pickupID,
		CreatedAt:  time.Now().UTC(),
	}).Error
}

func strPtr(value string) *string {
	return &value
}
