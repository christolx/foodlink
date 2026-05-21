package db

import (
	"foodlink-be/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Open(databaseURL string) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
}

func AutoMigrate(conn *gorm.DB) error {
	return conn.AutoMigrate(
		&models.User{},
		&models.Donation{},
		&models.Claim{},
		&models.Pickup{},
		&models.Notification{},
	)
}
