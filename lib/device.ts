/** Stable per-browser identity used to keep one seat per device in a room. */
const DEVICE_KEY = "higher-lower:device:v1";

export function getDeviceId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
    const created = (globalThis.crypto?.randomUUID?.() ?? `dev${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/-/g, "");
    window.localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    return undefined;
  }
}
