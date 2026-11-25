import { getDeviceId } from "@/lib/device";

export type StaffRole = "MODERATOR" | "ADMIN" | "SUPERADMIN";

const ROLE_RANK: Record<StaffRole, number> = {
  MODERATOR: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

export function hasMinRole(role: StaffRole, min: StaffRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export interface AdminIdentity {
  userId: string;
  role: StaffRole;
  email: string | null;
  displayName: string | null;
  username?: string | null;
  authProvider?: string | null;
}

export interface AdminDashboardData {
  audience: {
    today: { visitorsAnonymous: number; creatorsActive: number; totalReach: number };
    range7d: { visitorsAnonymous: number; creatorsActive: number; totalReach: number };
    range30d: { visitorsAnonymous: number; creatorsActive: number; totalReach: number };
    creatorsTotal: number;
    proCreators: number;
  };
  gameplay: {
    windowDays: number;
    gamesStarted: number;
    gamesFinished: number;
    completionRate: number;
    soloCount: number;
    roomCount: number;
    customShare: number;
    avgRoomSize: number;
  };
  monetization: {
    proUnlocks: number;
    conversionRate: number;
    revenueByCurrency: Array<{
      provider: string;
      currency: string;
      amountMinor: number;
      count: number;
    }>;
    unmatchedPayments: number;
    adsEnabled: boolean;
  };
  live: {
    activeRooms: number;
    lobbyRooms: number;
    postmatchRooms: number;
    connectedSockets: number;
    liveSoloSessions: number;
    build: {
      version: string;
      commitShort: string | null;
      environment: string;
    };
  };
  series: Array<{
    day: string;
    visitorsAnonymous: number;
    creatorsActive: number;
    totalReach: number;
    gamesStarted: number;
    gamesFinished: number;
  }>;
  topPlaysets: Array<{
    playsetId: string;
    title: string;
    metricName: string;
    visibility: string;
    moderationState: string;
    plays30d: number;
  }>;
  attention: {
    openReports: number;
    oldestOpenReportAt: string | null;
    autoFlaggedCount: number;
    suspectedClustersCount: number;
    failingCategories: number;
    unmatchedPaymentsCount: number;
  };
}

export interface ModerationQueueOverview {
  recentPublishedCount: number;
  openReportsPlaysetsCount: number;
  openReportsTotalCount: number;
  autoFlaggedCount: number;
  unreviewedPublishedCount: number;
  hiddenOrRemovedCount: number;
}

export interface ModerationQueueEntry {
  playsetId: string;
  title: string;
  visibility: string;
  status: string;
  moderationState: string;
  autoFlags: string[];
  itemCount: number;
  creator: { userId: string; handle: string; displayName: string; tier: "FREE" | "PRO" } | null;
  openReportCount: number;
  oldestReportAt: string | null;
  reasons: string[];
  recentReports: Array<{
    id: string;
    reason: string;
    details: string | null;
    createdAt: string;
  }>;
}

export interface AdminPlaysetSummary {
  id: string;
  title: string;
  description: string;
  metricName: string;
  metricUnit: string;
  visibility: string;
  status: string;
  moderationState: string;
  moderationReason: string | null;
  autoFlags: string[];
  revision: number;
  itemCount: number;
  openReports: number;
  plays30d: number;
  creator: { userId: string; handle: string; displayName: string; tier: "FREE" | "PRO" } | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface AdminPlaysetDetail {
  id: string;
  title: string;
  description: string;
  metricName: string;
  metricUnit: string;
  visibility: string;
  status: string;
  revision: number;
  moderationState: string;
  moderationReason: string | null;
  moderatedAt: string | null;
  moderatedBy: string | null;
  autoFlags: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    allowStaleOverride: boolean;
    lastRefreshedAt: string | null;
    lastRefreshStatus: string;
  } | null;
  creator: {
    userId: string;
    handle: string;
    displayName: string;
    email: string | null;
    authProvider: string;
    tier: "FREE" | "PRO";
  } | null;
  stats: { plays30d: number; finished30d: number };
  items: Array<{
    id: string;
    name: string;
    value: number;
    displayValue: string;
    imageUrl: string | null;
    mediaId: string | null;
    media: { id: string; sha256: string; byteSize: number; width: number; height: number } | null;
    sourceLabel: string;
    sourceYear: number | null;
    sortOrder: number;
  }>;
  reports: Array<{
    id: string;
    reason: string;
    details: string | null;
    status: string;
    resolutionNote: string | null;
    resolvedBy: string | null;
    resolvedAt: string | null;
    createdAt: string;
  }>;
  audit: Array<{
    id: string;
    actorUserId: string;
    actorRole: StaffRole;
    action: string;
    reason: string | null;
    metadata: unknown;
    createdAt: string;
  }>;
}

export interface AdminCreatorSummary {
  userId: string;
  handle: string;
  displayName: string;
  email: string | null;
  authProvider: string;
  tier: "FREE" | "PRO";
  maxPlaysets: number;
  maxItemsPerSet: number;
  activeSlotsUsed: number;
  totalPlaysets: number;
  storageBytes: number;
  mediaCount: number;
  activeRestrictions: string[];
  staffRole?: StaffRole | null;
  proUnlockedAt: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface AdminCreatorDetail {
  profile: {
    userId: string;
    handle: string;
    displayName: string;
    email: string | null;
    authProvider: string;
    tier: "FREE" | "PRO";
    staffRole?: StaffRole | null;
    maxPlaysets: number;
    maxItemsPerSet: number;
    kofiClaimCode: string;
    proUnlockedAt: string | null;
    createdAt: string;
    lastSeenAt: string;
  };
  storage: { bytes: number; files: number };
  totalReportsReceived: number;
  devices: Array<{ deviceHashShort: string; firstSeen: string; lastSeen: string }>;
  linkedAccounts: Array<{
    userId: string;
    handle: string;
    displayName: string;
    email: string | null;
    tier: "FREE" | "PRO";
  }>;
  playsets: Array<{
    id: string;
    title: string;
    status: string;
    visibility: string;
    moderationState: string;
    itemCount: number;
    openReports: number;
    updatedAt: string;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    providerRef: string;
    status: string;
    amountMinor: number;
    currency: string;
    createdAt: string;
    completedAt: string | null;
  }>;
  restrictions: Array<{
    id: string;
    type: string;
    reason: string;
    createdBy: string;
    createdAt: string;
    expiresAt: string | null;
    liftedAt: string | null;
    liftedBy: string | null;
  }>;
}

export interface AdminPlatformSettings {
  maintenanceBanner: string;
  features: {
    roomsCreateEnabled: boolean;
    soloCreateEnabled: boolean;
    creatorPublishEnabled: boolean;
    creatorUploadEnabled: boolean;
  };
  payments: {
    xenditEnabled: boolean;
    kofiEnabled: boolean;
    pricePhp: number;
    priceUsd: number;
    kofiUrl: string;
  };
  ads: {
    enabled: boolean;
    slots: {
      home_banner: boolean;
      lobby_sidebar: boolean;
      postgame_card: boolean;
    };
    adsTxt: string;
  };
}

export interface AdminPaymentRow {
  id: string;
  userId: string | null;
  creator: { userId: string; handle: string; displayName: string; email: string | null } | null;
  provider: string;
  providerRef: string;
  status: string;
  amountMinor: number;
  currency: string;
  payerEmail: string | null;
  rawMeta: unknown;
  createdAt: string;
  completedAt: string | null;
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

async function adminRequest<T>(
  token: string,
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
): Promise<T> {
  const deviceId = getDeviceId();
  const res = await fetch(`/api/backend/admin/${path.replace(/^\/+/, "")}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(deviceId ? { "X-Device-Id": deviceId } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    throw new AdminApiError(
      typeof payload?.message === "string" ? payload.message : `Admin request failed (${res.status}).`,
      res.status,
      typeof payload?.code === "string" ? payload.code : undefined,
    );
  }
  return payload as T;
}

export const fetchAdminMe = (token: string) => adminRequest<AdminIdentity>(token, "me");

export const fetchAdminDashboard = (token: string, days: 7 | 30 = 7) =>
  adminRequest<AdminDashboardData>(token, `dashboard?days=${days}`);

export const fetchModerationQueue = (
  token: string,
  tab: "recent" | "reports" | "flagged",
  limit = 30,
  offset = 0,
) =>
  adminRequest<{
    tab: string;
    total: number;
    overview?: ModerationQueueOverview;
    entries: ModerationQueueEntry[];
  }>(token, `moderation/queue?tab=${tab}&limit=${limit}&offset=${offset}`);

export const moderateAdminPlayset = (
  token: string,
  playsetId: string,
  body: {
    action: "APPROVE" | "HIDE" | "REMOVE" | "RESTORE";
    reason: string;
    resolveOpenReports?: boolean;
    allowStaleOverride?: boolean;
  },
) => adminRequest(token, `moderation/playsets/${encodeURIComponent(playsetId)}`, "POST", body);

export const resolveAdminReport = (
  token: string,
  reportId: string,
  body: { status: "RESOLVED" | "DISMISSED"; note: string },
) => adminRequest(token, `moderation/reports/${encodeURIComponent(reportId)}`, "POST", body);

export const blockAdminMedia = (
  token: string,
  mediaId: string,
  reason: string,
) => adminRequest(token, `moderation/media/${encodeURIComponent(mediaId)}/block`, "POST", { reason });

export const fetchAdminPlaysets = (
  token: string,
  params: {
    q?: string;
    kind?: string;
    status?: string;
    moderationState?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    limit?: number;
    offset?: number;
  },
) => {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.kind) sp.set("kind", params.kind);
  if (params.status) sp.set("status", params.status);
  if (params.moderationState) sp.set("moderationState", params.moderationState);
  if (params.sortBy) sp.set("sortBy", params.sortBy);
  if (params.sortDir) sp.set("sortDir", params.sortDir);
  sp.set("limit", String(params.limit ?? 30));
  sp.set("offset", String(params.offset ?? 0));
  return adminRequest<{ total: number; playsets: AdminPlaysetSummary[] }>(
    token,
    `playsets?${sp.toString()}`,
  );
};

export const fetchAdminPlaysetDetail = (token: string, id: string) =>
  adminRequest<AdminPlaysetDetail>(token, `playsets/${encodeURIComponent(id)}`);

export const fetchAdminCreators = (
  token: string,
  params: { q?: string; tier?: string; limit?: number; offset?: number },
) => {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.tier) sp.set("tier", params.tier);
  sp.set("limit", String(params.limit ?? 30));
  sp.set("offset", String(params.offset ?? 0));
  return adminRequest<{ total: number; creators: AdminCreatorSummary[] }>(
    token,
    `creators?${sp.toString()}`,
  );
};

export const fetchAdminClusters = (token: string) =>
  adminRequest<{
    clusters: Array<{
      deviceHashShort: string;
      accountCount: number;
      totalFreeSlots: number;
      accounts: Array<{
        userId: string;
        handle: string;
        displayName: string;
        email: string | null;
        authProvider: string;
        tier: "FREE" | "PRO";
        staffRole?: StaffRole | null;
        activeSlotsUsed: number;
        lastSeenAt: string;
      }>;
    }>;
  }>(token, "creators/clusters");

export const fetchAdminCreatorDetail = (token: string, userId: string) =>
  adminRequest<AdminCreatorDetail>(token, `creators/${encodeURIComponent(userId)}`);

export const setCreatorProStatus = (
  token: string,
  userId: string,
  body: { action: "GRANT" | "REVOKE"; reason: string; maxPlaysets?: number; maxItemsPerSet?: number },
) => adminRequest(token, `creators/${encodeURIComponent(userId)}/pro`, "POST", body);

export const setCreatorCustomCaps = (
  token: string,
  userId: string,
  body: { maxPlaysets: number; maxItemsPerSet: number; reason: string },
) => adminRequest(token, `creators/${encodeURIComponent(userId)}/caps`, "POST", body);

export const restrictAdminCreator = (
  token: string,
  userId: string,
  body: { type: "PUBLISH_BAN" | "SUSPENDED"; reason: string; unpublishAllPublic?: boolean },
) => adminRequest(token, `creators/${encodeURIComponent(userId)}/restrictions`, "POST", body);

export const liftAdminRestriction = (
  token: string,
  userId: string,
  restrictionId: string,
  reason: string,
) =>
  adminRequest(
    token,
    `creators/${encodeURIComponent(userId)}/restrictions/${encodeURIComponent(restrictionId)}`,
    "DELETE",
    { reason },
  );

export interface AdminPaymentsSummary {
  totalCount: number;
  completedCount: number;
  unmatchedCount: number;
  pendingCount: number;
  failedOrRefundedCount: number;
  adminGrantCount: number;
  revenueByCurrency: Array<{ currency: string; amountMinor: number; count: number }>;
}

export const fetchAdminPayments = (
  token: string,
  params: { status?: string; provider?: string; limit?: number; offset?: number } = {},
) => {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.provider) sp.set("provider", params.provider);
  sp.set("limit", String(params.limit ?? 50));
  sp.set("offset", String(params.offset ?? 0));
  return adminRequest<{ total: number; summary?: AdminPaymentsSummary; payments: AdminPaymentRow[] }>(
    token,
    `payments?${sp.toString()}`,
  );
};

export const linkAdminPayment = (
  token: string,
  paymentId: string,
  body: { userId: string; reason: string },
) => adminRequest(token, `payments/${encodeURIComponent(paymentId)}/link`, "POST", body);

export const fetchAdminSettings = (token: string) =>
  adminRequest<AdminPlatformSettings>(token, "settings");

export const updateAdminSettings = (
  token: string,
  updates: Record<string, string | number | boolean>,
  reason?: string,
) => adminRequest<AdminPlatformSettings>(token, "settings", "PATCH", { updates, reason });

export const fetchAdminLive = (token: string) =>
  adminRequest<{
    summary: {
      activeRooms: number;
      lobbyRooms: number;
      postmatchRooms: number;
      connectedSockets: number;
      liveSoloSessions: number;
      soloRunning: number;
    };
    settings: {
      maintenanceBanner: string;
      features: AdminPlatformSettings["features"];
    };
    rooms: Array<{
      sessionId: string;
      roomCode: string | null;
      mode: string;
      status: string;
      phase: string;
      playsetId: string;
      playsetTitle: string;
      hostActorId: string;
      hostNickname: string | null;
      playerCount: number;
      spectatorCount: number;
      connectedPlayers: number;
      connectedSpectators: number;
      createdAt: string;
      startedAt: string | null;
      participants: Array<{
        actorId: string;
        nickname: string;
        role: string;
        score: number;
        eliminated: boolean;
        isHost: boolean;
      }>;
    }>;
  }>(token, "live");

export const lookupAdminSession = (token: string, q: string) =>
  adminRequest<{
    id: string;
    roomCode: string | null;
    kind: string;
    mode: string;
    status: string;
    playsetId: string;
    playsetTitle: string;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    participants: Array<{
      actorId: string;
      nickname: string;
      role: string;
      status: string;
      score: number;
      eliminated: boolean;
      eliminationReason: string | null;
      disconnectCount: number;
      isHost: boolean;
    }>;
  }>(token, `sessions/lookup?q=${encodeURIComponent(q)}`);

export const forceEndAdminRoom = (token: string, sessionId: string, reason: string) =>
  adminRequest(token, `rooms/${encodeURIComponent(sessionId)}/force-end`, "POST", { reason });

export const kickAdminParticipant = (
  token: string,
  sessionId: string,
  actorId: string,
  reason: string,
) => adminRequest(token, `rooms/${encodeURIComponent(sessionId)}/kick`, "POST", { actorId, reason });

export const fetchAdminCatalog = (token: string) =>
  adminRequest<{
    total: number;
    categories: Array<{
      id: string;
      title: string;
      domain: string;
      availability: "SUPPORTED" | "DEGRADED" | "UNAVAILABLE";
      unavailableReason: string | null;
      playsetId: string | null;
      itemCount: number;
      refreshSchedule: string;
      ageHours: number | null;
      lastRefreshError: string | null;
      allowStaleOverride?: boolean;
      moderationState?: string | null;
      moderationReason?: string | null;
      compressedImages: number;
      compressedCoveragePct: number;
      freshness: { lastRefreshedAt: string | null; lastRefreshStatus: string };
    }>;
  }>(token, "catalog");

export const updateAdminCatalogAccess = (
  token: string,
  categoryId: string,
  body: { action: "HIDE" | "RESTORE"; allowStaleOverride?: boolean; reason: string },
) => adminRequest(token, `catalog/${encodeURIComponent(categoryId)}/access`, "POST", body);

export interface CatalogImageSyncStatus {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  totalPending: number;
  processed: number;
  enriched: number;
  compressed: number;
  updated: number;
  failed: number;
  lastError: string | null;
}

export const fetchAdminCatalogImageSyncStatus = (token: string) =>
  adminRequest<CatalogImageSyncStatus>(token, "catalog/sync-images");

export const triggerAdminCatalogImageSync = (token: string) =>
  adminRequest<CatalogImageSyncStatus>(token, "catalog/sync-images", "POST", {});

export const fetchAdminSystem = (token: string) =>
  adminRequest<{
    dbReady: boolean;
    dbLatencyMs: number | null;
    build: { version: string; commit: string; commitShort: string | null; node: string; environment: string };
    uptimeSeconds: number;
    memoryMb: { rss: number; heapUsed: number; heapTotal: number };
    storage: { uploadedMediaCount: number; uploadedMediaBytes: number };
    rollup: { lastRolledDay: string | null; lastUpdatedAt: string | null; dailyVisitorRows: number };
    sessionsByStatus: Array<{ status: string; count: number }>;
  }>(token, "system");

export const triggerAdminRollup = (token: string) => adminRequest(token, "system/rollup", "POST", {});

export const runAdminRetentionCleanup = (token: string, days: number, apply: boolean) =>
  adminRequest<{
    days: number;
    apply: boolean;
    sessionsCount: number;
    resultsCount: number;
    oldVisitorsCount: number;
    unrolledDays: number;
    deletedSessions: number;
    deletedResults: number;
    deletedVisitors: number;
  }>(token, "system/cleanup", "POST", { days, apply });

export interface AdminStaffMember {
  userId: string;
  role: StaffRole;
  email: string | null;
  displayName: string | null;
  username: string | null;
  authProvider: string | null;
  protected?: boolean;
  grantedBy: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface AdminStaffInvite {
  id: string;
  email: string;
  role: StaffRole;
  provider: string | null;
  invitedBy: string;
  reason: string | null;
  createdAt: string;
}

export const fetchAdminStaff = (token: string) =>
  adminRequest<{
    staff: AdminStaffMember[];
    invites: AdminStaffInvite[];
  }>(token, "staff");

export const grantAdminStaff = (
  token: string,
  body: {
    userId?: string;
    email?: string;
    role: StaffRole;
    provider?: "google" | "discord";
    reason?: string;
  },
) =>
  adminRequest<
    | {
        status: "ACTIVE";
        userId: string;
        role: StaffRole;
        email: string | null;
        displayName: string | null;
        username: string | null;
        authProvider: string | null;
        revokedAt: null;
      }
    | {
        status: "PENDING_INVITE";
        invite: AdminStaffInvite;
      }
  >(token, "staff", "POST", body);

export const revokeAdminStaffInvite = (token: string, inviteId: string, reason?: string) =>
  adminRequest<{ id: string; email: string; revokedAt: string }>(
    token,
    `staff/invites/${encodeURIComponent(inviteId)}`,
    "DELETE",
    { reason },
  );

export const revokeAdminStaff = (token: string, userId: string, reason?: string) =>
  adminRequest(token, `staff/${encodeURIComponent(userId)}`, "DELETE", { reason });

export const fetchAdminAudit = (
  token: string,
  params: { action?: string; targetType?: string; limit?: number; offset?: number } = {},
) => {
  const sp = new URLSearchParams();
  if (params.action) sp.set("action", params.action);
  if (params.targetType) sp.set("targetType", params.targetType);
  sp.set("limit", String(params.limit ?? 50));
  sp.set("offset", String(params.offset ?? 0));
  return adminRequest<{
    total: number;
    logs: Array<{
      id: string;
      actorUserId: string;
      actorRole: StaffRole;
      action: string;
      targetType: string;
      targetId: string;
      reason: string | null;
      metadata: unknown;
      createdAt: string;
    }>;
  }>(token, `audit?${sp.toString()}`);
};
