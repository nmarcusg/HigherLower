import {
  BackendApiError,
  type CategoryPage,
  type CategorySummary,
  type CreateRoomRequest,
  type JoinRoomRequest,
  type PublicPlaysetDetail,
  type PublicPlaysetPage,
  type PublicPlaysetSummary,
  type PublicPlaysetItem,
  type CreateSoloSessionResponse,
  type SoloAnswerReceipt,
  type SoloChoice,
  type SoloMode,
  type SoloResults,
  type SoloSessionState,
  type RoomCredentialResponse,
} from "./types";

const DEPLOYED_API_BASE_URL = "https://higherorlower-api.onrender.com/api/v1";
const CATEGORIES_REQUEST_TIMEOUT_MS = 15_000;

/** The handoff documents the deployed endpoint; local API URLs are caller-configured. */
import { getDeviceId } from "@/lib/device";

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

function isSoloPublicItem(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && isString(value.name) &&
    isNullableString(value.imageUrl) &&
    (value.attribution === undefined || isNullableString(value.attribution)) &&
    (value.displayValue === undefined || isString(value.displayValue));
}

function isSoloSessionState(value: unknown): value is SoloSessionState {
  return isRecord(value) && isString(value.sessionId) &&
    (value.questionId === null || isString(value.questionId)) &&
    Number.isInteger(value.stateVersion) && Number.isInteger(value.serverNow) &&
    ["AWAITING_ANSWER", "REVEAL", "FINISHED", "CANCELLED"].includes(String(value.phase)) &&
    ["RUNNING", "FINALIZING", "FINISHED", "CANCELLED"].includes(String(value.status)) &&
    ["CLASSIC", "TIME_ATTACK"].includes(String(value.mode)) && Number.isInteger(value.score) &&
    (value.expiresAt === null || Number.isInteger(value.expiresAt)) &&
    (value.revealEndsAt === null || Number.isInteger(value.revealEndsAt)) &&
    typeof value.revealed === "boolean" &&
    (value.left === null || isSoloPublicItem(value.left)) &&
    (value.right === null || isSoloPublicItem(value.right)) &&
    (value.runtimeStatus === undefined || ["RUNNING", "FINALIZING", "FINISHED", "CANCELLED"].includes(String(value.runtimeStatus)));
}

function parseSoloState(value: unknown): SoloSessionState {
  if (!isSoloSessionState(value)) {
    throw new BackendApiError("The API returned an invalid game state.", null);
  }
  return {
    ...value,
    // Create-session emits the initial public state before it has a separate
    // runtime status field. Later reads include it. In both cases `status` is
    // the authoritative equivalent for the UI.
    runtimeStatus: (value.runtimeStatus ?? value.status) as SoloSessionState["runtimeStatus"],
  } as SoloSessionState;
}

function parseCreateSoloSession(value: unknown): CreateSoloSessionResponse {
  if (!isRecord(value) || !isString(value.sessionId) || !isString(value.gameToken) ||
    !parseSoloState(value.state)) {
    throw new BackendApiError("The API returned an invalid new game response.", null);
  }
  return { sessionId: value.sessionId, gameToken: value.gameToken, state: value.state as SoloSessionState };
}

function parseSoloAnswer(value: unknown): SoloAnswerReceipt {
  if (!isRecord(value) || !isString(value.questionId) || !isString(value.requestId) ||
    !["HIGHER", "LOWER"].includes(String(value.choice)) || typeof value.correct !== "boolean" ||
    !["HIGHER", "LOWER"].includes(String(value.correctChoice)) || !Number.isInteger(value.score) ||
    !["AWAITING_ANSWER", "REVEAL", "FINISHED", "CANCELLED"].includes(String(value.phase)) ||
    !["RUNNING", "FINALIZING", "FINISHED", "CANCELLED"].includes(String(value.status)) ||
    typeof value.eliminated !== "boolean" || !Number.isInteger(value.stateVersion) ||
    !Number.isInteger(value.serverNow) || (value.expiresAt !== null && !Number.isInteger(value.expiresAt)) ||
    (value.revealEndsAt !== null && !Number.isInteger(value.revealEndsAt)) ||
    !isSoloPublicItem(value.left) || !isSoloPublicItem(value.right) ||
    !["RUNNING", "FINALIZING", "FINISHED", "CANCELLED"].includes(String(value.runtimeStatus))) {
    throw new BackendApiError("The API returned an invalid answer receipt.", null);
  }
  return value as unknown as SoloAnswerReceipt;
}

function parseSoloResults(value: unknown): SoloResults {
  if (!isRecord(value) || !isString(value.sessionId) ||
    !["RUNNING", "FINALIZING", "FINISHED", "CANCELLED"].includes(String(value.status)) ||
    !Number.isInteger(value.score) || typeof value.eliminated !== "boolean" ||
    !isNullableString(value.finishedAt) || !["CLASSIC", "TIME_ATTACK"].includes(String(value.mode))) {
    throw new BackendApiError("The API returned invalid game results.", null);
  }
  return value as unknown as SoloResults;
}

function isPublicPlaysetSummary(value: unknown): value is PublicPlaysetSummary {
  return isRecord(value) && isString(value.id) && isString(value.title) &&
    isString(value.description) && isString(value.metricName) &&
    isString(value.metricUnit) && Number.isInteger(value.itemCount) &&
    Number.isInteger(value.revision);
}

