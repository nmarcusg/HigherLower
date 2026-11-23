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

export type SoloMode = "CLASSIC" | "TIME_ATTACK";
export type SoloChoice = "HIGHER" | "LOWER";
export type SoloPhase = "AWAITING_ANSWER" | "REVEAL" | "FINISHED" | "CANCELLED";
export type SoloStatus = "RUNNING" | "FINALIZING" | "FINISHED" | "CANCELLED";

export interface SoloPublicItem {
  id: string;
  name: string;
  imageUrl: string | null;
  attribution?: string;
  displayValue?: string;
}

export interface SoloSessionState {
  sessionId: string;
  questionId: string | null;
  stateVersion: number;
  serverNow: number;
  phase: SoloPhase;
  status: SoloStatus;
  mode: SoloMode;
  score: number;
  expiresAt: number | null;
  revealEndsAt: number | null;
  revealed: boolean;
  left: SoloPublicItem | null;
  right: SoloPublicItem | null;
  runtimeStatus: SoloStatus;
}

export interface CreateSoloSessionResponse {
  sessionId: string;
  gameToken: string;
  state: SoloSessionState;
}

export interface SoloAnswerReceipt {
  questionId: string;
  requestId: string;
  choice: SoloChoice;
  correct: boolean;
  correctChoice: SoloChoice;
  score: number;
  phase: SoloPhase;
  status: SoloStatus;
  eliminated: boolean;
  stateVersion: number;
  serverNow: number;
  expiresAt: number | null;
  revealEndsAt: number | null;
  left: SoloPublicItem;
  right: SoloPublicItem;
  runtimeStatus: SoloStatus;
}

export interface SoloResults {
  sessionId: string;
  status: SoloStatus;
  score: number;
  eliminated: boolean;
  finishedAt: string | null;
  mode: SoloMode;
}

export interface PublicPlaysetSummary {
  id: string;
  title: string;
  description: string;
  metricName: string;
  metricUnit: string;
  itemCount: number;
  revision: number;
}

export interface PublicPlaysetItem {
  id: string;
  name: string;
  imageUrl: string | null;
  sourceLabel: string;
  sourceYear: number | null;
}

export interface PublicPlaysetDetail extends PublicPlaysetSummary {
  items: PublicPlaysetItem[];
}

export interface PublicPlaysetPage {
  total: number;
  limit: number;
  offset: number;
  playsets: PublicPlaysetSummary[];
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
