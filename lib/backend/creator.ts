import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type PlaysetStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PlaysetVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

export interface CreatorItem {
  id: string;
  name: string;
  value: number;
  displayValue: string;
  imageUrl: string | null;
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

async function creatorRequest<T>(token: string, path = "", method: "GET" | "POST" | "PUT" = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/backend/me/playsets${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const object = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
    throw new Error(typeof object.message === "string" ? object.message : `Creator request failed (${response.status}).`);
  }
  return payload as T;
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
