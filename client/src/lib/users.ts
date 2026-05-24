import { apiFetch } from "@/lib/api";
import type { UserProfile, UserProfileUpdate } from "@/types/user";

export function getUserProfile(token: string): Promise<UserProfile> {
  return apiFetch<UserProfile>("/api/users/me", { token });
}

export function updateUserProfile(
  token: string,
  payload: UserProfileUpdate,
): Promise<UserProfile> {
  return apiFetch<UserProfile>("/api/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}
