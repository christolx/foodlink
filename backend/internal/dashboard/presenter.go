// Package dashboard owns cross-feature read models used by dashboard responses.
package dashboard

import (
	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
)

type Repository interface {
	DonationByID(string) (models.Donation, error)
	DonationsByIDs([]string) ([]models.Donation, error)
	ProfileByUserID(string) (models.Profile, error)
	ProfilesByUserIDs([]string) ([]models.Profile, error)
}

type Presenter struct{ repository Repository }

func New(repository Repository) *Presenter { return &Presenter{repository: repository} }

func (p *Presenter) Proposal(value models.DeliveryProposal) api.DeliveryProposal {
	result := proposalDTO(value)
	p.enrich(&result, nil)
	return result
}
func (p *Presenter) Pickup(value models.Pickup) api.Pickup {
	result := pickupDTO(value)
	p.enrich(nil, &result)
	return result
}
func (p *Presenter) Proposals(values []models.DeliveryProposal) ([]api.DeliveryProposal, error) {
	donationIDs, userIDs := make([]string, 0, len(values)), make([]string, 0, len(values)*2)
	for _, value := range values {
		donationIDs = append(donationIDs, value.DonationID)
		userIDs = append(userIDs, value.ReceiverID, value.VolunteerID)
	}
	relations, err := p.relations(donationIDs, userIDs)
	if err != nil {
		return nil, err
	}
	result := make([]api.DeliveryProposal, 0, len(values))
	for _, value := range values {
		item := proposalDTO(value)
		enrichCached(&item, nil, relations)
		result = append(result, item)
	}
	return result, nil
}
func (p *Presenter) Pickups(values []models.Pickup) ([]api.Pickup, error) {
	donationIDs, userIDs := make([]string, 0, len(values)), make([]string, 0, len(values)*2)
	for _, value := range values {
		donationIDs = append(donationIDs, value.DonationID)
		userIDs = append(userIDs, value.ReceiverID, value.VolunteerID)
	}
	relations, err := p.relations(donationIDs, userIDs)
	if err != nil {
		return nil, err
	}
	result := make([]api.Pickup, 0, len(values))
	for _, value := range values {
		item := pickupDTO(value)
		enrichCached(nil, &item, relations)
		result = append(result, item)
	}
	return result, nil
}

type relations struct {
	donations map[string]api.Donation
	profiles  map[string]api.Profile
}

