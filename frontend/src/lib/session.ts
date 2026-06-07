import { apiFetch, type Profile, type User, type UserRole } from "./api";
import { getToken, setToken } from "./auth";

export type DemoLoginResponse = {
  accessToken: string;
  tokenType?: "Bearer";
  user: User;
};

export type Session = {
  token: string;
  user: User;
  profile: Profile;
};

export async function demoLogin(role: UserRole) {
  const response = await apiFetch<DemoLoginResponse>("/auth/demo-login", {
    method: "POST",
    json: { role },
  });

  setToken(response.accessToken);

  return response;
}

export function getMe(token: string) {
  return apiFetch<User>("/me", { token });
}

export function getMyProfile(token: string) {
  return apiFetch<Profile>("/me/profile", { token });
}

export async function loadSession(): Promise<Session | null> {
  const token = getToken();

  if (!token) {
    return null;
  }

  const [user, profile] = await Promise.all([
    getMe(token),
    getMyProfile(token),
  ]);

  return { token, user, profile };
}
