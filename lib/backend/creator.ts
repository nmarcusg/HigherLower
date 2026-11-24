import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getDeviceId } from "@/lib/device";

export type PlaysetStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PlaysetVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE";
export type ModerationState = "UNREVIEWED" | "APPROVED" | "HIDDEN" | "REMOVED";

export interface CreatorItem {
  id: string;
  name: string;
  value: number;
  displayValue: string;
  imageUrl: string | null;
  mediaId?: string | null;
  sourceLabel: string;
  sourceYear: number | null;
  sortOrder: number;
}

export interface CreatorPlayset {
  id: string;
  title: string;
  description: string;
  metricName: string;
  metricUnit: string;
  visibility: PlaysetVisibility;
  status: PlaysetStatus;
  moderationState?: ModerationState;
  moderationReason?: string | null;
  publishedAt?: string | null;
  revision: number;
  itemCount: number;
  updatedAt: string;
  items?: CreatorItem[];
}

export type CreatorPlaysetSummary = Omit<CreatorPlayset, "items">;

export interface CreatorItemInput {
  id?: string;
  name: string;
  value: number;
  displayValue?: string;
  imageUrl?: string | null;
  mediaId?: string | null;
  sourceLabel: string;
  sourceYear?: number | null;
}

export interface CreatorPlaysetInput {
  title: string;
  description: string;
  metricName: string;
  metricUnit: string;
  visibility: PlaysetVisibility;
  items: CreatorItemInput[];
  expectedRevision?: number;
}

export interface CreatorPlaysetAnalytics {
  playsetId: string;
  title: string;
  plays30d: number;
  finished30d: number;
  completionRate: number;
  avgScore: number;
}

export interface CreatorProfile {
  userId: string;
  handle: string;
  displayName: string;
  email: string | null;
  authProvider: string;
  tier: "FREE" | "PRO";
  maxPlaysets: number;
  maxItemsPerSet: number;
  activeSlotsUsed: number;
  devicePoolSlotsUsed: number;
  kofiClaimCode: string;
  proUnlockedAt: string | null;
  isStaff: boolean;
  staffRole: "MODERATOR" | "ADMIN" | "SUPERADMIN" | null;
  restrictions: Array<{
    id: string;
    type: "PUBLISH_BAN" | "SUSPENDED";
    reason: string;
    expiresAt: string | null;
    createdAt: string;
  }>;
  analytics: CreatorPlaysetAnalytics[];
}

export interface UploadedMediaResponse {
  id: string;
  publicUrl: string;
  sha256: string;
  byteSize: number;
  width: number;
  height: number;
}

let supabase: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || typeof window === "undefined") return null;
  if (!supabase) supabase = createClient(url, key);
  return supabase;
}

function deviceHeaders(): Record<string, string> {
  const deviceId = getDeviceId();
  return deviceId ? { "X-Device-Id": deviceId } : {};
}

async function creatorApiRequest<T>(
  url: string,
  token: string,
  method: "GET" | "POST" | "PUT" | "PATCH" = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...deviceHeaders(),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const object = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
    throw new Error(typeof object.message === "string" ? object.message : `Creator request failed (${response.status}).`);
  }
  return payload as T;
}

function creatorRequest<T>(token: string, path = "", method: "GET" | "POST" | "PUT" = "GET", body?: unknown): Promise<T> {
  return creatorApiRequest<T>(`/api/backend/me/playsets${path}`, token, method, body);
}

export function fetchCreatorProfile(token: string): Promise<CreatorProfile> {
  return creatorApiRequest<CreatorProfile>("/api/backend/me/profile", token, "GET");
}

export function updateCreatorProfile(
  token: string,
  input: { displayName?: string; handle?: string },
): Promise<{ userId: string; handle: string; displayName: string; tier: "FREE" | "PRO" }> {
  return creatorApiRequest("/api/backend/me/profile", token, "PATCH", input);
}

export async function uploadCreatorImage(
  token: string,
  file: File,
): Promise<UploadedMediaResponse> {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Image file must be 2 MB or smaller.");
  }
  const response = await fetch("/api/backend/me/media/images", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type || "application/octet-stream",
      ...deviceHeaders(),
    },
    body: file,
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const object = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
    throw new Error(typeof object.message === "string" ? object.message : `Image upload failed (${response.status}).`);
  }
  return payload as UploadedMediaResponse;
}

export function startXenditUpgrade(
  token: string,
): Promise<{ invoiceUrl: string; providerRef: string; amountPhp: number }> {
  return creatorApiRequest("/api/backend/me/upgrade/xendit", token, "POST", {});
}

export function fetchKofiIntent(
  token: string,
): Promise<{ kofiUrl: string; claimCode: string; amountUsd: number }> {
  return creatorApiRequest("/api/backend/me/upgrade/kofi-intent", token, "POST", {});
}

export function listCreatorPlaysets(token: string): Promise<{ total: number; limit: number; offset: number; playsets: CreatorPlaysetSummary[] }> {
  return creatorRequest(token, "?limit=50");
}

export function getCreatorPlayset(token: string, id: string): Promise<CreatorPlayset> {
  return creatorRequest(token, `/${encodeURIComponent(id)}`);
}

export function createCreatorPlayset(token: string, input: CreatorPlaysetInput): Promise<CreatorPlayset> {
  return creatorRequest(token, "", "POST", input);
}

export function updateCreatorPlayset(token: string, id: string, input: CreatorPlaysetInput & { expectedRevision: number }): Promise<CreatorPlayset> {
  return creatorRequest(token, `/${encodeURIComponent(id)}`, "PUT", input);
}

export function creatorPlaysetAction(token: string, id: string, action: "publish" | "unpublish" | "archive", expectedRevision: number): Promise<CreatorPlayset> {
  return creatorRequest(token, `/${encodeURIComponent(id)}/${action}`, "POST", { expectedRevision });
}

export function archiveCreatorPlayset(token: string, id: string, expectedRevision: number): Promise<CreatorPlayset> {
  return creatorPlaysetAction(token, id, "archive", expectedRevision);
}