func (p *Presenter) relations(donationIDs, userIDs []string) (relations, error) {
	result := relations{donations: map[string]api.Donation{}, profiles: map[string]api.Profile{}}
	donations, err := p.repository.DonationsByIDs(unique(donationIDs))
	if err != nil {
		return result, err
	}
	for _, donation := range donations {
		result.donations[donation.ID] = donationDTO(donation)
		userIDs = append(userIDs, donation.DonorID)
	}
	profiles, err := p.repository.ProfilesByUserIDs(unique(userIDs))
	if err != nil {
		return result, err
	}
	for _, profile := range profiles {
		result.profiles[profile.UserID] = profileDTO(profile)
	}
	return result, nil
}
func (p *Presenter) enrich(proposal *api.DeliveryProposal, pickup *api.Pickup) {
	donationID, receiverID, volunteerID := ids(proposal, pickup)
	donation, err := p.repository.DonationByID(donationID)
	if err == nil {
		dto := donationDTO(donation)
		setDonation(proposal, pickup, dto)
		if profile, err := p.repository.ProfileByUserID(donation.DonorID); err == nil {
			setDonor(proposal, pickup, profileDTO(profile))
		}
	}
	if profile, err := p.repository.ProfileByUserID(receiverID); err == nil {
		setReceiver(proposal, pickup, profileDTO(profile))
	}
	if profile, err := p.repository.ProfileByUserID(volunteerID); err == nil {
		setVolunteer(proposal, pickup, profileDTO(profile))
	}
}
func enrichCached(proposal *api.DeliveryProposal, pickup *api.Pickup, relations relations) {
	donationID, receiverID, volunteerID := ids(proposal, pickup)
	if donation, ok := relations.donations[donationID]; ok {
		setDonation(proposal, pickup, donation)
		if profile, ok := relations.profiles[donation.DonorId]; ok {
			setDonor(proposal, pickup, profile)
		}
	}
	if profile, ok := relations.profiles[receiverID]; ok {
		setReceiver(proposal, pickup, profile)
	}
	if profile, ok := relations.profiles[volunteerID]; ok {
		setVolunteer(proposal, pickup, profile)
	}
}
func ids(proposal *api.DeliveryProposal, pickup *api.Pickup) (string, string, string) {
	if proposal != nil {
		return proposal.DonationId, proposal.ReceiverId, proposal.VolunteerId
	}
	return pickup.DonationId, pickup.ReceiverId, pickup.VolunteerId
}
func setDonation(proposal *api.DeliveryProposal, pickup *api.Pickup, value api.Donation) {
	if proposal != nil {
		proposal.Donation = &value
	}
	if pickup != nil {
		pickup.Donation = &value
	}
}
func setDonor(proposal *api.DeliveryProposal, pickup *api.Pickup, value api.Profile) {
	if proposal != nil {
		proposal.DonorProfile = &value
	}
	if pickup != nil {
		pickup.DonorProfile = &value
	}
}
func setReceiver(proposal *api.DeliveryProposal, pickup *api.Pickup, value api.Profile) {
	if proposal != nil {
		proposal.ReceiverProfile = &value
	}
	if pickup != nil {
		pickup.ReceiverProfile = &value
	}
}
func setVolunteer(proposal *api.DeliveryProposal, pickup *api.Pickup, value api.Profile) {
	if proposal != nil {
		proposal.VolunteerProfile = &value
	}
	if pickup != nil {
		pickup.VolunteerProfile = &value
	}
}
func proposalDTO(value models.DeliveryProposal) api.DeliveryProposal {
	return api.DeliveryProposal{Id: value.ID, DonationId: value.DonationID, ReceiverId: value.ReceiverID, VolunteerId: value.VolunteerID, Status: api.ProposalStatus(value.Status), VolunteerContactOverride: value.VolunteerContactOverride, DonorAcceptedAt: value.DonorAcceptedAt, ReceiverAcceptedAt: value.ReceiverAcceptedAt, RejectedByUserId: value.RejectedByUserID, CreatedAt: value.CreatedAt, UpdatedAt: value.UpdatedAt}
}
func pickupDTO(value models.Pickup) api.Pickup {
	return api.Pickup{Id: value.ID, DonationId: value.DonationID, ProposalId: value.ProposalID, ReceiverId: value.ReceiverID, VolunteerId: value.VolunteerID, Status: api.PickupStatus(value.Status), PickupLocation: locationDTO(value.PickupLocation), DeliveryLocation: locationDTO(value.DeliveryLocation), PickedUpAt: value.PickedUpAt, DeliveredAt: value.DeliveredAt, CreatedAt: value.CreatedAt, UpdatedAt: value.UpdatedAt}
}
func donationDTO(value models.Donation) api.Donation {
	image := ""
	if value.ImageURL != nil {
		image = *value.ImageURL
	}
	return api.Donation{Id: value.ID, DonorId: value.DonorID, Title: value.Title, Description: value.Description, Quantity: value.Quantity, ImageUrl: image, Status: api.DonationStatus(value.Status), PickupLocation: locationDTO(value.PickupLocation), AvailableFrom: value.AvailableFrom, AvailableUntil: value.AvailableUntil, SpecialInstructions: value.SpecialInstructions, CreatedAt: value.CreatedAt, UpdatedAt: value.UpdatedAt}
}
func profileDTO(value models.Profile) api.Profile {
	return api.Profile{UserId: value.UserID, DisplayName: value.DisplayName, Role: api.UserRole(value.Role), ContactMethod: api.ContactMethod(value.ContactMethod), ContactValue: value.ContactValue, Location: locationDTO(value.Location), CreatedAt: value.CreatedAt, UpdatedAt: value.UpdatedAt, EntityType: entityType(value.EntityType), OperationalHours: value.OperationalHours, Notes: value.Notes}
}
func locationDTO(value models.LocationFields) api.Location {
	return api.Location{AddressLine1: value.AddressLine1, AddressLine2: value.AddressLine2, City: value.City, Region: value.Region, PostalCode: value.PostalCode, Country: value.Country, Latitude: value.Latitude, Longitude: value.Longitude}
}
func entityType(value *string) *api.EntityType {
	if value == nil {
		return nil
	}
	result := api.EntityType(*value)
	return &result
}
func unique(values []string) []string {
	seen := map[string]struct{}{}
	result := make([]string, 0, len(values))
	for _, value := range values {
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}
