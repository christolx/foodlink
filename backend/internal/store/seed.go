package store

import (
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"

	"gorm.io/gorm"
)

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

func strPtr(value string) *string {
	return &value
}

func timePtr(value time.Time) *time.Time {
	return &value
}
