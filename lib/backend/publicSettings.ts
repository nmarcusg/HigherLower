export interface PublicSettings {
  maintenanceBanner: string;
  features: {
    roomsCreateEnabled: boolean;
    soloCreateEnabled: boolean;
    creatorPublishEnabled: boolean;
    creatorUploadEnabled: boolean;
    mediaStorageConfigured?: boolean;
  };
  payments: {
    xenditEnabled: boolean;
    kofiEnabled: boolean;
    pricePhp: number;
    priceUsd: number;
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

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  maintenanceBanner: "",
  features: {
    roomsCreateEnabled: true,
    soloCreateEnabled: true,
    creatorPublishEnabled: true,
    creatorUploadEnabled: true,
    mediaStorageConfigured: true,
  },
  payments: {
    xenditEnabled: false,
    kofiEnabled: false,
    pricePhp: 199,
    priceUsd: 4,
  },
  ads: {
    enabled: false,
    slots: {
      home_banner: false,
      lobby_sidebar: false,
      postgame_card: false,
    },
    adsTxt: "",
  },
};

let cachedPublicSettings: { data: PublicSettings; expiresAt: number } | null = null;
let inflightPublicSettings: Promise<PublicSettings> | null = null;

export function clearPublicSettingsCache(): void {
  cachedPublicSettings = null;
}

export async function fetchPublicSettings(): Promise<PublicSettings> {
  if (typeof window === "undefined") {
    return DEFAULT_PUBLIC_SETTINGS;
  }
  const now = Date.now();
  if (cachedPublicSettings && cachedPublicSettings.expiresAt > now) {
    return cachedPublicSettings.data;
  }
  if (inflightPublicSettings) {
    return inflightPublicSettings;
  }

  inflightPublicSettings = fetch("/api/backend/settings/public", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  })
    .then(async (res) => {
      if (!res.ok) return DEFAULT_PUBLIC_SETTINGS;
      const body = (await res.json()) as Partial<PublicSettings>;
      const merged: PublicSettings = {
        maintenanceBanner: typeof body.maintenanceBanner === "string" ? body.maintenanceBanner : "",
        features: { ...DEFAULT_PUBLIC_SETTINGS.features, ...(body.features ?? {}) },
        payments: { ...DEFAULT_PUBLIC_SETTINGS.payments, ...(body.payments ?? {}) },
        ads: {
          enabled: Boolean(body.ads?.enabled),
          slots: { ...DEFAULT_PUBLIC_SETTINGS.ads.slots, ...(body.ads?.slots ?? {}) },
          adsTxt: typeof body.ads?.adsTxt === "string" ? body.ads.adsTxt : "",
        },
      };
      cachedPublicSettings = { data: merged, expiresAt: Date.now() + 30_000 };
      return merged;
    })
    .catch(() => DEFAULT_PUBLIC_SETTINGS)
    .finally(() => {
      inflightPublicSettings = null;
    });

  return inflightPublicSettings;
}
