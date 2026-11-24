"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LoaderCircle } from "lucide-react";

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  nonce?: string;
  ux_mode?: "popup" | "redirect";
  use_fedcm_for_button?: boolean;
  callback: (response: GoogleCredentialResponse) => void;
}

interface GoogleButtonConfiguration {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  shape?: "rectangular" | "pill" | "circle" | "square";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  logo_alignment?: "left" | "center";
  width?: number;
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let gsiLoadPromise: Promise<void> | null = null;

/**
 * Load Google Identity Services once per page lifecycle.
 * Intentionally omits Subresource Integrity because Google rotates `gsi/client` dynamically.
 */
function loadGoogleGsiScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Sign-In requires a browser environment."));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (gsiLoadPromise) {
    return gsiLoadPromise;
  }

  gsiLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      cleanup();
      if (window.google?.accounts?.id) {
        resolve();
      } else {
        gsiLoadPromise = null;
        reject(new Error("Google Identity Services loaded without initializing."));
      }
    };

    const onError = () => {
      cleanup();
      gsiLoadPromise = null;
      reject(new Error("Could not load Google Sign-In script."));
    };

    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);

    if (!existing) {
      script.src = GIS_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return gsiLoadPromise;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generate a raw nonce for Supabase verification and its SHA-256 hex digest for Google GIS. */
async function generateNoncePair(): Promise<{ rawNonce: string; hashedNonce: string }> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const rawNonce = bytesToBase64Url(randomBytes);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawNonce),
  );
  return { rawNonce, hashedNonce: bytesToHex(new Uint8Array(digest)) };
}

export interface GoogleSignInButtonProps {
  supabase: SupabaseClient;
  redirectPath: string;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onError?: (message: string) => void;
  fallbackClassName?: string;
}

export default function GoogleSignInButton({
  supabase,
  redirectPath,
  disabled = false,
  onBusyChange,
  onError,
  fallbackClassName = "flex min-h-11 w-full items-center justify-center rounded-sm bg-white px-4 text-xs font-bold uppercase tracking-[0.1em] text-[#15122b] hover:brightness-95 disabled:opacity-50",
}: GoogleSignInButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
  const [gsiState, setGsiState] = useState<"loading" | "ready" | "fallback">("loading");
  const [nonceVersion, setNonceVersion] = useState(0);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const onBusyChangeRef = useRef(onBusyChange);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onBusyChangeRef.current = onBusyChange;
    onErrorRef.current = onError;
  }, [onBusyChange, onError]);

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    void (async () => {
      try {
        await Promise.resolve();
        if (typeof crypto === "undefined" || !crypto.subtle) {
          throw new Error("Web Crypto API is unavailable.");
        }

        await loadGoogleGsiScript();
        if (cancelled) return;

        const googleId = window.google?.accounts?.id;
        const container = buttonRef.current;
        if (!googleId || !container) {
          throw new Error("Google Identity Services container unavailable.");
        }

        const { rawNonce, hashedNonce } = await generateNoncePair();
        if (cancelled) return;

        const measuredWidth = wrapperRef.current
          ? Math.min(400, Math.max(200, Math.floor(wrapperRef.current.clientWidth || 320)))
          : 320;

        googleId.initialize({
          client_id: clientId,
          nonce: hashedNonce,
          ux_mode: "popup",
          use_fedcm_for_button: true,
          callback: async (response) => {
            if (!response?.credential) {
              onErrorRef.current?.("Google did not return a sign-in credential.");
              return;
            }
            onBusyChangeRef.current?.(true);
            onErrorRef.current?.("");
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
              nonce: rawNonce,
            });
            if (error) {
              onErrorRef.current?.(error.message);
              setNonceVersion((v) => v + 1);
            }
            onBusyChangeRef.current?.(false);
          },
        });

        container.replaceChildren();
        googleId.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          logo_alignment: "left",
          width: measuredWidth,
        });

        if (!cancelled) {
          setGsiState("ready");
        }
      } catch {
        if (!cancelled) {
          setGsiState("fallback");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, supabase, nonceVersion]);

  async function handleOAuthFallback() {
    onBusyChange?.(true);
    onError?.("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${redirectPath}` },
    });
    if (error) {
      onBusyChange?.(false);
      onError?.(error.message);
    }
  }

  const useFallback = !clientId || gsiState === "fallback";

  if (useFallback) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => void handleOAuthFallback()}
        className={fallbackClassName}
      >
        {disabled ? <LoaderCircle size={15} className="mr-2 animate-spin" /> : null}
        Continue with Google
      </button>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative flex min-h-11 w-full items-center justify-center ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <div
        ref={buttonRef}
        className="flex min-h-11 w-full items-center justify-center"
      />
      {gsiState === "loading" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-sm bg-white/95 px-4 text-xs font-bold uppercase tracking-[0.1em] text-[#15122b]"
        >
          <LoaderCircle size={14} className="animate-spin" />
          Loading Google Sign-In…
        </div>
      )}
    </div>
  );
}
