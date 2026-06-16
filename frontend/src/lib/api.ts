const API_PREFIX = "/api/v1";

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  json?: unknown;
  token?: string | null;
};

export type UserRole = "donor" | "receiver" | "volunteer";

export type ContactMethod =
  | "whatsapp"
  | "instagram"
  | "phone"
  | "email"
  | "other";

export type EntityType =
  | "charity"
  | "orphanage"
  | "shelter"
  | "family"
  | "restaurant"
  | "warteg"
  | "individual"
  | "other";

export type DonationStatus =
  | "available"
  | "proposal_pending"
  | "pickup_assigned"
  | "picked_up"
  | "delivered"
  | "canceled";

export type ProposalStatus = "pending" | "accepted" | "rejected" | "canceled";

export type PickupStatus = "assigned" | "picked_up" | "delivered" | "canceled";

export type NotificationType =
  | "donation_created"
  | "proposal_created"
  | "proposal_accepted"
  | "proposal_rejected"
  | "pickup_assigned"
  | "pickup_completed";

export type Location = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
};

export type Profile = {
  userId: string;
  displayName: string;
  role: UserRole;
  contactMethod: ContactMethod;
  contactValue: string;
  location: Location;
  entityType?: EntityType;
  operationalHours?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Donation = {
  id: string;
  donorId: string;
  title: string;
  description: string;
  quantity: string;
  imageUrl: string;
  status: DonationStatus;
  pickupLocation: Location;
  availableFrom: string;
  availableUntil: string;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryProposal = {
  id: string;
  donationId: string;
  receiverId: string;
  volunteerId: string;
  status: ProposalStatus;
  volunteerContactOverride?: string;
  donorAcceptedAt?: string;
  receiverAcceptedAt?: string;
  rejectedByUserId?: string;
  donation?: Donation;
  donorProfile?: Profile;
  receiverProfile?: Profile;
  volunteerProfile?: Profile;
  createdAt: string;
  updatedAt: string;
};

export type Pickup = {
  id: string;
  donationId: string;
  proposalId: string;
  receiverId: string;
  volunteerId: string;
  status: PickupStatus;
  pickupLocation: Location;
  deliveryLocation: Location;
  pickedUpAt?: string;
  deliveredAt?: string;
  donation?: Donation;
  donorProfile?: Profile;
  receiverProfile?: Profile;
  volunteerProfile?: Profile;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  donationId?: string;
  proposalId?: string;
  pickupId?: string;
  createdAt: string;
  readAt?: string;
};

export type Conversation = {
  id: string;
  otherUser: {
    id: string;
    displayName: string;
    role: UserRole | "unknown";
  };
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type CreateDonationRequest = {
  title: string;
  description: string;
  quantity: string;
  imageUrl: string;
  pickupLocation: Location;
  availableFrom: string;
  availableUntil: string;
  specialInstructions?: string;
};

export type CreateDeliveryProposalRequest = {
  donationId: string;
  receiverId: string;
  volunteerContactOverride?: string;
};

export type UpdateProfileRequest = {
  displayName: string;
  contactMethod: ContactMethod;
  contactValue: string;
  location: Location;
  entityType?: EntityType;
  operationalHours?: string;
  notes?: string;
};

export type DeliveryProposalAcceptResponse = {
  proposal: DeliveryProposal;
  pickup?: Pickup;
};

export type PageResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ErrorResponse = {
  code: string;
  message: string;
};

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, error: ErrorResponse) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  { json, token, headers, ...init }: ApiFetchOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers);

  if (json !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    body: json === undefined ? undefined : JSON.stringify(json),
    headers: requestHeaders,
  });
  const data = await readJSON(response);

  if (!response.ok) {
    throw new ApiError(response.status, normalizeError(data));
  }

  return data as T;
}

export function listDonations(token: string) {
  return apiFetch<PageResponse<Donation>>("/donations", { token });
}

export function createDonation(token: string, json: CreateDonationRequest) {
  return apiFetch<Donation>("/donations", {
    method: "POST",
    json,
    token,
  });
}

export function listReceivers(token: string) {
  return apiFetch<PageResponse<Profile>>("/receivers", { token });
}

export function listDeliveryProposals(token: string) {
  return apiFetch<PageResponse<DeliveryProposal>>("/delivery-proposals", {
    token,
  });
}

export function listPickups(token: string) {
  return apiFetch<PageResponse<Pickup>>("/pickups", { token });
}

export function createDeliveryProposal(
  token: string,
  json: CreateDeliveryProposalRequest,
) {
  return apiFetch<DeliveryProposal>("/delivery-proposals", {
    method: "POST",
    json,
    token,
  });
}

export function acceptDeliveryProposal(token: string, id: string) {
  return apiFetch<DeliveryProposalAcceptResponse>(
    `/delivery-proposals/${id}/accept`,
    {
      method: "POST",
      token,
    },
  );
}

export function rejectDeliveryProposal(token: string, id: string) {
  return apiFetch<DeliveryProposal>(`/delivery-proposals/${id}/reject`, {
    method: "POST",
    token,
  });
}

export function markPickupPickedUp(token: string, id: string) {
  return apiFetch<Pickup>(`/pickups/${id}/pickup`, {
    method: "POST",
    json: {},
    token,
  });
}

export function markPickupDelivered(token: string, id: string) {
  return apiFetch<Pickup>(`/pickups/${id}/deliver`, {
    method: "POST",
    json: {},
    token,
  });
}

export function listNotifications(token: string) {
  return apiFetch<PageResponse<Notification>>("/notifications", { token });
}

export function markNotificationRead(token: string, id: string) {
  return apiFetch<Notification>(`/notifications/${id}/read`, {
    method: "POST",
    token,
  });
}

export function updateMyProfile(token: string, json: UpdateProfileRequest) {
  return apiFetch<Profile>("/me/profile", {
    method: "PUT",
    json,
    token,
  });
}

export function getOrCreateConversation(token: string, otherUserId: string) {
  return apiFetch<Conversation>("/chat/conversations", {
    method: "POST",
    json: { otherUserId },
    token,
  });
}

export function listConversations(token: string) {
  return apiFetch<Conversation[]>("/chat/conversations", { token });
}

export function listChatMessages(token: string, conversationId: string) {
  return apiFetch<ChatMessage[]>(
    `/chat/conversations/${conversationId}/messages`,
    { token },
  );
}

export function sendChatMessage(
  token: string,
  conversationId: string,
  body: string,
) {
  return apiFetch<ChatMessage>(
    `/chat/conversations/${conversationId}/messages`,
    {
      method: "POST",
      json: { body },
      token,
    },
  );
}

export function chatEventsUrl(conversationId: string, token: string) {
  return apiUrl(
    `/chat/conversations/${conversationId}/events?token=${encodeURIComponent(token)}`,
  );
}

function apiUrl(path: string) {
  const baseURL =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const prefixedPath = normalizedPath.startsWith(API_PREFIX)
    ? normalizedPath
    : `${API_PREFIX}${normalizedPath}`;

  return `${baseURL}${prefixedPath}`;
}

async function readJSON(response: Response) {
  const text = await response.text();

  if (text === "") {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function normalizeError(data: unknown): ErrorResponse {
  if (
    data !== null &&
    typeof data === "object" &&
    "code" in data &&
    "message" in data &&
    typeof data.code === "string" &&
    typeof data.message === "string"
  ) {
    return {
      code: data.code,
      message: data.message,
    };
  }

  return {
    code: "request_failed",
    message: "Request failed.",
  };
}
