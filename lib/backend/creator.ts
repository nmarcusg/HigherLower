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
  decimalPlaces?: number | null;
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
  decimalPlaces?: number | null;
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

export interface CreatorNotification {
  id: string;
  type: string;
  playsetId: string | null;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface CreatorNotificationFeed {
  unreadCount: number;
  notifications: CreatorNotification[];
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
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
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

function creatorRequest<T>(token: string, path = "", method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: unknown): Promise<T> {
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

const AUTO_RESIZE_TRIGGER_BYTES = Math.floor(1.8 * 1024 * 1024);
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_CLIENT_DIMENSION = 1280;

async function prepareUploadFile(file: File): Promise<File> {
  if (file.size <= AUTO_RESIZE_TRIGGER_BYTES || typeof document === "undefined") {
    return file;
  }

  let objectUrl = "";
  try {
    objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode image."));
      el.src = objectUrl;
    });

    const scale = Math.min(1, MAX_CLIENT_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight, 1));
    const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const encode = (mime: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), mime, quality));

    const blob = (await encode("image/webp", 0.86)) ?? (await encode("image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${baseName}.${ext}`, { type: blob.type });
  } catch {
    return file;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadCreatorImage(
  token: string,
  file: File,
): Promise<UploadedMediaResponse> {
  const prepared = await prepareUploadFile(file);
  if (prepared.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image file must be 2 MB or smaller.");
  }
  const response = await fetch("/api/backend/me/media/images", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": prepared.type || "application/octet-stream",
      ...deviceHeaders(),
    },
    body: prepared,
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

export function fetchCreatorNotifications(token: string): Promise<CreatorNotificationFeed> {
  return creatorApiRequest("/api/backend/me/notifications", token);
}

export function markCreatorNotificationsRead(
  token: string,
  ids?: string[],
): Promise<{ unreadCount: number }> {
  return creatorApiRequest(
    "/api/backend/me/notifications/read",
    token,
    "POST",
    ids && ids.length > 0 ? { ids } : {},
  );
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

export function deleteCreatorPlayset(
  token: string,
  id: string,
  expectedRevision?: number,
): Promise<{ deleted: true; id: string; freedSlot: boolean }> {
  const query = expectedRevision !== undefined ? `?expectedRevision=${expectedRevision}` : "";
  return creatorRequest(token, `/${encodeURIComponent(id)}${query}`, "DELETE");
}
