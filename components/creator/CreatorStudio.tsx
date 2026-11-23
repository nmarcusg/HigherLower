"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, LoaderCircle, Plus, Send, Trash2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Visibility = "PUBLIC" | "UNLISTED";
type Entry = { name: string; value: string; sourceLabel: string };
type SetSummary = { id: string; title: string; status: string; visibility: string; revision: number; itemCount: number };
const initialEntries = (): Entry[] => Array.from({ length: 5 }, (_, index) => ({ name: "", value: "", sourceLabel: `Manual entry ${index + 1}` }));
const input = "mt-1 w-full rounded-sm border border-white/25 bg-[#15122b] px-3 py-2 text-sm text-white outline-none focus:border-[var(--focus-ring)]";

async function api(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`/api/backend/me/playsets${path}`, { ...init, headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) } });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof body === "object" && body && "message" in body && typeof body.message === "string" ? body.message : `Request failed (${response.status}).`);
  return body as Record<string, unknown>;
}

export default function CreatorStudio() {
  const supabase = getSupabaseBrowserClient();
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [title, setTitle] = useState(""); const [description, setDescription] = useState("");
  const [metricName, setMetricName] = useState("Score"); const [metricUnit, setMetricUnit] = useState("points");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC"); const [entries, setEntries] = useState<Entry[]>(initialEntries);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setToken(session?.access_token ?? null));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!token) return;
    void api("?limit=50", token).then((body) => setSets(Array.isArray(body.playsets) ? body.playsets as SetSummary[] : [])).catch((error: Error) => setMessage(error.message));
  }, [token]);

  async function signIn() {
    if (!supabase || !email.trim()) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/studio` } });
    setBusy(false); setMessage(error ? error.message : "Check your email for the secure sign-in link.");
  }
  function updateEntry(index: number, field: keyof Entry, value: string) { setEntries((current) => current.map((entry, i) => i === index ? { ...entry, [field]: value } : entry)); }
  async function createSet() {
    if (!token) return;
    const items = entries.filter((entry) => entry.name.trim() || entry.value.trim()).map((entry) => ({ name: entry.name.trim(), value: Number(entry.value), sourceLabel: entry.sourceLabel.trim() || "Manual entry" }));
    if (items.length < 5 || items.some((item) => !item.name || !Number.isFinite(item.value))) { setMessage("Add at least five named items with numeric comparison values."); return; }
    setBusy(true); setMessage("");
    try {
      const created = await api("", token, { method: "POST", body: JSON.stringify({ title, description, metricName, metricUnit, visibility, items }) });
      const published = await api(`/${encodeURIComponent(String(created.id))}/publish`, token, { method: "POST", body: JSON.stringify({ expectedRevision: created.revision }) });
      setMessage(`Published “${String(published.title)}”. ${visibility === "UNLISTED" ? `Share playset ID: ${String(published.id)}.` : "It is ready for solo and multiplayer."}`);
      setSets((current) => [published as unknown as SetSummary, ...current]);
      setTitle(""); setDescription(""); setEntries(initialEntries());
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create the playset."); }
    finally { setBusy(false); }
  }

  if (!supabase) return <main className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-8"><Link href="/" className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]"><ArrowLeft size={15} className="mr-2 inline" />Back to game</Link><section className="mt-16 rounded-md border border-amber-300/30 bg-amber-200/10 p-7 text-center"><h1 className="text-3xl font-bold">Creator setup needed</h1><p className="mt-3 text-sm text-[var(--text-secondary)]">Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel, then redeploy. These public browser values let you sign in; the backend still verifies every creator request.</p></section></main>;
  if (!token) return <main className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-8"><Link href="/" className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]"><ArrowLeft size={15} className="mr-2 inline" />Back to game</Link><section className="mt-16 rounded-md border border-white/20 bg-[#1b1734] p-7"><h1 className="text-4xl font-bold [text-shadow:3px_3px_0_var(--accent-time-attack)]">CREATOR STUDIO</h1><p className="mt-3 text-sm text-[var(--text-secondary)]">Sign in to create and manage your own comparison sets.</p><label className="mt-6 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">Email<input className={input} value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></label><button className="mt-5 inline-flex min-h-11 items-center gap-2 bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase text-[#15122b] disabled:opacity-50" disabled={busy || !email} onClick={() => void signIn()}>{busy && <LoaderCircle size={15} className="animate-spin" />} Send sign-in link</button>{message && <p className="mt-4 text-sm text-[var(--accent-highlight)]">{message}</p>}</section></main>;
  return <main className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-8"><header className="flex justify-between"><Link href="/" className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]"><ArrowLeft size={15} className="mr-2 inline" />Back to game</Link><span className="text-xs uppercase tracking-[0.14em] text-[var(--accent-highlight)]">Creator Studio</span></header><section className="py-10"><h1 className="text-4xl font-bold [text-shadow:4px_4px_0_var(--accent-time-attack)] sm:text-6xl">MAKE A PLAYSET</h1><p className="mt-3 text-sm text-[var(--text-secondary)]">Values stay private to the backend; players only see them at reveal.</p><div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.75fr]"><div className="rounded-md border border-white/20 bg-[#1b1734] p-5"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Title<input className={input} value={title} onChange={(e) => setTitle(e.target.value)} /></label><label className="text-xs">Visibility<select className={input} value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}><option value="PUBLIC">Public</option><option value="UNLISTED">Unlisted</option></select></label><label className="text-xs sm:col-span-2">Description<input className={input} value={description} onChange={(e) => setDescription(e.target.value)} /></label><label className="text-xs">Metric name<input className={input} value={metricName} onChange={(e) => setMetricName(e.target.value)} /></label><label className="text-xs">Unit<input className={input} value={metricUnit} onChange={(e) => setMetricUnit(e.target.value)} /></label></div><div className="mt-6 space-y-3">{entries.map((entry, index) => <div key={index} className="grid grid-cols-[1fr_100px_1fr_auto] gap-2"><input className={input} placeholder="Item" value={entry.name} onChange={(e) => updateEntry(index, "name", e.target.value)} /><input className={input} placeholder="Value" inputMode="decimal" value={entry.value} onChange={(e) => updateEntry(index, "value", e.target.value)} /><input className={input} placeholder="Source" value={entry.sourceLabel} onChange={(e) => updateEntry(index, "sourceLabel", e.target.value)} /><button className="mt-1 text-white/60 hover:text-white" aria-label="Remove item" onClick={() => setEntries((current) => current.length > 5 ? current.filter((_, i) => i !== index) : current)}><Trash2 size={16} /></button></div>)}</div><button className="mt-4 inline-flex items-center gap-2 text-xs text-[var(--accent-highlight)]" onClick={() => setEntries((current) => [...current, { name: "", value: "", sourceLabel: "Manual entry" }])}><Plus size={15} /> Add item</button><button className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase text-[#15122b] disabled:opacity-50" disabled={busy} onClick={() => void createSet()}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />} Create and publish</button>{message && <p role="status" className="mt-4 text-sm text-[var(--accent-highlight)]">{message}</p>}</div><aside className="rounded-md border border-white/20 bg-white/[0.03] p-5"><h2 className="text-xl font-bold">Your sets</h2><div className="mt-4 space-y-3">{sets.map((set) => <div key={set.id} className="border-b border-white/10 pb-3 text-sm"><strong>{set.title}</strong><p className="mt-1 text-xs text-[var(--text-muted)]">{set.status} · {set.visibility} · {set.itemCount} items</p>{set.visibility === "UNLISTED" && <p className="mt-1 break-all text-[10px] text-[var(--text-muted)]">Share ID: {set.id}</p>}{set.status === "PUBLISHED" && <Link className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--accent-highlight)]" href={`/playsets/${encodeURIComponent(set.id)}`}><Check size={13} /> Play solo</Link>}</div>)}{sets.length === 0 && <p className="text-sm text-[var(--text-muted)]">No sets yet.</p>}</div></aside></div></section></main>;
}
