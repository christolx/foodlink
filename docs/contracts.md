# FoodLink Contracts

## Core Enums

- `UserRole`: `donor | receiver | volunteer`
- `ContactMethod`: `whatsapp | instagram | phone | email | other`
- `EntityType`: `charity | orphanage | shelter | family | restaurant | warteg | individual | other`
- `DonationStatus`: `available | proposal_pending | pickup_assigned | picked_up | delivered | canceled`
- `ProposalStatus`: `pending | accepted | rejected | canceled`
- `PickupStatus`: `assigned | picked_up | delivered | canceled`
- `NotificationType`: `donation_created | proposal_created | proposal_accepted | proposal_rejected | pickup_assigned | pickup_completed`

## Core DTOs

- `UserDTO`
- `ProfileDTO`
- `LocationDTO`
- `DonationDTO`
- `DeliveryProposalDTO`
- `PickupDTO`
- `NotificationDTO`

## API Shape

- `GET /health`
- `POST /auth/demo-login`
- `GET /me`
- `GET /me/profile`
- `PUT /me/profile`
- `POST /donations`
- `GET /donations`
- `GET /donations/:id`
- `GET /receivers`
- `POST /delivery-proposals`
- `GET /delivery-proposals`
- `POST /delivery-proposals/:id/accept`
- `POST /delivery-proposals/:id/reject`
- `GET /pickups`
- `POST /pickups/:id/pickup`
- `POST /pickups/:id/deliver`
- `GET /notifications`
- `POST /notifications/:id/read`
- `GET /notifications/stream`

## Dashboard Response Shape

- `DeliveryProposalDTO` may include embedded `donation`, `donorProfile`, `receiverProfile`, and `volunteerProfile` fields for role dashboards.
- `PickupDTO` may include embedded `donation`, `donorProfile`, `receiverProfile`, and `volunteerProfile` fields for active delivery timelines.
- Embedded fields are optional compatibility additions; IDs remain canonical.

## Notable Validation Rules

- Authenticated business endpoints require `Authorization: Bearer <token>`.
- `CreateDonationRequest.imageUrl` is required by contract.
- Backend currently accepts only HTTPS URLs hosted at `res.cloudinary.com` for donation images.
- List endpoints use `page` and `pageSize`, defaulting server-side to page `1` and page size `20`.
- Errors use `{ code, message }`.

## Contract Rule

- `contracts/openapi.yaml` is source of truth.
- Backend generated types and strict server interfaces come from OpenAPI.
- Frontend currently hand-mirrors contract types in `frontend/src/lib/api.ts`.
- Future frontend contract work should generate or verify types from OpenAPI instead of duplicating DTOs by hand.
