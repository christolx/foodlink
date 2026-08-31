// Package proposals owns delivery-proposal use cases and persistence boundary.
package proposals

import (
	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
	"foodlink-be/internal/store"
)

type Service struct{ repository Repository }

func New(repository Repository) *Service { return &Service{repository: repository} }
func (s *Service) List(page, pageSize int, status *api.ProposalStatus, user models.User) ([]models.DeliveryProposal, int64, error) {
	return s.repository.ListDeliveryProposals(page, pageSize, status, user)
}
func (s *Service) Create(donationID, receiverID string, volunteer models.User, contact *string) (models.DeliveryProposal, error) {
	if volunteer.Role != string(api.Volunteer) {
		return models.DeliveryProposal{}, store.ErrForbidden("volunteer role required")
	}
	return s.repository.CreateDeliveryProposal(donationID, receiverID, volunteer.ID, contact)
}
func (s *Service) Accept(id string, user models.User) (models.DeliveryProposal, *models.Pickup, error) {
	return s.repository.AcceptDeliveryProposal(id, user)
}
func (s *Service) Reject(id string, user models.User) (models.DeliveryProposal, error) {
	return s.repository.RejectDeliveryProposal(id, user)
}
