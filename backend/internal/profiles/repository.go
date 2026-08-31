package profiles

import "foodlink-be/internal/models"

type Repository interface {
	ProfileByUserID(string) (models.Profile, error)
	UpsertProfile(models.Profile) (models.Profile, error)
	ListReceivers(int, int) ([]models.Profile, int64, error)
}
