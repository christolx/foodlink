import type {
  DeliveryProposal,
  Donation,
  Location,
  Pickup,
  Profile,
} from "@/lib/api";

export type DashboardFilters = {
  donationStatus: "all" | Donation["status"];
  proposalStatus: "all" | DeliveryProposal["status"];
  requireCoordinates: boolean;
};

export type DashboardSettings = {
  notifPickup: boolean;
  notifProposal: boolean;
  notifDelivery: boolean;
  compactMode: boolean;
};

export const defaultDashboardFilters: DashboardFilters = {
  donationStatus: "all",
  proposalStatus: "all",
  requireCoordinates: false,
};

export const defaultDashboardSettings: DashboardSettings = {
  notifPickup: true,
  notifProposal: true,
  notifDelivery: false,
  compactMode: false,
};

const settingsStorageKey = "foodlink-dashboard-settings";

export function activeFilterCount(filters: DashboardFilters) {
  return [
    filters.donationStatus !== "all",
    filters.proposalStatus !== "all",
    filters.requireCoordinates,
  ].filter(Boolean).length;
}

export function loadDashboardSettings(): DashboardSettings {
  if (typeof window === "undefined") {
    return defaultDashboardSettings;
  }

  try {
    const raw = window.localStorage.getItem(settingsStorageKey);
    if (!raw) {
      return defaultDashboardSettings;
    }

    return {
      ...defaultDashboardSettings,
      ...(JSON.parse(raw) as Partial<DashboardSettings>),
    };
  } catch {
    return defaultDashboardSettings;
  }
}

export function saveDashboardSettings(settings: DashboardSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
}

export function locationLabel(location?: Location) {
  return [location?.addressLine1, location?.city, location?.region]
    .filter(Boolean)
    .join(", ");
}

export function hasCoordinates(location?: Location) {
  return (
    typeof location?.latitude === "number" &&
    typeof location?.longitude === "number"
  );
}

export function approximateDistanceKm(from?: Location, to?: Location) {
  if (!from || !to || !hasCoordinates(from) || !hasCoordinates(to)) {
    return null;
  }

  const fromLatitude = from.latitude ?? 0;
  const fromLongitude = from.longitude ?? 0;
  const toLatitude = to.latitude ?? 0;
  const toLongitude = to.longitude ?? 0;
  const earthRadiusKm = 6371;
  const fromLat = toRadians(fromLatitude);
  const toLat = toRadians(toLatitude);
  const deltaLat = toRadians(toLatitude - fromLatitude);
  const deltaLng = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatApproxDistance(distanceKm: number | null) {
  return distanceKm === null
    ? "Location unavailable"
    : `${distanceKm.toFixed(1)} km`;
}

export function greetingForNow(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export function contactMethodLabel(value?: string) {
  if (!value) return "Contact unavailable";
  if (value === "whatsapp") return "WhatsApp";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function matchesDonationQuery(
  donation: Donation | undefined,
  query: string,
) {
  if (!query.trim()) return true;
  const haystack = [
    donation?.title,
    donation?.description,
    donation?.quantity,
    donation?.status,
    locationLabel(donation?.pickupLocation),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

export function matchesProfileQuery(
  profile: Profile | undefined,
  query: string,
) {
  if (!query.trim()) return true;
  const haystack = [
    profile?.displayName,
    profile?.entityType,
    profile?.contactMethod,
    profile?.notes,
    locationLabel(profile?.location),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

export function matchesProposalQuery(
  proposal: DeliveryProposal,
  donation: Donation | undefined,
  query: string,
) {
  if (!query.trim()) return true;

  return [
    matchesDonationQuery(donation, query),
    matchesProfileQuery(proposal.donorProfile, query),
    matchesProfileQuery(proposal.receiverProfile, query),
    matchesProfileQuery(proposal.volunteerProfile, query),
    proposal.status.toLowerCase().includes(query.trim().toLowerCase()),
  ].some(Boolean);
}

export function matchesPickupQuery(pickup: Pickup, query: string) {
  if (!query.trim()) return true;

  return [
    matchesDonationQuery(pickup.donation, query),
    matchesProfileQuery(pickup.donorProfile, query),
    matchesProfileQuery(pickup.receiverProfile, query),
    matchesProfileQuery(pickup.volunteerProfile, query),
    pickup.status.toLowerCase().includes(query.trim().toLowerCase()),
    locationLabel(pickup.pickupLocation),
    locationLabel(pickup.deliveryLocation),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query.trim().toLowerCase());
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
