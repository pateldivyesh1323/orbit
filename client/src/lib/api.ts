import { getErrorMessage } from "@/lib/errors";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getApiUrl(path: string): string {
  const base = API_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiFetchOptions = RequestInit & {
  token?: string | null;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (rest.body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(getApiUrl(path), {
    ...rest,
    headers: requestHeaders,
  });

  const contentType = response.headers.get("content-type");
  let body: unknown = undefined;
  if (response.status !== 204) {
    const raw = await response.text();
    if (raw.length > 0) {
      body = contentType?.includes("application/json") ? JSON.parse(raw) : raw;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(body, response.statusText),
      response.status,
      body,
    );
  }

  return body as T;
}

export async function checkBackendHealth(): Promise<{ status: string; db: string }> {
  return apiFetch<{ status: string; db: string }>("/health");
}
