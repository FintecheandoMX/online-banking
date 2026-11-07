/**
 * Mifos Self-Service Authentication API client.
 * Uses VITE_API_BASE_URL with fallback to the community endpoint.
 */
import type { AuthenticationFailure, CustomerIdentity } from "./authentication/client";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  authenticated: boolean;
  userId: number;
  username: string;
  officeId?: number | null;
  officeName?: string | null;
  roles: { id: number; name: string }[];
  permissions: string[];
  clients: number[];
  base64EncodedAuthenticationKey: string;
  shouldRenewPassword?: boolean;
  isTwoFactorAuthenticationRequired?: boolean;
}

export class AuthApiError extends Error {
  constructor(
    public readonly code: AuthenticationFailure,
    public readonly status: number,
  ) {
    super(code);
    this.name = "AuthApiError";
  }
}

const FALLBACK_API_BASE_URL = "https://apis.mifos.community/1.0/online/v1/self";
const TENANT_ID = "mifos-bank-1";

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.replace(/\/+$/, "");
  }
  return FALLBACK_API_BASE_URL;
}

function getAuthUrl(): string {
  return `${getApiBaseUrl()}/authentication`;
}

async function handleResponse<T>(response: Response): Promise<T> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status === 401) {
    throw new AuthApiError("invalidCredentials", 401);
  }

  if (response.status === 403) {
    throw new AuthApiError("denied", 403);
  }

  if (response.status === 408 || response.status === 429 || response.status >= 500) {
    throw new AuthApiError(
      response.status === 408 ? "timeout" : response.status === 429 ? "network" : "server",
      response.status,
    );
  }

  if (!response.ok) {
    throw new AuthApiError("server", response.status);
  }

  return data as T;
}

export async function login(
  credentials: LoginCredentials,
  signal?: AbortSignal,
): Promise<{ identity: CustomerIdentity; token: string; expiresAt: number }> {
  const { username, password } = credentials;

  if (!username.trim() || !password.trim()) {
    throw new AuthApiError("invalidCredentials", 400);
  }

  const response = await fetch(getAuthUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Fineract-Platform-TenantId": TENANT_ID,
      Accept: "application/json",
    },
    body: JSON.stringify({ username, password }),
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal,
  });

  const data = await handleResponse<LoginResponse>(response);

  if (data.authenticated !== true) {
    throw new AuthApiError("pending", response.status);
  }

  if (data.shouldRenewPassword === true) {
    throw new AuthApiError("passwordRenewal", response.status);
  }

  if (data.isTwoFactorAuthenticationRequired === true) {
    throw new AuthApiError("additional", response.status);
  }

  // Validate required fields
  if (
    typeof data.userId !== "number" ||
    !Number.isSafeInteger(data.userId) ||
    data.userId <= 0 ||
    typeof data.username !== "string" ||
    !data.username.trim() ||
    !Array.isArray(data.permissions) ||
    !data.permissions.every((p) => typeof p === "string" && p.trim()) ||
    !Array.isArray(data.roles) ||
    !data.roles.every(
      (r) => typeof r === "object" && r !== null && typeof r.id === "number" && typeof r.name === "string",
    ) ||
    (data.clients != null && (!Array.isArray(data.clients) || !data.clients.every((c) => typeof c === "number")))
  ) {
    throw new AuthApiError("malformed", response.status);
  }

  const identity: CustomerIdentity = {
    userId: data.userId,
    username: data.username,
    officeId: typeof data.officeId === "number" && data.officeId > 0 ? data.officeId : null,
    officeName: typeof data.officeName === "string" && data.officeName.trim() ? data.officeName : null,
    permissions: [...data.permissions],
    roles: data.roles.map((r) => ({ id: r.id, name: r.name })),
    clients: data.clients ? [...data.clients] : [],
  };

  // Validate base64 token
  const token = data.base64EncodedAuthenticationKey;
  if (typeof token !== "string" || !token.trim() || token.length > 2048) {
    throw new AuthApiError("malformed", response.status);
  }

  // 15 minutes session lifetime (matching existing auth client)
  const expiresAt = Date.now() + 15 * 60 * 1000;

  return { identity, token, expiresAt };
}

export function getTenantId(): string {
  return TENANT_ID;
}

export function getApiBaseUrlForDisplay(): string {
  return getApiBaseUrl();
}