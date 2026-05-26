package models

import "time"

type LocationFields struct {
	AddressLine1 string
	AddressLine2 *string
	City         string
	Region       string
	PostalCode   string
	Country      string
	Latitude     *float64
	Longitude    *float64
}

type User struct {
	ID        string `gorm:"primaryKey"`
	Name      string
	Email     string `gorm:"uniqueIndex"`
	Role      string `gorm:"index"`
	Phone     *string
	CreatedAt time.Time
}

type Donation struct {
	ID                  string `gorm:"primaryKey"`
	DonorID             string `gorm:"index"`
	Title               string
	Description         string
	Quantity            string
	Status              string         `gorm:"index"`
	PickupLocation      LocationFields `gorm:"embedded;embeddedPrefix:pickup_"`
	AvailableFrom       time.Time
	AvailableUntil      time.Time
	SpecialInstructions *string
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type Claim struct {
	ID         string `gorm:"primaryKey"`
	DonationID string `gorm:"index"`
	ReceiverID string `gorm:"index"`
	Status     string `gorm:"index"`
	Note       *string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type Pickup struct {
	ID               string         `gorm:"primaryKey"`
	DonationID       string         `gorm:"index"`
	ClaimID          string         `gorm:"index"`
	VolunteerID      *string        `gorm:"index"`
	Status           string         `gorm:"index"`
	PickupLocation   LocationFields `gorm:"embedded;embeddedPrefix:pickup_"`
	DeliveryLocation LocationFields `gorm:"embedded;embeddedPrefix:delivery_"`
	PickedUpAt       *time.Time
	DeliveredAt      *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type Notification struct {
	ID         string `gorm:"primaryKey"`
	UserID     string `gorm:"index"`
	Type       string
	Title      string
	Body       string
	Read       bool `gorm:"index"`
	DonationID *string
	ClaimID    *string
	PickupID   *string
	CreatedAt  time.Time
	ReadAt     *time.Time
}
