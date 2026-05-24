import { apiFetch, ApiError, getApiUrl } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { AuthUser, RegisterPayload, TokenResponse } from "@/types/auth";

export async function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    username: email,
    password,
  });

  const response = await fetch(getApiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const contentType = response.headers.get("content-type");
  const data =
    contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(data, response.statusText),
      response.status,
      data,
    );
  }

  return data as TokenResponse;
}

export async function register(
  payload: RegisterPayload,
): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAuthUser(token: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/me", { token });
}
