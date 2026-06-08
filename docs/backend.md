# Backend

Go core service for FoodLink.

Current contents:
- REST API generated from `contracts/openapi.yaml`.
- Demo JWT auth and role gates.
- PostgreSQL persistence through GORM.
- Volunteer-driven proposal flow.
- Donor and receiver proposal accept/reject flow.
- Pickup assignment and status transitions.
- Role-scoped pickup listing for dashboards.

Dashboard API notes:
- `GET /delivery-proposals` returns proposals visible to the current role.
- `GET /pickups` returns pickups visible to the current role, with optional `status` filtering.
- Proposal and pickup DTOs embed related donation/profile data when available so frontend dashboards do not render raw IDs.
