# Frontend

Next.js frontend app for FoodLink.

## Current Contents

- App Router, React, TypeScript, and Tailwind.
- Landing page with role, impact, and demo entry sections.
- Demo account picker for donor, volunteer, and receiver roles.
- Role dashboards for donor, volunteer, and receiver demo flows.
- Volunteer dashboard loads donations, receivers, proposals, pickups, and notifications.
- Receiver dashboard loads proposals, pickups, profile needs, and notifications.
- Donor dashboard supports donation creation with Cloudinary image upload.
- Leaflet + OpenStreetMap maps for volunteer context and donation pickup location selection.
- Dashboard controls should either call the API, update local view state, or be removed until implemented.

## Routes

- `/` renders the public landing page.
- `/demo` lets the user choose a seeded demo role and creates a demo JWT.
- `/app` loads the dashboard for the current token and redirects to `/demo` without one.

## Client State And API

- API requests use `frontend/src/lib/api.ts`.
- Requests are sent to `/api/v1` by default.
- Set `NEXT_PUBLIC_API_BASE_URL` to call a backend on another origin.
- Demo auth stores the access token in `localStorage` as `foodlink.demoToken`.
- `GET /me` and `GET /me/profile` bootstrap the dashboard session.

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL`: optional API origin, for example `http://localhost:8080`.
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name for client-side image uploads.
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`: unsigned upload preset for client-side image uploads.

## Dashboard Data Notes

- `GET /delivery-proposals` and `GET /pickups` may include embedded donation/profile data.
- Prefer embedded data for dashboard labels and cards; fall back to local lists only when an embedded field is absent.
- Profile needs updates use `PUT /me/profile`.
- Donation creation sends `imageUrl`; backend currently requires a Cloudinary HTTPS URL.
- If Cloudinary upload env vars are missing, the UI falls back to a default donation image URL.

## Map Notes

- `VolunteerMap` shows donor, receiver, and current browser geolocation markers when data exists.
- `LocationPickerMap` lets donors choose pickup coordinates by click or drag.
- Map components are dynamically imported in the dashboard because Leaflet depends on browser globals.
- Google Maps links are opened from available latitude/longitude or address text for external navigation.
