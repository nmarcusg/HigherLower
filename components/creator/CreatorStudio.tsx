"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Globe2,
  LoaderCircle,
  Lock,
  Pencil,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  archiveCreatorPlayset,
  createCreatorPlayset,
  creatorPlaysetAction,
  getCreatorPlayset,
  getSupabaseBrowserClient,
  listCreatorPlaysets,
  updateCreatorPlayset,
  type CreatorPlayset,
  type CreatorPlaysetSummary,
  type PlaysetVisibility,
} from "@/lib/backend/creator";

type EditorMode = "create" | "edit";
type ItemDraft = { id?: string; name: string; value: string; sourceLabel: string; imageUrl: string };
type Template = {
  label: string;
  title: string;
  description: string;
  metricName: string;
  metricUnit: string;
  sourceLabel: string;
  items: Array<[string, number]>;
};

const FIELD =
  "mt-1.5 w-full rounded-sm border border-white/20 bg-[#15122b] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20";
const LABEL = "text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]";
const PRIMARY =
  "inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase tracking-[0.08em] text-[#15122b] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45";
const SECONDARY =
  "inline-flex min-h-10 items-center justify-center gap-2 border border-white/25 px-3 text-xs font-bold uppercase tracking-[0.06em] transition hover:border-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45";

const TEMPLATES: Template[] = [
  {
    label: "Countries by population",
    title: "Countries by Population",
    description: "Compare population counts for well-known countries.",
    metricName: "Population",
    metricUnit: "people",
    sourceLabel: "World Bank estimate",
    items: [
      ["Japan", 123_300_000],
      ["Brazil", 216_400_000],
      ["Germany", 84_500_000],
      ["Canada", 40_100_000],
      ["Australia", 26_700_000],
      ["France", 68_400_000],
      ["Mexico", 129_700_000],
    ],
  },
  {
    label: "Twitch followers",
    title: "Twitch Followers",
    description: "Compare follower counts for popular Twitch channels.",
    metricName: "Twitch followers",
    metricUnit: "followers",
    sourceLabel: "Twitch channel counts",
    items: [
      ["Ninja", 19_100_000],
      ["Pokimane", 9_200_000],
      ["xQc", 12_700_000],
      ["shroud", 10_600_000],
      ["DrLupo", 7_400_000],
      ["TimTheTatman", 7_100_000],
    ],
  },
  {
    label: "Movie box office",
    title: "Movie Box Office",
    description: "Compare worldwide box-office revenue for blockbuster films.",
    metricName: "Worldwide box office",
    metricUnit: "USD",
    sourceLabel: "Box Office Mojo lifetime gross",
    items: [
      ["Avengers: Endgame", 2_799_000_000],
      ["Avatar", 2_923_000_000],
      ["Titanic", 2_264_000_000],
      ["Star Wars: The Force Awakens", 2_071_000_000],
      ["Avengers: Infinity War", 2_052_000_000],
      ["Jurassic World", 1_671_000_000],
    ],
  },
  {
    label: "Video game sales",
    title: "Video Game Sales",
    description: "Compare lifetime unit sales for famous video games.",
    metricName: "Copies sold",
    metricUnit: "copies",
    sourceLabel: "Publisher-reported lifetime sales",
    items: [
      ["Tetris", 520_000_000],
      ["Minecraft", 300_000_000],
      ["Grand Theft Auto V", 200_000_000],
      ["Wii Sports", 82_900_000],
      ["PUBG", 75_000_000],
      ["Mario Kart 8 Deluxe", 60_000_000],
    ],
  },
];

function blankRows(count = 5): ItemDraft[] {
  return Array.from({ length: count }, () => ({ name: "", value: "", sourceLabel: "", imageUrl: "" }));
}

function statusLabel(status: string) {
  if (status === "PUBLISHED") return "Live";
  if (status === "ARCHIVED") return "Archived";
  return "Draft";
}

function visibilityLabel(visibility: string) {
  if (visibility === "PRIVATE") return "Private";
  if (visibility === "UNLISTED") return "Unlisted";
  return "Public";
}

