package store

import (
	"errors"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

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
func (s *Store) AcceptDeliveryProposal(proposalID string, user models.User) (models.DeliveryProposal, *models.Pickup, error) {
	var proposal models.DeliveryProposal
	var pickup *models.Pickup
	err := s.db.Transaction(func(tx *gorm.DB) error {
		proposalQuery := tx
		if tx.Dialector.Name() == "postgres" {
			proposalQuery = proposalQuery.Clauses(clause.Locking{Strength: "UPDATE"})
		}
		if err := proposalQuery.First(&proposal, "id = ?", proposalID).Error; err != nil {
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
		if err := tx.First(&proposal, "id = ?", proposalID).Error; err != nil {
			return err
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
			var existingPickup models.Pickup
			if err := tx.First(&existingPickup, "proposal_id = ?", proposal.ID).Error; err == nil {
				pickup = &existingPickup
				return createNotification(tx, proposal.VolunteerID, string(api.NotificationTypeProposalAccepted), "Proposal accepted", "A party accepted your delivery proposal.", &donation.ID, &proposal.ID, nil)
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
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
