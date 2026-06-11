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
	ImageURL            *string
	Status              string         `gorm:"index"`
	PickupLocation      LocationFields `gorm:"embedded;embeddedPrefix:pickup_"`
	AvailableFrom       time.Time
	AvailableUntil      time.Time
	SpecialInstructions *string
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type Profile struct {
	UserID           string `gorm:"primaryKey"`
	DisplayName      string
	Role             string `gorm:"index"`
	ContactMethod    string
	ContactValue     string
	Location         LocationFields `gorm:"embedded;embeddedPrefix:location_"`
	EntityType       *string
	OperationalHours *string
	Notes            *string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type DeliveryProposal struct {
	ID                      string `gorm:"primaryKey"`
	DonationID              string `gorm:"index"`
	ReceiverID              string `gorm:"index"`
	VolunteerID             string `gorm:"index"`
	Status                  string `gorm:"index"`
	VolunteerContactOverride *string
	DonorAcceptedAt         *time.Time
	ReceiverAcceptedAt      *time.Time
	RejectedByUserID        *string
	CreatedAt               time.Time
	UpdatedAt               time.Time
}

type Pickup struct {
	ID               string         `gorm:"primaryKey"`
	DonationID       string         `gorm:"index"`
	ProposalID       string         `gorm:"index"`
	ReceiverID       string         `gorm:"index"`
	VolunteerID      string         `gorm:"index"`
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
	ProposalID *string
	PickupID   *string
	CreatedAt  time.Time
	ReadAt     *time.Time
}
