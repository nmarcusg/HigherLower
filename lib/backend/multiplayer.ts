import { io, type Socket } from "socket.io-client";

export interface RoomCredential {
  sessionId: string;
  roomCode: string;
  gameToken: string;
}

export interface MultiplayerSnapshot {
  sessionId: string;
  roomCode?: string;
  status?: string;
  phase?: string;
  mode?: string;
  rulesVersion?: string;
  hostActorId?: string;
  you?: { actorId?: string; nickname?: string; isHost?: boolean; role?: "PLAYER" | "SPECTATOR"; submitted?: boolean } | null;
  players?: Array<Record<string, unknown>>;
  capacity?: { minPlayers?: number; maxPlayers?: number; current?: number };
  settings?: Record<string, unknown>;
  serverNow?: number;
  stateVersion?: number;
  roundNumber?: number;
  totalRounds?: number;
  roundClosesAt?: number | null;
  matchEndsAt?: number | null;
  phaseEndsAt?: number | null;
  startsAt?: number;
  question?: {
    id?: string;
    roundNumber?: number;
    left?: { id?: string; name?: string; displayValue?: string; imageUrl?: string | null; attribution?: string };
    right?: { id?: string; name?: string; displayValue?: string; imageUrl?: string | null; attribution?: string };
    closesAt?: number;
    correctChoice?: "HIGHER" | "LOWER";
  } | null;
  standings?: Array<Record<string, unknown>> | null;
  roundResult?: Record<string, unknown> | null;
  readOnly?: boolean;
  answeredCount?: number;
}

export interface StoredRoomCredential extends RoomCredential {
  nickname?: string;
  entry?: "create" | "join" | "spectate";
  state?: MultiplayerSnapshot;
}

const STORAGE_KEY = "higher-lower:room-credential:v1";
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://higherorlower-api.onrender.com/api/v1").replace(/\/+$/, "");

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readRoomCredential(): StoredRoomCredential | null {
  try {
    // Prefer tab-local identity: two people testing or playing from separate
    // tabs must not overwrite one another's room token. Keep localStorage as a
    // recovery fallback for an accidentally closed tab.
    const raw = window.sessionStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || typeof parsed.sessionId !== "string" || typeof parsed.gameToken !== "string") return null;
    return {
      sessionId: parsed.sessionId,
      roomCode: typeof parsed.roomCode === "string" ? parsed.roomCode : "",
      gameToken: parsed.gameToken,
      nickname: typeof parsed.nickname === "string" ? parsed.nickname : undefined,
      entry: parsed.entry === "create" || parsed.entry === "join" || parsed.entry === "spectate" ? parsed.entry : undefined,
      state: isObject(parsed.state) && parsed.state.sessionId === parsed.sessionId
        ? parsed.state as unknown as MultiplayerSnapshot
        : undefined,
    };
  } catch {
    return null;
  }
}

export function storeRoomCredential(credential: StoredRoomCredential): void {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
}

export function clearRoomCredential(sessionId: string): void {
  const current = readRoomCredential();
  if (current?.sessionId === sessionId) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

async function roomRequest<T>(
  credential: RoomCredential,
  suffix: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/backend/rooms/${encodeURIComponent(credential.sessionId)}${suffix}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${credential.gameToken}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  let payload: unknown;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) {
    const message = isObject(payload) && typeof payload.message === "string" ? payload.message : `Room request failed (${response.status}).`;
    const error = new Error(message) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = isObject(payload) && typeof payload.code === "string" ? payload.code : undefined;
    throw error;
  }
  return payload as T;
}

export function getRoomState(credential: RoomCredential): Promise<MultiplayerSnapshot> {
  return roomRequest(credential, "", "GET");
}

export function getRoomResults(credential: RoomCredential): Promise<Record<string, unknown>> {
  return roomRequest(credential, "/results", "GET");
}

export function roomAction<T = MultiplayerSnapshot>(credential: RoomCredential, action: "start" | "leave" | "rematch" | "end"): Promise<T> {
  return roomRequest(credential, `/${action}`, "POST");
}

export async function createSpectatorCredential(code: string, nickname: string): Promise<{ sessionId: string; roomCode: string; gameToken: string; state: MultiplayerSnapshot }> {
  const response = await fetch("/api/backend/rooms/spectate", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ code, nickname }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isObject(payload)) {
    const message = isObject(payload) && typeof payload.message === "string" ? payload.message : `Could not join as spectator (${response.status}).`;
    throw new Error(message);
  }
  return payload as unknown as { sessionId: string; roomCode: string; gameToken: string; state: MultiplayerSnapshot };
}

export function connectRoom(credential: RoomCredential): Socket {
  const apiBase = new URL(API_BASE);
  const socketOrigin = `${apiBase.protocol}//${apiBase.host}`;
  return io(socketOrigin, {
    path: "/socket.io",
    auth: { sessionId: credential.sessionId, gameToken: credential.gameToken },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 8_000,
    timeout: 20_000,
  });
}

export function roomCredentialStorageKey(): string { return STORAGE_KEY; }
