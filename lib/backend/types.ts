export type CategoryDomain = "MOVIE_SERIES" | "GAMING" | "SOCIAL_MEDIA" | "MUSIC";
export type CategoryValueKind = "RATING" | "COUNT" | "CURRENCY" | "CHRONOLOGY";
export type CategoryAvailability = "SUPPORTED" | "DEGRADED" | "UNAVAILABLE";
export type RoomMode =
  | "PVP_SPEED"
  | "PVP_SCORE_RACE"
  | "PVP_SPEED_STREAK"
  | "PVP_SPEED_HP";

export interface CategorySummary {
  id: string;
  title: string;
  description: string;
  domain: CategoryDomain;
  valueKind: CategoryValueKind;
  metric: { name: string; unit: string };
  provider: { key: string; metric: string; url: string | null };
  provenance: { label: string; sourceUrl: string | null };
  availability: CategoryAvailability;
  unavailableReason: string | null;
  freshness: {
    lastRefreshedAt: string | null;
    lastRefreshStatus: "NEVER" | "SUCCEEDED" | "FAILED";
  };
  playable: boolean;
  playsetId: string | null;
  itemCount: number;
  synthetic: boolean;
}

export interface CategoryPage {
  total: number;
  categories: CategorySummary[];
}

export interface RoomCredentialResponse {
  sessionId: string;
  roomCode: string;
  gameToken: string;
  state: Record<string, unknown>;
}

export interface CreateRoomRequest {
  playsetId: string;
  nickname: string;
  mode: RoomMode;
  matchDurationMinutes?: number;
  roundCount?: number;
  answerTimeSeconds?: 3 | 5 | 10 | 15;
}

export interface JoinRoomRequest {
  code: string;
  nickname: string;
}

export class BackendApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly code?: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}
