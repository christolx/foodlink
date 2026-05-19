# FoodLink Contracts

## Core Enums

- `UserRole`: `donor | receiver | volunteer`
- `DonationStatus`: `posted | claimed | approved | volunteer_assigned | picked_up | delivered | rejected | canceled | expired`
- `PickupStatus`: `unassigned | assigned | picked_up | delivered | canceled`
- `NotificationType`: `donation_posted | claim_requested | claim_approved | volunteer_assigned | status_updated`

## Core DTOs

- `UserDTO`
- `LocationDTO`
- `DonationDTO`
- `ClaimDTO`
- `PickupDTO`
- `NotificationDTO`

## API Shape

- `POST /auth/demo-login`
- `GET /me`
- `POST /donations`
- `GET /donations`
- `GET /donations/:id`
- `POST /donations/:id/claim`
- `POST /claims/:id/approve`
- `POST /claims/:id/reject`
- `POST /pickups/:id/assign-volunteer`
- `POST /pickups/:id/pickup`
- `POST /pickups/:id/deliver`
- `GET /notifications`
- `POST /notifications/:id/read`

## Contract Rule

- Keep frontend and backend aligned through shared contract docs or generated schema
- Prefer one source of truth