function isPublicPlaysetItem(value: unknown): value is PublicPlaysetItem {
  return isRecord(value) && isString(value.id) && isString(value.name) &&
    isNullableString(value.imageUrl) && isString(value.sourceLabel) &&
    (value.sourceYear === null || Number.isInteger(value.sourceYear));
}

function parsePublicPlaysetPage(value: unknown): PublicPlaysetPage {
  if (!isRecord(value) || !Number.isInteger(value.total) || !Number.isInteger(value.limit) ||
    !Number.isInteger(value.offset) || !Array.isArray(value.playsets) ||
    !value.playsets.every(isPublicPlaysetSummary)) {
    throw new BackendApiError("The API returned an invalid playsets response.", null);
  }
  return {
    total: value.total as number,
    limit: value.limit as number,
    offset: value.offset as number,
    playsets: value.playsets,
  };
}

function parsePublicPlaysetDetail(value: unknown): PublicPlaysetDetail {
  if (!isPublicPlaysetSummary(value) || !isRecord(value) || !Array.isArray(value.items) ||
    !value.items.every(isPublicPlaysetItem)) {
    throw new BackendApiError("The API returned an invalid playset response.", null);
  }
  return { ...value, items: value.items };
}

async function request<T>(path: string, init: RequestInit, parse: (body: unknown) => T): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    const url = path.startsWith("/api/backend/") ? path : `${getApiBaseUrl()}${path}`;
    response = await fetch(url, {
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
  const timeoutSignal = AbortSignal.timeout(CATEGORIES_REQUEST_TIMEOUT_MS);
  const signal = options?.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;
  // Browser requests go through a same-origin Next route because the hosted API
  // CORS allowlist may not yet include this Vercel project's generated domain.
  // Server-rendered pages call the API directly and retain their local fallback.
  const path = typeof window === "undefined" ? "/categories" : "/api/backend/categories";
  return request(path, { method: "GET", cache: "no-store", signal }, parseCategoryPage);
}

function soloPath(sessionId?: string, suffix = ""): string {
  const base = typeof window === "undefined" ? "/sessions" : "/api/backend/sessions";
  if (!sessionId) return base;
  return `${base}/${encodeURIComponent(sessionId)}${suffix}`;
}

function gameTokenHeaders(gameToken: string): HeadersInit {
  return { Authorization: `Bearer ${gameToken}` };
}

export function createSoloSession(input: { playsetId: string; mode: SoloMode }): Promise<CreateSoloSessionResponse> {
  return request(soloPath(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  }, parseCreateSoloSession);
}

export function getSoloSession(sessionId: string, gameToken: string): Promise<SoloSessionState> {
  return request(soloPath(sessionId), {
    method: "GET",
    headers: gameTokenHeaders(gameToken),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }, parseSoloState);
}

export function answerSoloQuestion(input: {
  sessionId: string;
  gameToken: string;
  questionId: string;
  choice: SoloChoice;
  requestId: string;
}): Promise<SoloAnswerReceipt> {
  return request(soloPath(input.sessionId, "/answers"), {
    method: "POST",
    headers: { ...gameTokenHeaders(input.gameToken), "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: input.questionId, choice: input.choice, requestId: input.requestId }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }, parseSoloAnswer);
}

export function endSoloSession(sessionId: string, gameToken: string): Promise<SoloSessionState> {
  return request(soloPath(sessionId, "/end"), {
    method: "POST",
    headers: gameTokenHeaders(gameToken),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }, parseSoloState);
}

export function getSoloResults(sessionId: string, gameToken: string): Promise<SoloResults> {
  return request(soloPath(sessionId, "/results"), {
    method: "GET",
    headers: gameTokenHeaders(gameToken),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }, parseSoloResults);
}

export function fetchPublicPlaysets(options: { limit?: number; offset?: number; signal?: AbortSignal } = {}): Promise<PublicPlaysetPage> {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  const query = params.size ? `?${params.toString()}` : "";
  const base = typeof window === "undefined" ? "/playsets" : "/api/backend/playsets";
  return request(`${base}${query}`, { method: "GET", cache: "no-store", signal: options.signal }, parsePublicPlaysetPage);
}

export function fetchPublicPlayset(id: string, options: { signal?: AbortSignal } = {}): Promise<PublicPlaysetDetail> {
  const normalizedId = id.trim();
  if (!normalizedId || normalizedId.length > 100) {
    throw new BackendApiError("Enter a valid playset ID.", null);
  }
  const base = typeof window === "undefined" ? "/playsets" : "/api/backend/playsets";
  return request(`${base}/${encodeURIComponent(normalizedId)}`, { method: "GET", cache: "no-store", signal: options.signal }, parsePublicPlaysetDetail);
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
    typeof window === "undefined" ? "/rooms" : "/api/backend/rooms",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, playsetId: input.playsetId.trim(), nickname, deviceId: getDeviceId() }),
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
    typeof window === "undefined" ? "/rooms/join" : "/api/backend/rooms/join",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, nickname, deviceId: getDeviceId() }),
    },
    parseRoomCredential,
  );
}