export default function CreatorStudio() {
  const supabase = getSupabaseBrowserClient();
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [signInMessage, setSignInMessage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingSets, setLoadingSets] = useState(false);
  const [sets, setSets] = useState<CreatorPlaysetSummary[]>([]);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRevision, setEditingRevision] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metricName, setMetricName] = useState("Score");
  const [metricUnit, setMetricUnit] = useState("points");
  const [visibility, setVisibility] = useState<PlaysetVisibility>("PUBLIC");
  const [items, setItems] = useState<ItemDraft[]>(blankRows);
  const [deleteTarget, setDeleteTarget] = useState<CreatorPlaysetSummary | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
      if (!session) resetEditor();
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const loadSets = useCallback(async (accessToken: string) => {
    setLoadingSets(true);
    try {
      const page = await listCreatorPlaysets(accessToken);
      setSets(page.playsets);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your playsets.");
    } finally {
      setLoadingSets(false);
    }
  }, []);

  useEffect(() => {
    if (token) void Promise.resolve().then(() => loadSets(token));
  }, [loadSets, token]);

  const completedRows = useMemo(
    () => items.map((item) => ({ ...item, name: item.name.trim(), value: item.value.trim() })).filter((item) => item.name || item.value),
    [items],
  );
  const parsedValues = completedRows.map((item) => Number(item.value));
  const distinctCount = new Set(parsedValues.filter((value) => Number.isFinite(value))).size;

  const issues = useMemo(() => {
    const next: string[] = [];
    if (title.trim().length > 0 && title.trim().length < 3) next.push("Title needs at least 3 characters.");
    if (!title.trim()) next.push("Add a title.");
    if (title.trim().length > 100) next.push("Keep the title under 100 characters.");
    if (description.length > 500) next.push("Keep the description under 500 characters.");
    if (items.some((item) => item.imageUrl.trim() && !item.imageUrl.trim().startsWith("https://"))) next.push("Image URLs must start with https://.");
    if (!metricName.trim()) next.push("Name the value being compared.");
    if (metricName.trim().length > 60) next.push("Keep the metric name under 60 characters.");
    if (!metricUnit.trim()) next.push("Add a unit such as people, USD, or points.");
    if (metricUnit.trim().length > 60) next.push("Keep the unit under 60 characters.");
    if (completedRows.length < 5) next.push("Add at least 5 completed rows.");
    if (completedRows.length > 200) next.push("A playset can have at most 200 rows.");
    completedRows.forEach((item, index) => {
      if (!item.name) next.push(`Row ${index + 1}: add an item name.`);
      if (item.name.length > 100) next.push(`Row ${index + 1}: keep the item name under 100 characters.`);
      if (!item.value) next.push(`Row ${index + 1}: add a numeric value.`);
      if (item.value && !Number.isFinite(Number(item.value))) next.push(`Row ${index + 1}: “${item.value}” is not a valid number.`);
      if (item.value && Number.isFinite(Number(item.value)) && Math.abs(Number(item.value)) >= 1e24) next.push(`Row ${index + 1}: keep values below 1e24.`);
    });
    return next;
  }, [completedRows, description, items, metricName, metricUnit, title]);

  const canSaveDraft = issues.length === 0;
  const canPublish = canSaveDraft && distinctCount >= 2;

  function resetEditor() {
    setEditorMode("create");
    setEditingId(null);
    setEditingRevision(null);
    setTitle("");
    setDescription("");
    setMetricName("Score");
    setMetricUnit("points");
    setVisibility("PUBLIC");
    setItems(blankRows());
    setMessage("");
    setError("");
  }

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  function updateItem(index: number, field: "name" | "value" | "sourceLabel" | "imageUrl", value: string) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  function addRow() {
    if (items.length >= 200) return;
    setItems((current) => [...current, { name: "", value: "", sourceLabel: "", imageUrl: "" }]);
  }

  function removeRow(index: number) {
    setItems((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current);
  }

  function applyTemplate(template: Template) {
    setTitle(template.title);
    setDescription(template.description);
    setMetricName(template.metricName);
    setMetricUnit(template.metricUnit);
    setItems(template.items.map(([name, value]) => ({ name, value: String(value), sourceLabel: template.sourceLabel, imageUrl: "" })));
    setVisibility("PUBLIC");
    clearFeedback();
    setMessage(`Loaded “${template.label}”. Edit any row, then save.`);
  }

  function payload(nextVisibility = visibility) {
    return {
      title: title.trim(),
      description: description.trim(),
      metricName: metricName.trim(),
      metricUnit: metricUnit.trim(),
      visibility: nextVisibility,
      items: completedRows.map((item) => ({
        ...(item.id ? { id: item.id } : {}),
        name: item.name,
        value: Number(item.value),
        sourceLabel: item.sourceLabel.trim() || "Manual entry",
        imageUrl: item.imageUrl.trim() || null,
      })),
    };
  }

  async function saveDraft() {
    if (!token) return;
    if (!canSaveDraft) {
      setError("Fix the highlighted details before saving.");
      return;
    }
    setBusy(true);
    clearFeedback();
    try {
      if (editorMode === "edit" && editingId && editingRevision !== null) {
        const updated = await updateCreatorPlayset(token, editingId, { ...payload(), expectedRevision: editingRevision });
        await openEditor(updated.id);
        setMessage("Draft saved. Publish it when you are ready.");
      } else {
        const created = await createCreatorPlayset(token, payload());
        await openEditor(created.id);
        setMessage("Draft saved. You can publish it from here.");
      }
      await loadSets(token);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the playset.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAndPublish() {
    if (!token) return;
    if (!canSaveDraft) {
      setError("Fix the highlighted details before publishing.");
      return;
    }
    if (distinctCount < 2) {
      setError("Add at least two different values so there is something to compare.");
      return;
    }
    const nextVisibility = visibility === "PRIVATE" ? "PUBLIC" : visibility;
    setBusy(true);
    clearFeedback();
    try {
      let current: CreatorPlayset;
      if (editorMode === "edit" && editingId && editingRevision !== null) {
        current = await updateCreatorPlayset(token, editingId, { ...payload(nextVisibility), expectedRevision: editingRevision });
      } else {
        current = await createCreatorPlayset(token, payload(nextVisibility));
      }
      if (current.status !== "PUBLISHED") current = await creatorPlaysetAction(token, current.id, "publish", current.revision);
      await openEditor(current.id);
      setMessage(nextVisibility === "UNLISTED" ? `Published as unlisted. Share playset ID: ${current.id}.` : "Published. It is now available in solo and multiplayer.");
      await loadSets(token);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish the playset.");
    } finally {
      setBusy(false);
    }
  }

  async function openEditor(id: string) {
    if (!token) return;
    setBusy(true);
    clearFeedback();
    try {
      const playset = await getCreatorPlayset(token, id);
      setEditorMode("edit");
      setEditingId(playset.id);
      setEditingRevision(playset.revision);
      setTitle(playset.title);
      setDescription(playset.description);
      setMetricName(playset.metricName);
      setMetricUnit(playset.metricUnit);
      setVisibility(playset.visibility);
      const loaded = playset.items?.map((item) => ({
        id: item.id,
        name: item.name,
        value: String(item.value),
        sourceLabel: item.sourceLabel,
        imageUrl: item.imageUrl ?? "",
      })) ?? [];
      setItems(loaded.length > 0 ? loaded : blankRows());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not open the playset.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(set: CreatorPlaysetSummary) {
    if (!token) return;
    setBusy(true);
    clearFeedback();
    try {
      if (set.status === "PUBLISHED") {
        await creatorPlaysetAction(token, set.id, "unpublish", set.revision);
        setMessage(`“${set.title}” is now a draft.`);
      } else {
        const detail = await getCreatorPlayset(token, set.id);
        let revision = detail.revision;
        if (detail.visibility === "PRIVATE") {
          const updated = await updateCreatorPlayset(token, detail.id, {
            title: detail.title,
            description: detail.description,
            metricName: detail.metricName,
            metricUnit: detail.metricUnit,
            visibility: "PUBLIC",
            items: (detail.items ?? []).map((item) => ({
              id: item.id,
              name: item.name,
              value: item.value,
              sourceLabel: item.sourceLabel,
              imageUrl: item.imageUrl,
            })),
            expectedRevision: revision,
          });
          revision = updated.revision;
        }
        await creatorPlaysetAction(token, set.id, "publish", revision);
        setMessage(`“${set.title}” is live.`);
      }
      await loadSets(token);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not change the playset status.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveSet() {
    if (!token || !deleteTarget) return;
    setBusy(true);
    clearFeedback();
    try {
      await archiveCreatorPlayset(token, deleteTarget.id, deleteTarget.revision);
      if (editingId === deleteTarget.id) resetEditor();
      setMessage(`“${deleteTarget.title}” was archived.`);
      setDeleteTarget(null);
      await loadSets(token);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Could not archive the playset.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setSets([]);
    resetEditor();
  }

  async function signIn() {
    if (!supabase || !email.trim()) return;
    setBusy(true);
    setSignInMessage("");
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/studio` },
    });
    setBusy(false);
    setSignInMessage(signInError ? signInError.message : "Check your email for the secure sign-in link.");
  }

  if (!supabase) {
    return (
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-8">
        <Link href="/" className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]"><ArrowLeft size={15} className="mr-2 inline" />Back to game</Link>
        <section className="mt-16 rounded-md border border-white/20 bg-[#1b1734] p-7">
          <h1 className="text-4xl font-bold">CREATOR STUDIO</h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Creator sign-in needs the Supabase URL and publishable key in the frontend environment.</p>
        </section>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-8">
        <Link href="/" className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]"><ArrowLeft size={15} className="mr-2 inline" />Back to game</Link>
        <section className="mt-16 rounded-md border border-white/20 bg-[#1b1734] p-7 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-highlight)]">Creator Studio</p>
          <h1 className="mt-3 text-4xl font-bold [text-shadow:3px_3px_0_var(--accent-time-attack)] sm:text-5xl">BUILD A PLAYSET</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">Create a Higher or Lower set with your own items and measurable values. Sign in with a magic link to begin.</p>
          <label className={`${LABEL} mt-8 block`}>Email
            <input className={FIELD} value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" onKeyDown={(event) => { if (event.key === "Enter") void signIn(); }} />
          </label>
          <button className={`${PRIMARY} mt-5`} disabled={busy || !email.trim()} onClick={() => void signIn()}>
            {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />} Send sign-in link
          </button>
          {signInMessage && <p role="status" className="mt-4 text-sm text-[var(--accent-highlight)]">{signInMessage}</p>}
        </section>
      </main>
    );
  }

  const editingSet = sets.find((set) => set.id === editingId);
  const readOnly = editingSet?.status === "ARCHIVED";

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-5">
          <Link href="/" className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)] hover:text-white"><ArrowLeft size={15} className="mr-2 inline" />Back to game</Link>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-highlight)]">Creator Studio</span>
        </div>
        <div className="flex items-center gap-3">
          <button className={SECONDARY} onClick={() => { resetEditor(); setMessage("Started a new draft."); }}><Plus size={14} />New playset</button>
          <button className="text-xs text-[var(--text-muted)] hover:text-white" onClick={() => void signOut()}>Sign out</button>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="min-w-0 rounded-md border border-white/20 bg-[#1b1734] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent-highlight)]">{editorMode === "edit" ? "Editing playset" : "New playset"}</p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{editorMode === "edit" ? (title || "Untitled draft") : "MAKE IT COMPARABLE"}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">Every row needs an item name and a number. Use the same unit for every row—for example, all populations in people or all prices in USD.</p>
            </div>
            {editingSet && <span className="rounded-sm border border-white/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{statusLabel(editingSet.status)}</span>}
          </div>

          {editorMode === "create" && (
            <div className="mt-7 rounded-sm border border-white/15 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2"><Sparkles size={15} className="text-[var(--accent-highlight)]" /><h2 className="text-xs font-bold uppercase tracking-[0.1em]">Start from an example</h2></div>
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">Templates are editable. Values use real-world estimates and can be replaced.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TEMPLATES.map((template) => <button key={template.label} type="button" className={SECONDARY} onClick={() => applyTemplate(template)}>{template.label}<ArrowRight size={13} /></button>)}
              </div>
            </div>
          )}

          <fieldset disabled={readOnly || busy} className="mt-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={`${LABEL} sm:col-span-2`}>Title <span className="normal-case tracking-normal text-[var(--text-muted)]">3–100 characters</span>
                <input className={FIELD} value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Countries by Population" />
              </label>
              <label className={`${LABEL} sm:col-span-2`}>Description <span className="normal-case tracking-normal text-[var(--text-muted)]">optional, up to 500 characters</span>
                <textarea className={`${FIELD} min-h-20 resize-y`} value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="What will players compare?" />
              </label>
              <label className={LABEL}>Value name <span className="normal-case tracking-normal text-[var(--text-muted)]">up to 60</span>
                <input className={FIELD} value={metricName} maxLength={60} onChange={(event) => setMetricName(event.target.value)} placeholder="Population" />
              </label>
              <label className={LABEL}>Unit <span className="normal-case tracking-normal text-[var(--text-muted)]">up to 60</span>
                <input className={FIELD} value={metricUnit} maxLength={60} onChange={(event) => setMetricUnit(event.target.value)} placeholder="people" />
              </label>
            </div>

            <div className="mt-7">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Items and values</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Enter plain numbers only: <code>1200000</code> or <code>1.2e6</code>. Commas are optional. Negative numbers are allowed.</p>
                </div>
                <span className="text-xs tabular-nums text-[var(--text-muted)]">{completedRows.length}/200 completed</span>
              </div>

              <div className="mt-4 hidden grid-cols-[minmax(0,1.2fr)_minmax(110px,.65fr)_minmax(0,1fr)_40px] gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] sm:grid">
                <span>Item name</span><span>Number</span><span>Source note</span><span />
              </div>
              <div className="mt-2 space-y-2">
                {items.map((item, index) => (
                  <div key={item.id ?? index} className="grid gap-2 rounded-sm border border-white/10 bg-black/10 p-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(110px,.65fr)_minmax(0,1fr)_40px] sm:border-0 sm:bg-transparent sm:p-0">
                    <label className="sm:hidden text-[10px] font-bold uppercase text-[var(--text-muted)]">Item name<input className={FIELD} value={item.name} maxLength={100} onChange={(event) => updateItem(index, "name", event.target.value)} placeholder={index === 0 ? "Japan" : "Item name"} /></label>
                    <input className={`${FIELD} hidden sm:block`} value={item.name} maxLength={100} onChange={(event) => updateItem(index, "name", event.target.value)} placeholder={index === 0 ? "Japan" : "Item name"} aria-label={`Row ${index + 1} item name`} />
                    <label className="sm:hidden text-[10px] font-bold uppercase text-[var(--text-muted)]">Number<input className={FIELD} value={item.value} inputMode="decimal" onChange={(event) => updateItem(index, "value", event.target.value)} placeholder="1200000" /></label>
                    <input className={`${FIELD} hidden sm:block`} value={item.value} inputMode="decimal" onChange={(event) => updateItem(index, "value", event.target.value)} placeholder="1200000" aria-label={`Row ${index + 1} numeric value`} />
                    <label className="sm:hidden text-[10px] font-bold uppercase text-[var(--text-muted)]">Source note<input className={FIELD} value={item.sourceLabel} maxLength={100} onChange={(event) => updateItem(index, "sourceLabel", event.target.value)} placeholder="World Bank, 2024" /></label>
                    <input className={`${FIELD} hidden sm:block`} value={item.sourceLabel} maxLength={100} onChange={(event) => updateItem(index, "sourceLabel", event.target.value)} placeholder="World Bank, 2024" aria-label={`Row ${index + 1} source note`} />
                    <button type="button" className="mt-1 inline-flex h-10 items-center justify-center text-white/55 hover:text-white disabled:opacity-30" onClick={() => removeRow(index)} disabled={items.length === 1} aria-label={`Remove row ${index + 1}`}><Trash2 size={16} /></button>
                    <div className="flex items-center gap-2 sm:col-span-full">
                      <input className={FIELD} value={item.imageUrl} maxLength={500} onChange={(event) => updateItem(index, "imageUrl", event.target.value)} placeholder="https://example.com/image.jpg (optional)" aria-label={`Row ${index + 1} image URL`} />
                      {item.imageUrl.trim().startsWith("https://") && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl.trim()} alt="" className="size-11 shrink-0 rounded-sm border border-white/15 object-cover" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className={`${SECONDARY} mt-4`} onClick={addRow} disabled={items.length >= 200}><Plus size={15} />Add row</button>
            </div>

            <div className="mt-8 border-t border-white/10 pt-5">
              <h2 className="text-lg font-bold">Who can see it?</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => setVisibility("PUBLIC")} className={`rounded-sm border p-3 text-left transition ${visibility === "PUBLIC" ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/10" : "border-white/15 hover:border-white/35"}`}>
                  <Globe2 size={17} className="text-[var(--accent-highlight)]" /><strong className="mt-2 block text-sm">Public</strong><span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">Listed in solo and multiplayer.</span>
                </button>
                <button type="button" onClick={() => setVisibility("UNLISTED")} className={`rounded-sm border p-3 text-left transition ${visibility === "UNLISTED" ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/10" : "border-white/15 hover:border-white/35"}`}>
                  <EyeOff size={17} className="text-[var(--accent-highlight)]" /><strong className="mt-2 block text-sm">Unlisted</strong><span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">Hidden from lists; shared by playset ID.</span>
                </button>
                <button type="button" onClick={() => setVisibility("PRIVATE")} className={`rounded-sm border p-3 text-left transition ${visibility === "PRIVATE" ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/10" : "border-white/15 hover:border-white/35"}`}>
                  <Lock size={17} className="text-[var(--accent-highlight)]" /><strong className="mt-2 block text-sm">Private draft</strong><span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">Only you can open it.</span>
                </button>
              </div>
            </div>
          </fieldset>

          {error && <div role="alert" className="mt-5 flex gap-2 rounded-sm border border-red-400/40 bg-red-950/30 p-3 text-sm text-red-200"><CircleAlert size={17} className="mt-0.5 shrink-0" />{error}</div>}
          {message && <p role="status" className="mt-5 rounded-sm border border-[var(--accent-highlight)]/35 bg-[var(--accent-highlight)]/10 p-3 text-sm text-[var(--accent-highlight)]">{message}</p>}
          {issues.length > 0 && !readOnly && (
            <details className="mt-4 text-xs text-[var(--text-secondary)]"><summary className="cursor-pointer font-bold">What needs attention ({issues.length})</summary><ul className="mt-2 space-y-1 pl-4">{issues.slice(0, 8).map((issue) => <li key={issue} className="list-disc">{issue}</li>)}{issues.length > 8 && <li className="list-disc">…and {issues.length - 8} more.</li>}</ul></details>
          )}

          {!readOnly && (
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className={SECONDARY} disabled={busy || !canSaveDraft} onClick={() => void saveDraft()}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}Save draft</button>
              <button type="button" className={PRIMARY} disabled={busy || !canPublish} onClick={() => void saveAndPublish()}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}{editorMode === "edit" && editingSet?.status === "PUBLISHED" ? "Save and republish" : "Save and publish"}</button>
              {(editorMode === "create" || editingId) && <button type="button" className="min-h-11 px-3 text-xs text-[var(--text-muted)] hover:text-white" onClick={resetEditor}>Clear</button>}
            </div>
          )}

          {editorMode === "edit" && editingSet && (
            <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
              {editingSet.status !== "ARCHIVED" && <button type="button" className={SECONDARY} disabled={busy} onClick={() => void togglePublished(editingSet)}>{editingSet.status === "PUBLISHED" ? <><EyeOff size={14} />Unpublish</> : <><Eye size={14} />Publish</>}</button>}
              {editingSet.status !== "ARCHIVED" && <button type="button" className={SECONDARY} disabled={busy} onClick={() => setDeleteTarget(editingSet)}><Archive size={14} />Archive</button>}
              {editingSet.status === "PUBLISHED" && <Link className={SECONDARY} href={`/playsets/${encodeURIComponent(editingSet.id)}`}><ArrowRight size={14} />Play solo</Link>}
            </div>
          )}
        </section>

        <aside className="rounded-md border border-white/20 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Your playsets</h2>{loadingSets && <LoaderCircle size={15} className="animate-spin text-[var(--text-muted)]" />}</div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Drafts, published sets, and archived sets stay here.</p>
          <div className="mt-4 space-y-2">
            {sets.map((set) => (
              <article key={set.id} className={`rounded-sm border p-3 transition ${editingId === set.id ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/5" : "border-white/10 bg-black/10"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><h3 className="truncate text-sm font-bold">{set.title}</h3><p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">{statusLabel(set.status)} · {visibilityLabel(set.visibility)} · {set.itemCount} rows</p></div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${set.status === "PUBLISHED" ? "bg-emerald-400/15 text-emerald-300" : set.status === "ARCHIVED" ? "bg-white/10 text-white/50" : "bg-amber-300/15 text-amber-200"}`}>{statusLabel(set.status)}</span>
                </div>
                {set.visibility === "UNLISTED" && <p className="mt-2 break-all rounded bg-black/20 p-1.5 font-mono text-[9px] text-[var(--text-muted)]">{set.id}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--accent-highlight)]" onClick={() => void openEditor(set.id)}><Pencil size={12} />{set.status === "ARCHIVED" ? "View" : "Edit"}</button>
                  {set.status !== "ARCHIVED" && <button className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--text-secondary)] hover:text-white" onClick={() => void togglePublished(set)}>{set.status === "PUBLISHED" ? <><EyeOff size={12} />Unpublish</> : <><Eye size={12} />Publish</>}</button>}
                  {set.status !== "ARCHIVED" && <button className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--text-muted)] hover:text-red-300" onClick={() => setDeleteTarget(set)}><Archive size={12} />Delete</button>}
                  {set.status === "PUBLISHED" && <Link className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--text-secondary)] hover:text-white" href={`/playsets/${encodeURIComponent(set.id)}`}><Check size={12} />Play</Link>}
                </div>
              </article>
            ))}
            {sets.length === 0 && !loadingSets && <p className="rounded-sm border border-dashed border-white/15 p-5 text-center text-xs leading-5 text-[var(--text-muted)]">Nothing here yet. Start with a template or build a set from scratch.</p>}
          </div>
        </aside>
      </div>

      {deleteTarget && (
        <div role="dialog" aria-modal="true" aria-labelledby="archive-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-[#08070f]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border-2 border-white bg-[var(--surface-raised)] p-6 shadow-[8px_8px_0_var(--accent-time-attack)]">
            <div className="flex items-start justify-between gap-4"><div><h2 id="archive-title" className="text-2xl font-bold uppercase">Archive this playset?</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">“{deleteTarget.title}” will disappear from solo and multiplayer. It stays in your Studio list and cannot be edited afterward.</p></div><button onClick={() => setDeleteTarget(null)} aria-label="Close"><X size={19} /></button></div>
            <div className="mt-6 flex gap-3"><button className={`${SECONDARY} flex-1`} onClick={() => setDeleteTarget(null)}>Keep it</button><button className={`${PRIMARY} flex-1`} disabled={busy} onClick={() => void archiveSet()}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Archive size={15} />}Archive</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
