package store

import (
	"errors"
	"time"

	"foodlink-be/internal/api"
	"foodlink-be/internal/models"

	"gorm.io/gorm"
)

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

func (s *Store) ProfilesByUserIDs(userIDs []string) ([]models.Profile, error) {
	if len(userIDs) == 0 {
		return nil, nil
	}
	var profiles []models.Profile
	err := s.db.Where("user_id IN ?", userIDs).Find(&profiles).Error
	return profiles, err
}

func (s *Store) CreateUserWithProfile(user models.User, profile models.Profile) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		return tx.Create(&profile).Error
	})
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
