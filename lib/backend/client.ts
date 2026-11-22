import {
  BackendApiError,
  type CategoryPage,
  type CategorySummary,
  type CreateRoomRequest,
  type JoinRoomRequest,
  type RoomCredentialResponse,
} from "./types";

const DEPLOYED_API_BASE_URL = "https://higherorlower-api.onrender.com/api/v1";

/** The handoff documents the deployed endpoint; local API URLs are caller-configured. */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const baseUrl = configured || DEPLOYED_API_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isCategorySummary(value: unknown): value is CategorySummary {
  if (!isRecord(value) || !isRecord(value.metric) || !isRecord(value.provider)) return false;
  if (!isRecord(value.provenance) || !isRecord(value.freshness)) return false;

  return (
    isString(value.id) &&
    isString(value.title) &&
    isString(value.description) &&
    ["MOVIE_SERIES", "GAMING", "SOCIAL_MEDIA", "MUSIC"].includes(String(value.domain)) &&
    ["RATING", "COUNT", "CURRENCY", "CHRONOLOGY"].includes(String(value.valueKind)) &&
    isString(value.metric.name) &&
    isString(value.metric.unit) &&
    isString(value.provider.key) &&
    isString(value.provider.metric) &&
    isNullableString(value.provider.url) &&
    isString(value.provenance.label) &&
    isNullableString(value.provenance.sourceUrl) &&
    ["SUPPORTED", "DEGRADED", "UNAVAILABLE"].includes(String(value.availability)) &&
    isNullableString(value.unavailableReason) &&
    isNullableString(value.freshness.lastRefreshedAt) &&
    ["NEVER", "SUCCEEDED", "FAILED"].includes(String(value.freshness.lastRefreshStatus)) &&
    typeof value.playable === "boolean" &&
    isNullableString(value.playsetId) &&
    typeof value.itemCount === "number" &&
    Number.isInteger(value.itemCount) &&
    typeof value.synthetic === "boolean"
  );
}

function parseCategoryPage(value: unknown): CategoryPage {
  if (
    !isRecord(value) ||
    typeof value.total !== "number" ||
    !Array.isArray(value.categories) ||
    !value.categories.every(isCategorySummary)
  ) {
    throw new BackendApiError("The API returned an invalid categories response.", null);
  }
  return { total: value.total, categories: value.categories };
}

function parseRoomCredential(value: unknown): RoomCredentialResponse {
  if (
    !isRecord(value) ||
    !isString(value.sessionId) ||
    !isString(value.roomCode) ||
    !isString(value.gameToken) ||
    !isRecord(value.state)
  ) {
    throw new BackendApiError("The API returned an invalid room credential response.", null);
  }
  return {
    sessionId: value.sessionId,
    roomCode: value.roomCode,
    gameToken: value.gameToken,
    state: value.state,
  };
}

async function request<T>(path: string, init: RequestInit, parse: (body: unknown) => T): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new BackendApiError("Could not reach the game service. Please try again.", null);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new BackendApiError("The game service returned an unreadable response.", response.status);
  }

  if (!response.ok) {
    const error = isRecord(body) ? body : {};
    throw new BackendApiError(
      isString(error.message) ? error.message : `The game service returned HTTP ${response.status}.`,
      response.status,
      isString(error.code) ? error.code : undefined,
      isString(error.requestId) ? error.requestId : undefined,
    );
  }

  return parse(body);
}

export function fetchCategories(options?: { signal?: AbortSignal }): Promise<CategoryPage> {
  return request("/categories", { method: "GET", cache: "no-store", signal: options?.signal }, parseCategoryPage);
}

function validateNickname(nickname: string): string {
  const normalized = nickname.trim();
  if (normalized.length < 1 || normalized.length > 24) {
    throw new BackendApiError("Nickname must be between 1 and 24 characters.", null);
  }
  return normalized;
}

export function createRoom(input: CreateRoomRequest): Promise<RoomCredentialResponse> {
  const nickname = validateNickname(input.nickname);
  if (!input.playsetId.trim()) throw new BackendApiError("Choose a valid playset.", null);

  return request(
    "/rooms",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, playsetId: input.playsetId.trim(), nickname }),
    },
    parseRoomCredential,
  );
}

export function joinRoom(input: JoinRoomRequest): Promise<RoomCredentialResponse> {
  const nickname = validateNickname(input.nickname);
  const code = input.code.trim().toUpperCase();
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)) {
    throw new BackendApiError("Enter a valid six-character room code.", null);
  }

  return request(
    "/rooms/join",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, nickname }),
    },
    parseRoomCredential,
  );
}
