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

func (s *Store) NukeDatabase() error {
	return db.DropTables(s.db)
}

func (s *Store) SeedDemoData() error {
	now := time.Now().UTC()
	freshVegetablesImage := "https://res.cloudinary.com/dewgvguem/image/upload/v1780918205/swappy-20260608-182956_skxtwu.png"
	cannedGoodsImage := "https://res.cloudinary.com/dewgvguem/image/upload/v1780918307/swappy-20260608-183106_swblbh.png"
	bakeryImage := "https://res.cloudinary.com/dewgvguem/image/upload/v1780918226/swappy-20260608-183019_sgrjbs.png"
	preparedMealsImage := "https://res.cloudinary.com/dewgvguem/image/upload/v1780918163/swappy-20260608-182732_dkysjm.png"
	tofuRiceImage := "https://res.cloudinary.com/dewgvguem/image/upload/v1780918333/swappy-20260608-183203_l4abaj.png"

	users := []models.User{
		{ID: "user_donor", Name: "Demo Donor", Email: "donor@foodlink.local", Role: string(api.Donor), CreatedAt: now},
		{ID: "user_receiver", Name: "Demo Receiver", Email: "receiver@foodlink.local", Role: string(api.Receiver), CreatedAt: now},
		{ID: "user_volunteer", Name: "Demo Volunteer", Email: "volunteer@foodlink.local", Role: string(api.Volunteer), CreatedAt: now},
	}
	donorLat, donorLng := -6.2088, 106.8210
	receiverLat, receiverLng := -6.2615, 106.8106
	location := models.LocationFields{
		AddressLine1: "Jl. Sudirman 1",
		City:         "Jakarta",
		Region:       "DKI Jakarta",
		PostalCode:   "10220",
		Country:      "ID",
		Latitude:     &donorLat,
		Longitude:    &donorLng,
	}
	receiverLocation := models.LocationFields{
		AddressLine1: "Jl. Panti Harapan 8",
		City:         "Jakarta Selatan",
		Region:       "DKI Jakarta",
		PostalCode:   "12160",
		Country:      "ID",
		Latitude:     &receiverLat,
		Longitude:    &receiverLng,
	}
	profiles := []models.Profile{
		{UserID: "user_donor", DisplayName: "Dapur Abadi", Role: string(api.Donor), ContactMethod: string(api.ContactMethodWhatsapp), ContactValue: "+628111111111", Location: location, EntityType: strPtr(string(api.EntityTypeRestaurant)), OperationalHours: strPtr("Daily 08:00-20:00"), CreatedAt: now, UpdatedAt: now},
		{UserID: "user_receiver", DisplayName: "Panti Harapan", Role: string(api.Receiver), ContactMethod: string(api.ContactMethodWhatsapp), ContactValue: "+628122222222", Location: receiverLocation, EntityType: strPtr(string(api.EntityTypeShelter)), OperationalHours: strPtr("Mon-Fri 09:00-17:00"), Notes: strPtr("Prioritize ready-to-eat meals and staple pantry items for same-day distribution."), CreatedAt: now, UpdatedAt: now},
		{UserID: "user_volunteer", DisplayName: "Demo Volunteer", Role: string(api.Volunteer), ContactMethod: string(api.ContactMethodWhatsapp), ContactValue: "+628133333333", Location: location, CreatedAt: now, UpdatedAt: now},
	}
	donations := []models.Donation{
		{
			ID:                  "demo_donation_fresh_vegetables",
			DonorID:             "user_donor",
			Title:               "Fresh vegetables",
			Description:         "Assorted leafy greens, tomatoes, carrots, and broccoli packed in produce crates.",
			Quantity:            "20 kg",
			ImageURL:            &freshVegetablesImage,
			Status:              string(api.DonationStatusAvailable),
			PickupLocation:      location,
			AvailableFrom:       now.Add(45 * time.Minute),
			AvailableUntil:      now.Add(8 * time.Hour),
			SpecialInstructions: strPtr("Use rear entrance. Bring two stackable crates."),
			CreatedAt:           now.Add(-15 * time.Minute),
			UpdatedAt:           now.Add(-15 * time.Minute),
		},
		{
			ID:                  "demo_donation_bakery_trays",
			DonorID:             "user_donor",
			Title:               "Bakery trays",
			Description:         "Assorted bread rolls from morning bake, packed and ready for pickup.",
			Quantity:            "12 trays",
			ImageURL:            &bakeryImage,
			Status:              string(api.DonationStatusProposalPending),
			PickupLocation:      location,
			AvailableFrom:       now.Add(-30 * time.Minute),
			AvailableUntil:      now.Add(5 * time.Hour),
			SpecialInstructions: strPtr("Pickup at bakery counter. Keep trays level."),
			CreatedAt:           now.Add(-75 * time.Minute),
			UpdatedAt:           now.Add(-12 * time.Minute),
		},
		{
			ID:                  "demo_donation_canned_goods",
			DonorID:             "user_donor",
			Title:               "Canned goods",
			Description:         "Mixed shelf-stable cans, jars, and pantry staples.",
			Quantity:            "8 boxes",
			ImageURL:            &cannedGoodsImage,
			Status:              string(api.DonationStatusDelivered),
			PickupLocation:      location,
			AvailableFrom:       now.Add(-2 * time.Hour),
			AvailableUntil:      now.Add(3 * time.Hour),
			SpecialInstructions: strPtr("Boxes are heavy. Use loading dock."),
			CreatedAt:           now.Add(-3 * time.Hour),
			UpdatedAt:           now.Add(-50 * time.Minute),
		},
		{
			ID:                  "demo_donation_prepared_meals",
			DonorID:             "user_donor",
			Title:               "Prepared meals",
			Description:         "Packed rice, protein, and vegetables in sealed meal boxes.",
			Quantity:            "10 packs",
			ImageURL:            &preparedMealsImage,
			Status:              string(api.DonationStatusDelivered),
			PickupLocation:      location,
			AvailableFrom:       now.Add(-28 * time.Hour),
			AvailableUntil:      now.Add(-24 * time.Hour),
			SpecialInstructions: strPtr("Keep meals upright during delivery."),
			CreatedAt:           now.Add(-30 * time.Hour),
			UpdatedAt:           now.Add(-23 * time.Hour),
		},
		{
			ID:                  "demo_donation_tofu_rice_trays",
			DonorID:             "user_donor",
			Title:               "Tofu rice trays",
			Description:         "Vegetable fried rice with tofu, packed in catering trays.",
			Quantity:            "6 trays",
			ImageURL:            &tofuRiceImage,
			Status:              string(api.DonationStatusAvailable),
			PickupLocation:      location,
			AvailableFrom:       now.Add(2 * time.Hour),
			AvailableUntil:      now.Add(7 * time.Hour),
			SpecialInstructions: strPtr("Best served today. Receiver should bring insulated bags."),
			CreatedAt:           now.Add(-4 * time.Hour),
			UpdatedAt:           now.Add(-35 * time.Minute),
		},
	}
	bakeryDonorAcceptedAt := now.Add(-10 * time.Minute)
	cannedDonorAcceptedAt := now.Add(-80 * time.Minute)
	cannedReceiverAcceptedAt := now.Add(-65 * time.Minute)
	preparedDonorAcceptedAt := now.Add(-27 * time.Hour)
	preparedReceiverAcceptedAt := now.Add(-26 * time.Hour)
	rejectedByReceiver := "user_receiver"
	proposals := []models.DeliveryProposal{
		{ID: "demo_proposal_bakery_trays", DonationID: "demo_donation_bakery_trays", ReceiverID: "user_receiver", VolunteerID: "user_volunteer", Status: string(api.ProposalStatusPending), DonorAcceptedAt: &bakeryDonorAcceptedAt, CreatedAt: now.Add(-20 * time.Minute), UpdatedAt: now.Add(-10 * time.Minute)},
		{ID: "demo_proposal_canned_goods", DonationID: "demo_donation_canned_goods", ReceiverID: "user_receiver", VolunteerID: "user_volunteer", Status: string(api.ProposalStatusAccepted), DonorAcceptedAt: &cannedDonorAcceptedAt, ReceiverAcceptedAt: &cannedReceiverAcceptedAt, CreatedAt: now.Add(-95 * time.Minute), UpdatedAt: now.Add(-65 * time.Minute)},
		{ID: "demo_proposal_prepared_meals", DonationID: "demo_donation_prepared_meals", ReceiverID: "user_receiver", VolunteerID: "user_volunteer", Status: string(api.ProposalStatusAccepted), DonorAcceptedAt: &preparedDonorAcceptedAt, ReceiverAcceptedAt: &preparedReceiverAcceptedAt, CreatedAt: now.Add(-28 * time.Hour), UpdatedAt: now.Add(-26 * time.Hour)},
		{ID: "demo_proposal_tofu_rejected", DonationID: "demo_donation_tofu_rice_trays", ReceiverID: "user_receiver", VolunteerID: "user_volunteer", Status: string(api.ProposalStatusRejected), RejectedByUserID: &rejectedByReceiver, CreatedAt: now.Add(-2 * time.Hour), UpdatedAt: now.Add(-90 * time.Minute)},
	}
	cannedPickedUpAt := now.Add(-60 * time.Minute)
	cannedDeliveredAt := now.Add(-40 * time.Minute)
	preparedPickedUpAt := now.Add(-25 * time.Hour)
	preparedDeliveredAt := now.Add(-23 * time.Hour)
	pickups := []models.Pickup{
		{ID: "demo_pickup_canned_goods", DonationID: "demo_donation_canned_goods", ProposalID: "demo_proposal_canned_goods", ReceiverID: "user_receiver", VolunteerID: "user_volunteer", Status: string(api.PickupStatusDelivered), PickupLocation: location, DeliveryLocation: receiverLocation, PickedUpAt: &cannedPickedUpAt, DeliveredAt: &cannedDeliveredAt, CreatedAt: now.Add(-65 * time.Minute), UpdatedAt: now.Add(-30 * time.Minute)},
		{ID: "demo_pickup_prepared_meals", DonationID: "demo_donation_prepared_meals", ProposalID: "demo_proposal_prepared_meals", ReceiverID: "user_receiver", VolunteerID: "user_volunteer", Status: string(api.PickupStatusDelivered), PickupLocation: location, DeliveryLocation: receiverLocation, PickedUpAt: &preparedPickedUpAt, DeliveredAt: &preparedDeliveredAt, CreatedAt: now.Add(-26 * time.Hour), UpdatedAt: now.Add(-23 * time.Hour)},
	}
	notifications := []models.Notification{
		{ID: "demo_notif_donor_bakery_proposal", UserID: "user_donor", Type: string(api.NotificationTypeProposalCreated), Title: "New proposal received", Body: "Demo Volunteer proposed to deliver Bakery trays to Panti Harapan.", Read: false, DonationID: strPtr("demo_donation_bakery_trays"), ProposalID: strPtr("demo_proposal_bakery_trays"), CreatedAt: now.Add(-20 * time.Minute)},
		{ID: "demo_notif_donor_bakery_accept", UserID: "user_donor", Type: string(api.NotificationTypeProposalAccepted), Title: "Proposal accepted by donor", Body: "You accepted the Bakery trays proposal. Receiver confirmation is still pending.", Read: false, DonationID: strPtr("demo_donation_bakery_trays"), ProposalID: strPtr("demo_proposal_bakery_trays"), CreatedAt: now.Add(-10 * time.Minute)},
		{ID: "demo_notif_donor_tofu_rejected", UserID: "user_donor", Type: string(api.NotificationTypeProposalRejected), Title: "Proposal rejected by receiver", Body: "Panti Harapan rejected the proposal for Tofu rice trays.", Read: false, DonationID: strPtr("demo_donation_tofu_rice_trays"), ProposalID: strPtr("demo_proposal_tofu_rejected"), CreatedAt: now.Add(-90 * time.Minute)},
		{ID: "demo_notif_donor_canned_pickup", UserID: "user_donor", Type: string(api.NotificationTypePickupAssigned), Title: "Pickup assigned", Body: "Pickup for Canned goods has been assigned to Demo Volunteer.", Read: false, DonationID: strPtr("demo_donation_canned_goods"), ProposalID: strPtr("demo_proposal_canned_goods"), PickupID: strPtr("demo_pickup_canned_goods"), CreatedAt: now.Add(-65 * time.Minute)},
		{ID: "demo_notif_donor_fresh_created", UserID: "user_donor", Type: string(api.NotificationTypeDonationCreated), Title: "Donation published", Body: "Fresh vegetables is visible to volunteers for matching.", Read: false, DonationID: strPtr("demo_donation_fresh_vegetables"), CreatedAt: now.Add(-15 * time.Minute)},
		{ID: "demo_notif_donor_prepared_delivered", UserID: "user_donor", Type: string(api.NotificationTypePickupCompleted), Title: "Delivery completed", Body: "Pickup for Prepared meals was marked as delivered.", Read: true, DonationID: strPtr("demo_donation_prepared_meals"), ProposalID: strPtr("demo_proposal_prepared_meals"), PickupID: strPtr("demo_pickup_prepared_meals"), CreatedAt: now.Add(-23 * time.Hour), ReadAt: timePtr(now.Add(-22 * time.Hour))},
		{ID: "demo_notif_volunteer_bakery_accept", UserID: "user_volunteer", Type: string(api.NotificationTypeProposalAccepted), Title: "Proposal accepted by donor", Body: "Dapur Abadi accepted your proposal for Bakery trays.", Read: false, DonationID: strPtr("demo_donation_bakery_trays"), ProposalID: strPtr("demo_proposal_bakery_trays"), CreatedAt: now.Add(-10 * time.Minute)},
		{ID: "demo_notif_volunteer_tofu_rejected", UserID: "user_volunteer", Type: string(api.NotificationTypeProposalRejected), Title: "Proposal rejected by receiver", Body: "Panti Harapan rejected the proposal for Tofu rice trays.", Read: false, DonationID: strPtr("demo_donation_tofu_rice_trays"), ProposalID: strPtr("demo_proposal_tofu_rejected"), CreatedAt: now.Add(-90 * time.Minute)},
		{ID: "demo_notif_volunteer_canned_pickup", UserID: "user_volunteer", Type: string(api.NotificationTypePickupAssigned), Title: "Pickup assigned", Body: "Both parties accepted. Canned goods is ready for pickup.", Read: false, DonationID: strPtr("demo_donation_canned_goods"), ProposalID: strPtr("demo_proposal_canned_goods"), PickupID: strPtr("demo_pickup_canned_goods"), CreatedAt: now.Add(-65 * time.Minute)},
		{ID: "demo_notif_receiver_bakery_proposal", UserID: "user_receiver", Type: string(api.NotificationTypeProposalCreated), Title: "Incoming food proposal", Body: "Demo Volunteer proposed Bakery trays for your profile.", Read: false, DonationID: strPtr("demo_donation_bakery_trays"), ProposalID: strPtr("demo_proposal_bakery_trays"), CreatedAt: now.Add(-20 * time.Minute)},
		{ID: "demo_notif_receiver_prepared_delivered", UserID: "user_receiver", Type: string(api.NotificationTypePickupCompleted), Title: "Pickup completed", Body: "Prepared meals was delivered to Panti Harapan.", Read: true, DonationID: strPtr("demo_donation_prepared_meals"), ProposalID: strPtr("demo_proposal_prepared_meals"), PickupID: strPtr("demo_pickup_prepared_meals"), CreatedAt: now.Add(-23 * time.Hour), ReadAt: timePtr(now.Add(-22 * time.Hour))},
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, user := range users {
			if err := tx.Where("id = ?", user.ID).Assign(user).FirstOrCreate(&user).Error; err != nil {
				return err
			}
		}
		for _, profile := range profiles {
			if err := tx.Where("user_id = ?", profile.UserID).Assign(profile).FirstOrCreate(&profile).Error; err != nil {
				return err
			}
		}
		for _, donation := range donations {
			if err := tx.Where("id = ?", donation.ID).Assign(donation).FirstOrCreate(&donation).Error; err != nil {
				return err
			}
		}
		for _, proposal := range proposals {
			if err := tx.Where("id = ?", proposal.ID).Assign(proposal).FirstOrCreate(&proposal).Error; err != nil {
				return err
			}
		}
		for _, pickup := range pickups {
			if err := tx.Where("id = ?", pickup.ID).Assign(pickup).FirstOrCreate(&pickup).Error; err != nil {
				return err
			}
		}
		for _, notification := range notifications {
			if err := tx.Where("id = ?", notification.ID).Assign(notification).FirstOrCreate(&notification).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Store) CleanupSmokeData() error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var donations []models.Donation
		if err := tx.Where(
			"title LIKE ? OR title LIKE ? OR title LIKE ? OR special_instructions = ?",
			"[SMOKE_TEST]%",
			"Hurl smoke test%",
			"Smoke duplicate transition%",
			"Smoke test record",
		).Find(&donations).Error; err != nil {
			return err
		}
		if len(donations) == 0 {
			return nil
		}

		donationIDs := make([]string, 0, len(donations))
		for _, donation := range donations {
			donationIDs = append(donationIDs, donation.ID)
		}

		if err := tx.Where("donation_id IN ?", donationIDs).Delete(&models.Notification{}).Error; err != nil {
			return err
		}
		if err := tx.Where("donation_id IN ?", donationIDs).Delete(&models.Pickup{}).Error; err != nil {
			return err
		}
		if err := tx.Where("donation_id IN ?", donationIDs).Delete(&models.DeliveryProposal{}).Error; err != nil {
			return err
		}
		return tx.Where("id IN ?", donationIDs).Delete(&models.Donation{}).Error
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

func (s *Store) CreateDeliveryProposal(donationID, receiverID, volunteerID string, volunteerContactOverride *string) (models.DeliveryProposal, error) {
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
			ID:                       NewID("proposal"),
			DonationID:               donationID,
			ReceiverID:               receiverID,
			VolunteerID:              volunteerID,
			Status:                   string(api.ProposalStatusPending),
			VolunteerContactOverride: volunteerContactOverride,
			CreatedAt:                now,
			UpdatedAt:                now,
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

func timePtr(value time.Time) *time.Time {
	return &value
}
