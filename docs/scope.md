# FoodLink Scope

## Demo Goal

- One happy path end to end
- Seeded data plus real DB sync
- Role-based dashboard
- Demo account picker

## Core Flow

- Donor creates donation
- Receiver claims donation
- Donor approves claim
- Receiver assigns volunteer
- Volunteer marks pickup
- Volunteer marks delivered

## Core UX Decisions

- Real map with static pins
- Live form plus seeded records
- Manual approve
- Manual volunteer assign
- In-app toast plus notification center
- Indonesian and English UI
- No admin screen

## Status Flow

- `posted`
- `claimed`
- `approved`
- `volunteer_assigned`
- `picked_up`
- `delivered`
- Extra states: `rejected`, `canceled`, `expired`

## Stretch Features

- Auto volunteer matching
- Push notifications
- Route map or navigation
- Pickup scheduling
- Bilingual polish
- Audit/history
- Social/admin pages

