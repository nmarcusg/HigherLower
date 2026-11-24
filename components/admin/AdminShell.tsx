"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Copy,
  CreditCard,
  Database,
  Flag,
  Layers3,
  LoaderCircle,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { getSupabaseBrowserClient } from "@/lib/backend/creator";
import {
  AdminApiError,
  fetchAdminMe,
  hasMinRole,
  type AdminIdentity,
  type StaffRole,
} from "@/lib/backend/admin";

interface AdminContextValue {
  token: string;
  identity: AdminIdentity;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdminAuth(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside AdminShell.");
  }
  return ctx;
}

const NAV_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  icon: typeof BarChart3;
  minRole?: StaffRole;
}> = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/moderation", label: "Moderation", icon: Flag },
  { href: "/admin/playsets", label: "Playsets", icon: Layers3 },
  { href: "/admin/creators", label: "Creators", icon: Users },
  { href: "/admin/payments", label: "Payments & Ads", icon: CreditCard, minRole: "ADMIN" },
  { href: "/admin/live", label: "Live Ops", icon: Activity },
  { href: "/admin/catalog", label: "Catalog", icon: Database },
  { href: "/admin/system", label: "System & Staff", icon: Settings, minRole: "SUPERADMIN" },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const supabase = getSupabaseBrowserClient();

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [verifyError, setVerifyError] = useState<{ status?: number; message: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthError, setOauthError] = useState("");

  const checkStaff = useCallback(async (jwt: string) => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const me = await fetchAdminMe(jwt);
      setIdentity(me);
    } catch (err) {
      setIdentity(null);
      if (err instanceof AdminApiError) {
        setVerifyError({ status: err.status, message: err.message });
      } else {
        setVerifyError({
          message: err instanceof Error ? err.message : "Could not verify staff access.",
        });
      }
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      const jwt = data.session?.access_token ?? null;
      setSessionToken(jwt);
      setSessionUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
      if (jwt) void checkStaff(jwt);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const jwt = session?.access_token ?? null;
      setSessionToken(jwt);
      setSessionUserId(session?.user?.id ?? null);
      setAuthReady(true);
      if (jwt) {
        void checkStaff(jwt);
      } else {
        setIdentity(null);
        setVerifyError(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [checkStaff, supabase]);

  async function signInDiscord() {
    if (!supabase) return;
    setOauthBusy(true);
    setOauthError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    if (error) {
      setOauthBusy(false);
      setOauthError(error.message);
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setIdentity(null);
    setSessionToken(null);
  }

  if (!supabase) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center bg-[#0b0d17] p-6 text-white">
        <section className="w-full rounded-md border border-white/15 bg-[#121628] p-7">
          <h1 className="text-xl font-bold">Admin Console Unavailable</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to sign in.
          </p>
        </section>
      </main>
    );
  }

  if (!authReady || verifying) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0b0d17] text-white">
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <LoaderCircle size={18} className="animate-spin text-[var(--accent-highlight)]" />
          <span>Verifying staff session…</span>
        </div>
      </main>
    );
  }

  if (!sessionToken) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0b0d17] p-6 text-white">
        <section className="w-full max-w-md rounded-md border border-white/15 bg-[#121628] p-7 shadow-2xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-highlight)]">
            <Shield size={16} /> Higher or Lower · Staff
          </div>
          <h1 className="mt-3 text-2xl font-bold">Admin Console Sign-In</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Authorized moderators, administrators, and superadmins only. Sign in with your linked
            Discord or Google account.
          </p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={oauthBusy}
              onClick={() => void signInDiscord()}
              className="flex min-h-11 w-full items-center justify-center rounded-sm bg-[#5865F2] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white hover:brightness-110 disabled:opacity-50"
            >
              Continue with Discord
            </button>
            <GoogleSignInButton
              supabase={supabase}
              redirectPath="/admin"
              disabled={oauthBusy}
              onBusyChange={setOauthBusy}
              onError={setOauthError}
              fallbackClassName="flex min-h-11 w-full items-center justify-center rounded-sm bg-white px-4 text-xs font-bold uppercase tracking-[0.1em] text-[#15122b] hover:brightness-95 disabled:opacity-50"
            />
          </div>
          {oauthError && (
            <p
              role="alert"
              className="mt-4 rounded-sm border border-red-400/40 bg-red-950/30 p-3 text-xs text-red-200"
            >
              {oauthError}
            </p>
          )}
          <div className="mt-5 border-t border-white/10 pt-4 text-center">
            <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-white">
              Return to public site
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!identity) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0b0d17] p-6 text-white">
        <section className="w-full max-w-lg rounded-md border border-red-400/30 bg-[#121628] p-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">
            Access Denied ({verifyError?.status ?? 403})
          </p>
          <h1 className="mt-2 text-2xl font-bold">Staff Role Required</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {verifyError?.message ?? "Your account does not have moderator or admin permissions."}
          </p>

          {sessionUserId && (
            <div className="mt-5 rounded-sm border border-white/15 bg-black/30 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Your Supabase User ID (for initial npm run staff:grant bootstrap)
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-xs text-[var(--accent-highlight)]">
                <span className="truncate">{sessionUserId}</span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(sessionUserId);
                    setCopiedId(true);
                    window.setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded border border-white/20 px-2 py-1 text-[10px] font-bold uppercase text-white"
                >
                  <Copy size={11} />
                  {copiedId ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void checkStaff(sessionToken)}
              className="min-h-10 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[#15122b]"
            >
              Re-check access
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-10 rounded-sm border border-white/25 px-4 text-xs font-bold uppercase tracking-[0.1em] text-white"
            >
              Sign out
            </button>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center px-3 text-xs text-[var(--text-muted)] hover:text-white"
            >
              Back to game
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <AdminContext.Provider value={{ token: sessionToken, identity }}>
      <div className="min-h-dvh bg-[#0b0d17] text-white lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
        {/* Desktop Sidebar */}
        <aside className="hidden border-r border-white/10 bg-[#101322] lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-highlight)]">
                <Shield size={15} /> Admin Console
              </div>
              <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                {identity.displayName || identity.email || identity.userId}
              </p>
              <span
                className={`mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  identity.role === "SUPERADMIN"
                    ? "border border-[var(--accent-highlight)]/45 bg-[var(--accent-highlight)]/15 text-[var(--accent-highlight)]"
                    : identity.role === "ADMIN"
                      ? "bg-white/10 text-[var(--accent-action-higher)]"
                      : "bg-white/10 text-[var(--text-secondary)]"
                }`}
              >
                {identity.role}
              </span>
            </div>

            <nav aria-label="Admin navigation" className="space-y-1 p-3">
              {NAV_ITEMS.filter(
                (item) => !item.minRole || hasMinRole(identity.role, item.minRole),
              ).map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-xs font-semibold transition ${
                      active
                        ? "bg-[var(--accent-highlight)]/15 text-[var(--accent-highlight)]"
                        : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={15} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="space-y-2 border-t border-white/10 p-4 text-xs">
            <Link
              href="/studio"
              className="block rounded-sm border border-white/15 px-3 py-2 text-center text-[var(--text-secondary)] hover:border-white/40 hover:text-white"
            >
              Open Creator Studio
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center justify-center gap-2 rounded-sm px-3 py-2 text-[var(--text-muted)] hover:bg-white/5 hover:text-white"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </aside>

        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#101322] px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-highlight)]">
            <Shield size={15} /> Admin · {identity.role}
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            className="rounded border border-white/20 p-2 text-white"
          >
            {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {mobileNavOpen && (
          <nav
            aria-label="Mobile admin navigation"
            className="border-b border-white/10 bg-[#121629] p-3 lg:hidden"
          >
            <div className="grid grid-cols-2 gap-1.5">
              {NAV_ITEMS.filter(
                (item) => !item.minRole || hasMinRole(identity.role, item.minRole),
              ).map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold ${
                      active
                        ? "bg-[var(--accent-highlight)]/15 text-[var(--accent-highlight)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    <Icon size={14} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
              <Link href="/" className="text-[var(--text-muted)]">
                Public site
              </Link>
              <button type="button" onClick={() => void signOut()} className="text-red-300">
                Sign out
              </button>
            </div>
          </nav>
        )}

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </AdminContext.Provider>
  );
}
