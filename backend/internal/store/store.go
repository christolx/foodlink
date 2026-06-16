package store

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"foodlink-be/internal/db"
	"foodlink-be/internal/models"

	"gorm.io/gorm"
)

type Store struct {
	db *gorm.DB
}

func New(conn *gorm.DB) *Store {
	return &Store{db: conn}
}

func (s *Store) AutoMigrate() error {
	return db.AutoMigrate(s.db)
}

func (s *Store) NukeDatabase() error {
	return db.DropTables(s.db)
}

func (s *Store) CleanupSmokeData() error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var donations []models.Donation
		if err := tx.Where(
			"title LIKE ? OR title LIKE ? OR title LIKE ? OR special_instructions = ?",
			"[SMOKE_TEST]%",
			"Hurl smoke test%",
			"Smoke duplicate transition%",
			"Smoke test record",
		).Find(&donations).Error; err != nil {
			return err
		}
		if len(donations) == 0 {
			return nil
		}

		donationIDs := make([]string, 0, len(donations))
		for _, donation := range donations {
			donationIDs = append(donationIDs, donation.ID)
		}

		if err := tx.Where("donation_id IN ?", donationIDs).Delete(&models.Notification{}).Error; err != nil {
			return err
		}
		if err := tx.Where("donation_id IN ?", donationIDs).Delete(&models.Pickup{}).Error; err != nil {
			return err
		}
		if err := tx.Where("donation_id IN ?", donationIDs).Delete(&models.DeliveryProposal{}).Error; err != nil {
			return err
		}
		return tx.Where("id IN ?", donationIDs).Delete(&models.Donation{}).Error
	})
}

func NewID(prefix string) string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return prefix + "_" + time.Now().UTC().Format("20060102150405")
	}
	return prefix + "_" + hex.EncodeToString(b[:])
}
