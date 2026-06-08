# Frontend

Next.js frontend app for FoodLink.

Current contents:
- App Router, React, TypeScript, and Tailwind.
- Demo account picker for donor, volunteer, and receiver roles.
- Role dashboards for donor, volunteer, and receiver demo flows.
- Volunteer dashboard loads donations, receivers, proposals, pickups, and notifications.
- Receiver dashboard loads proposals, pickups, profile needs, and notifications.
- Dashboard controls should either call the API, update local view state, or be removed until implemented.

Dashboard data notes:
- `GET /delivery-proposals` and `GET /pickups` may include embedded donation/profile data.
- Prefer embedded data for dashboard labels and cards; fall back to local lists only when an embedded field is absent.
- Profile needs updates use `PUT /me/profile`.
