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
