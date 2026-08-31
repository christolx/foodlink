package pickups

import (
	"foodlink-be/internal/api"
	"foodlink-be/internal/models"
	"time"
)

type Repository interface {
	ListPickups(int, int, *api.PickupStatus, models.User) ([]models.Pickup, int64, error)
	MarkPickedUp(string, string, time.Time) (models.Pickup, error)
	MarkDelivered(string, string, string, time.Time) (models.Pickup, error)
}
