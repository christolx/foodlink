# FoodLink Scope

## Demo Goal

- One volunteer-driven matching path end to end
- Seeded demo users plus real database sync
- Role-based backend behavior
- Demo account picker for donor, receiver, and volunteer roles

## Role Direction

- Donors are individuals, restaurants, warteg, kitchens, or businesses with excess safe food.
- Receivers are charities, panti asuhan, shelters, low-income families, or community organizations.
- Volunteers see available donations and receiver profiles, then choose which food should go to which receiver.

## Core Flow

- Donor creates donation.
- Volunteer views available donations and receiver profiles.
- Volunteer creates delivery proposal pairing one donation with one receiver.
- Donor accepts or rejects proposal.
- Receiver accepts or rejects proposal.
- When both accept, pickup task is created and assigned to volunteer.
- Volunteer marks picked up.
- Volunteer marks delivered.

## Core UX Decisions

- Landing page explains roles, impact, and demo entry points.
- Demo login stores a local browser token for the dashboard session.
- Role dashboards are available for donor, receiver, and volunteer flows.
- Dashboard map views use Leaflet + OpenStreetMap.
- Donors can pick pickup coordinates on a map when creating donations.
- Volunteers can see donor, receiver, and current-location map markers.
- Volunteers can open external Google Maps links from available location data.
- In-app acceptance is source of truth.
- WhatsApp, Instagram, phone, email, or other contact values support external coordination.
- In-app action feedback plus notification center support dashboard coordination.
- Indonesian and English UI later.
- No admin screen for demo scope.

## Status Flow

- Donation: `available`, `proposal_pending`, `pickup_assigned`, `picked_up`, `delivered`, `canceled`
- Proposal: `pending`, `accepted`, `rejected`, `canceled`
- Pickup: `assigned`, `picked_up`, `delivered`, `canceled`

## Stretch Features

- Real signup and production auth
- Structured weekly operational hours
- Multi-contact profiles
- Auto volunteer matching
- Push notifications
- Route drawing or turn-by-turn navigation inside app
- Pickup scheduling
- Bilingual polish
- Audit/history
- Social/admin pages
