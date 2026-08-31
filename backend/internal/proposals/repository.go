package proposals

import (
	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
)

type Repository interface {
	ListDeliveryProposals(int, int, *api.ProposalStatus, models.User) ([]models.DeliveryProposal, int64, error)
	CreateDeliveryProposal(string, string, string, *string) (models.DeliveryProposal, error)
	AcceptDeliveryProposal(string, models.User) (models.DeliveryProposal, *models.Pickup, error)
	RejectDeliveryProposal(string, models.User) (models.DeliveryProposal, error)
}
