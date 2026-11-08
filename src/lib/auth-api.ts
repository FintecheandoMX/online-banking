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

// Client Information Types
export interface ClientStatus {
  id: number;
  code: string;
  value: string;
}

export interface ClientSubStatus {
  active: boolean;
  mandatory: boolean;
}

export interface TimelineDate {
  year: number;
  month: number;
  day: number;
}

export interface Timeline {
  submittedOnDate: TimelineDate;
  submittedByUsername: string;
  submittedByFirstname: string;
  submittedByLastname: string;
  activatedOnDate: TimelineDate;
  activatedByUsername: string;
  activatedByFirstname: string;
  activatedByLastname: string;
}

export interface LegalForm {
  id: number;
  code: string;
  value: string;
}

export interface ClientNonPersonDetails {
  constitution: Record<string, unknown>;
  mainBusinessLine: Record<string, unknown>;
}

export interface ClientInfo {
  id: number;
  accountNo: string;
  externalId: string;
  status: ClientStatus;
  subStatus: ClientSubStatus;
  active: boolean;
  activationDate: TimelineDate;
  firstname: string;
  middlename: string;
  lastname: string;
  displayName: string;
  mobileNo: string;
  emailAddress: string;
  gender: Record<string, unknown>;
  clientType: Record<string, unknown>;
  clientClassification: Record<string, unknown>;
  isStaff: boolean;
  officeId: number;
  officeName: string;
  timeline: Timeline;
  legalForm: LegalForm;
  clientNonPersonDetails: ClientNonPersonDetails;
}

export interface ClientsResponse {
  totalFilteredRecords: number;
  pageItems: ClientInfo[];
}

// Account Types
export interface AccountStatus {
  id: number;
  code: string;
  value: string;
  pendingApproval?: boolean;
  waitingForDisbursal?: boolean;
  active: boolean;
  closedObligationsMet?: boolean;
  closedWrittenOff?: boolean;
  closedRescheduled?: boolean;
  closed?: boolean;
  overpaid?: boolean;
  submittedAndPendingApproval?: boolean;
  approved?: boolean;
  rejected?: boolean;
  withdrawnByApplicant?: boolean;
  prematureClosed?: boolean;
  transferInProgress?: boolean;
  transferOnHold?: boolean;
  matured?: boolean;
}

export interface Currency {
  code: string;
  name: string;
  decimalPlaces: number;
  inMultiplesOf?: number;
  displaySymbol: string;
  nameCode: string;
  displayLabel: string;
}

export interface AccountTimeline {
  submittedOnDate: number[];
  submittedByUsername: string;
  submittedByFirstname: string;
  submittedByLastname: string;
  approvedOnDate?: number[];
  approvedByUsername?: string;
  approvedByFirstname?: string;
  approvedByLastname?: string;
  expectedDisbursementDate?: number[];
  actualDisbursementDate?: number[];
  disbursedByUsername?: string;
  disbursedByFirstname?: string;
  disbursedByLastname?: string;
  withdrawnOnDate?: number[];
  withdrawnByUsername?: string;
  withdrawnByFirstname?: string;
  withdrawnByLastname?: string;
  closedOnDate?: number[];
  closedByUsername?: string;
  closedByFirstname?: string;
  closedByLastname?: string;
  actualMaturityDate?: number[];
  expectedMaturityDate?: number[];
  chargedOffOnDate?: number[];
  chargedOffByUsername?: string;
  chargedOffByFirstname?: string;
  chargedOffByLastname?: string;
  writeOffByUsername?: string;
  writeOffByFirstname?: string;
  writeOffByLastname?: string;
}

export interface LoanAccount {
  id: number;
  accountNo: string;
  productId: number;
  productName: string;
  shortProductName: string;
  status: AccountStatus;
  currency: Currency;
  loanType: {
    id: number;
    code: string;
    value: string;
  };
  loanCycle?: number;
  timeline: AccountTimeline;
  inArrears: boolean;
  originalLoan?: number;
  loanBalance?: number;
  amountPaid?: number;
}

export interface SavingsAccount {
  id: number;
  accountNo: string;
  productId: number;
  productName: string;
  shortProductName: string;
  status: AccountStatus;
  currency: Currency;
  accountType: {
    id: number;
    code: string;
    value: string;
  };
  timeline: AccountTimeline;
  subStatus: {
    id: number;
    code: string;
    value: string;
    none?: boolean;
    inactive?: boolean;
    dormant?: boolean;
    escheat?: boolean;
    block?: boolean;
    blockCredit?: boolean;
    blockDebit?: boolean;
  };
  depositType?: {
    id: number;
    code: string;
    value: string;
  };
}

export interface AccountsResponse {
  loanAccounts: LoanAccount[];
  groupLoanIndividualMonitoringAccounts: unknown[];
  savingsAccounts: SavingsAccount[];
  guarantorAccounts: unknown[];
  workingCapitalLoanAccounts: unknown[];
}

export interface DisplayAccount {
  id: string;
  name: string;
  number: string;
  balance: number;
  type: "loan" | "savings";
  status: string;
  currency: Currency;
  rawAccount: LoanAccount | SavingsAccount;
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

function getClientsUrl(): string {
  return `${getApiBaseUrl()}/clients`;
}

function getAccountsUrl(clientId: number): string {
  return `${getApiBaseUrl()}/clients/${clientId}/accounts`;
}

function getSavingsBalanceUrl(accountId: number): string {
  return `${getApiBaseUrl()}/savingsaccounts/${accountId}`;
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

export async function fetchClientInfo(
  authToken: string,
  signal?: AbortSignal,
): Promise<ClientsResponse> {
  const response = await fetch(getClientsUrl(), {
    method: "GET",
    headers: {
      "Fineract-Platform-TenantId": TENANT_ID,
      Authorization: `Basic ${authToken}`,
      Accept: "application/json",
    },
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal,
  });

  return handleResponse<ClientsResponse>(response);
}

export async function fetchClientAccounts(
  clientId: number,
  authToken: string,
  signal?: AbortSignal,
): Promise<AccountsResponse> {
  const response = await fetch(getAccountsUrl(clientId), {
    method: "GET",
    headers: {
      "Fineract-Platform-TenantId": TENANT_ID,
      Authorization: `Basic ${authToken}`,
      Accept: "application/json",
    },
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal,
  });

  return handleResponse<AccountsResponse>(response);
}

export async function fetchSavingsAccountBalance(
  accountId: number,
  authToken: string,
  signal?: AbortSignal,
): Promise<{ accountBalance: number }> {
  const response = await fetch(getSavingsBalanceUrl(accountId), {
    method: "GET",
    headers: {
      "Fineract-Platform-TenantId": TENANT_ID,
      Authorization: `Basic ${authToken}`,
      Accept: "application/json",
    },
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal,
  });

  const data = await handleResponse<{
    summary?: { accountBalance?: number };
  }>(response);

  // The balance is in the summary.accountBalance field, in main currency units (pesos)
  // Convert to centavos for the demo system (money() divides by 100)
  const balanceInPesos = data.summary?.accountBalance ?? 0;
  const balanceInCentavos = Math.round(balanceInPesos * 100);

  return { accountBalance: balanceInCentavos };
}

export function getTenantId(): string {
  return TENANT_ID;
}

export function getApiBaseUrlForDisplay(): string {
  return getApiBaseUrl();
}