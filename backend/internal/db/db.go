package db

import (
	"context"
	"database/sql"
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

	sqlDB.SetMaxOpenConns(4)
	sqlDB.SetMaxIdleConns(4)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(15 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := warmConnections(ctx, sqlDB, 4); err != nil {
		return nil, err
	}

	return conn, nil
}

func warmConnections(ctx context.Context, sqlDB *sql.DB, count int) error {
	conns := make([]*sql.Conn, 0, count)
	defer func() {
		for _, conn := range conns {
			_ = conn.Close()
		}
	}()

	for i := 0; i < count; i++ {
		conn, err := sqlDB.Conn(ctx)
		if err != nil {
			return err
		}
		conns = append(conns, conn)
		if err := conn.PingContext(ctx); err != nil {
			return err
		}
	}
	return nil
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
