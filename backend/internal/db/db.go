package db

import (
	"time"

	"foodlink-be/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Open(databaseURL string) (*gorm.DB, error) {
	conn, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  databaseURL,
		PreferSimpleProtocol: true,
	}), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := conn.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)
	sqlDB.SetConnMaxIdleTime(1 * time.Minute)

	return conn, nil
}

func AutoMigrate(conn *gorm.DB) error {
	return conn.AutoMigrate(
		&models.User{},
		&models.Profile{},
		&models.Donation{},
		&models.DeliveryProposal{},
		&models.Pickup{},
		&models.Notification{},
		&models.Conversation{},
		&models.Message{},
	)
}

func DropTables(conn *gorm.DB) error {
	return conn.Migrator().DropTable(
		&models.Message{},
		&models.Conversation{},
		&models.Notification{},
		&models.Pickup{},
		&models.DeliveryProposal{},
		&models.Donation{},
		&models.Profile{},
		&models.User{},
	)
}
