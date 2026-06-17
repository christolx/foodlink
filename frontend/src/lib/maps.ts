import type { Location, Pickup } from "./api";

const GOOGLE_DIRECTIONS_URL = "https://www.google.com/maps/dir/";

function hasCoordinates(location?: Location) {
  return (
    typeof location?.latitude === "number" &&
    typeof location.longitude === "number"
  );
}

function locationQuery(location?: Location) {
  if (!location) return null;
  if (hasCoordinates(location)) {
    return `${location.latitude},${location.longitude}`;
  }

  const address = [
    location.addressLine1,
    location.addressLine2,
    location.city,
    location.region,
    location.postalCode,
    location.country,
  ]
    .filter(Boolean)
    .join(", ");

  return address || null;
}

function directionsUrl({
  destination,
  waypoints = [],
}: {
  destination?: Location;
  waypoints?: Location[];
}) {
  const destinationQuery = locationQuery(destination);
  if (!destinationQuery) return null;

  const waypointQueries = waypoints
    .map((location) => locationQuery(location))
    .filter((value): value is string => !!value);
  const params = new URLSearchParams({
    api: "1",
    destination: destinationQuery,
    travelmode: "driving",
  });

  if (waypointQueries.length > 0) {
    params.set("waypoints", waypointQueries.join("|"));
  }

  return `${GOOGLE_DIRECTIONS_URL}?${params.toString()}`;
}

export function donationRouteUrl({
  pickupLocation,
  receiverLocation,
}: {
  pickupLocation?: Location;
  receiverLocation?: Location;
}) {
  if (receiverLocation) {
    return directionsUrl({
      destination: receiverLocation,
      waypoints: pickupLocation ? [pickupLocation] : [],
    });
  }

  return directionsUrl({ destination: pickupLocation });
}

export function pickupRouteUrl(pickup?: Pickup) {
  if (
    !pickup ||
    pickup.status === "delivered" ||
    pickup.status === "canceled"
  ) {
    return null;
  }

  if (pickup.status === "picked_up") {
    return directionsUrl({ destination: pickup.deliveryLocation });
  }

  return directionsUrl({
    destination: pickup.deliveryLocation,
    waypoints: [pickup.pickupLocation],
  });
}
