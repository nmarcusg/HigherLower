"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  ArrowLeft,
  Bell,
  Check,
  CircleAlert,
  Copy,
  Crown,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  ImagePlus,
  LoaderCircle,
  Lock,
  Pencil,
  Plus,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  archiveCreatorPlayset,
  createCreatorPlayset,
  creatorPlaysetAction,
  fetchCreatorNotifications,
  fetchCreatorProfile,
  fetchKofiIntent,
  getCreatorPlayset,
  getSupabaseBrowserClient,
  listCreatorPlaysets,
  markCreatorNotificationsRead,
  startXenditUpgrade,
  updateCreatorPlayset,
  updateCreatorProfile,
  uploadCreatorImage,
  type CreatorNotification,
  type CreatorPlayset,
  type CreatorPlaysetSummary,
  type CreatorProfile,
  type PlaysetVisibility,
} from "@/lib/backend/creator";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { DEFAULT_PUBLIC_SETTINGS, fetchPublicSettings, type PublicSettings } from "@/lib/backend/publicSettings";
import { DECIMAL_PRECISION_OPTIONS, formatPlaysetDisplayValue } from "@/lib/playsets/format";
import NativeModalDialog from "@/components/ui/NativeModalDialog";

type EditorMode = "create" | "edit";
type ItemDraft = {
  id?: string;
  name: string;
  value: string;
  sourceLabel: string;
  imageUrl: string;
  mediaId: string | null;
  uploading?: boolean;
  uploadStatus?: "idle" | "uploading" | "uploaded" | "error";
  uploadFileName?: string;
  uploadMeta?: string;
  uploadError?: string;
  previewUrl?: string;
  previewBroken?: boolean;
};

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
  return Array.from({ length: count }, () => ({
    name: "",
    value: "",
    sourceLabel: "",
    imageUrl: "",
    mediaId: null,
  }));
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
  const [oauthError, setOauthError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingSets, setLoadingSets] = useState(false);

  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [publicSettings, setPublicSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS);
  const [sets, setSets] = useState<CreatorPlaysetSummary[]>([]);
  const [notifications, setNotifications] = useState<CreatorNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRevision, setEditingRevision] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metricName, setMetricName] = useState("Score");
  const [metricUnit, setMetricUnit] = useState("points");
  const [decimalPlaces, setDecimalPlaces] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<PlaysetVisibility>("PUBLIC");
  const [items, setItems] = useState<ItemDraft[]>(blankRows);

  const [deleteTarget, setDeleteTarget] = useState<CreatorPlaysetSummary | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");
  const [kofiInfo, setKofiInfo] = useState<{ kofiUrl: string; claimCode: string; amountUsd: number } | null>(null);
  const [copiedClaim, setCopiedClaim] = useState(false);

  const [handleInput, setHandleInput] = useState("");
  const [editingHandle, setEditingHandle] = useState(false);
  const previewUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    void fetchPublicSettings().then(setPublicSettings);
  }, []);

  const resetEditor = useCallback(() => {
    setEditorMode("create");
    setEditingId(null);
    setEditingRevision(null);
    setTitle("");
    setDescription("");
    setMetricName("Score");
    setMetricUnit("points");
    setDecimalPlaces(null);
    setVisibility("PUBLIC");
    setItems(blankRows());
    setMessage("");
    setError("");
  }, []);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
      if (!session) {
        setProfile(null);
        setSets([]);
        setNotifications([]);
        setUnreadCount(0);
        setNotificationsOpen(false);
        resetEditor();
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [resetEditor, supabase]);

  const loadWorkspace = useCallback(async (accessToken: string) => {
    setLoadingSets(true);
    try {
      const [page, nextProfile, notifFeed] = await Promise.all([
        listCreatorPlaysets(accessToken),
        fetchCreatorProfile(accessToken).catch(() => null),
        fetchCreatorNotifications(accessToken).catch(() => null),
      ]);
      setSets(page.playsets);
      if (nextProfile) {
        setProfile(nextProfile);
        setHandleInput(nextProfile.handle);
      }
      if (notifFeed) {
        setNotifications(notifFeed.notifications);
        setUnreadCount(notifFeed.unreadCount);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your creator workspace.");
    } finally {
      setLoadingSets(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void Promise.resolve().then(() => loadWorkspace(token));
    const onFocus = () => {
      void fetchCreatorNotifications(token)
        .then((feed) => {
          setNotifications(feed.notifications);
          setUnreadCount(feed.unreadCount);
        })
        .catch(() => undefined);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadWorkspace, token]);

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(window.location.search);
    const upgradeStatus = params.get("upgrade");
    if (upgradeStatus !== "success" && upgradeStatus !== "cancelled") return;

    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;

      params.delete("upgrade");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);

      if (upgradeStatus === "cancelled") {
        setMessage("Checkout was cancelled. You can upgrade to Creator Pro anytime.");
        return;
      }

      setMessage("Payment received — confirming your Creator Pro unlock…");
      for (let attempt = 0; attempt < 6; attempt += 1) {
        if (attempt > 0) {
          await new Promise<void>((resolve) => window.setTimeout(resolve, 2000));
        }
        if (cancelled) return;
        try {
          const nextProfile = await fetchCreatorProfile(token);
          if (cancelled) return;
          setProfile(nextProfile);
          if (nextProfile.tier === "PRO") {
            setMessage("Creator Pro unlocked! You now have up to 25 playsets and 200 items per set.");
            return;
          }
        } catch {
          // Retry until attempts are exhausted.
        }
      }
      if (!cancelled) {
        setMessage(
          "Payment received — waiting for the confirmation webhook. Refresh in a moment if Creator Pro has not appeared yet.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleMarkNotificationsRead(ids?: string[]) {
    if (!token) return;
    try {
      const result = await markCreatorNotificationsRead(token, ids);
      const nowIso = new Date().toISOString();
      setUnreadCount(result.unreadCount);
      setNotifications((current) =>
        current.map((item) =>
          !ids || ids.length === 0 || ids.includes(item.id)
            ? { ...item, readAt: item.readAt ?? nowIso }
            : item,
        ),
      );
    } catch {
      // Best-effort notification acknowledgement.
    }
  }

  const maxItemsPerSet = profile?.maxItemsPerSet ?? 50;

  const completedRows = useMemo(
    () =>
      items
        .map((item) => ({ ...item, name: item.name.trim(), value: item.value.trim() }))
        .filter((item) => item.name || item.value),
    [items],
  );
  const parsedValues = completedRows.map((item) => Number(item.value));
  const distinctCount = new Set(parsedValues.filter((value) => Number.isFinite(value))).size;
  const uploadingAny = items.some((item) => item.uploading);

  const issues = useMemo(() => {
    const next: string[] = [];
    if (title.trim().length > 0 && title.trim().length < 3) next.push("Title needs at least 3 characters.");
    if (!title.trim()) next.push("Add a title.");
    if (title.trim().length > 100) next.push("Keep the title under 100 characters.");
    if (description.length > 500) next.push("Keep the description under 500 characters.");
    if (!metricName.trim()) next.push("Name the value being compared.");
    if (metricName.trim().length > 60) next.push("Keep the metric name under 60 characters.");
    if (!metricUnit.trim()) next.push("Add a unit such as people, USD, or points.");
    if (metricUnit.trim().length > 60) next.push("Keep the unit under 60 characters.");
    if (completedRows.length < 5) next.push("Add at least 5 completed rows.");
    if (completedRows.length > maxItemsPerSet) {
      next.push(`Your plan allows up to ${maxItemsPerSet} items per playset.`);
    }
    completedRows.forEach((item, index) => {
      if (!item.name) next.push(`Row ${index + 1}: add an item name.`);
      if (item.name.length > 100) next.push(`Row ${index + 1}: keep the item name under 100 characters.`);
      if (!item.value) next.push(`Row ${index + 1}: add a numeric value.`);
      if (item.value && !Number.isFinite(Number(item.value))) next.push(`Row ${index + 1}: “${item.value}” is not a valid number.`);
      if (item.value && Number.isFinite(Number(item.value)) && Math.abs(Number(item.value)) >= 1e24) next.push(`Row ${index + 1}: keep values below 1e24.`);
    });
    return next;
  }, [completedRows, description, maxItemsPerSet, metricName, metricUnit, title]);

  const canSaveDraft = issues.length === 0 && !uploadingAny;
  const canPublish = canSaveDraft && distinctCount >= 2;

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  function updateItem(index: number, field: "name" | "value" | "sourceLabel", value: string) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  }

  async function handleFileUpload(index: number, file: File | undefined) {
    if (!token || !file) return;
    clearFeedback();
    const objectUrl = URL.createObjectURL(file);
    previewUrlsRef.current.add(objectUrl);

    setItems((current) =>
      current.map((item, idx) => {
        if (idx !== index) return item;
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
          previewUrlsRef.current.delete(item.previewUrl);
        }
        return {
          ...item,
          uploading: true,
          uploadStatus: "uploading",
          uploadFileName: file.name,
          uploadMeta: undefined,
          uploadError: "",
          previewUrl: objectUrl,
          previewBroken: false,
        };
      }),
    );

    try {
      const uploaded = await uploadCreatorImage(token, file);
      URL.revokeObjectURL(objectUrl);
      previewUrlsRef.current.delete(objectUrl);
      const kb = Math.max(1, Math.round(uploaded.byteSize / 1024));
      const meta = `${uploaded.width}×${uploaded.height} · ${kb} KB WebP`;
      setItems((current) =>
        current.map((item, idx) =>
          idx === index
            ? {
                ...item,
                mediaId: uploaded.id,
                imageUrl: uploaded.publicUrl,
                previewUrl: undefined,
                previewBroken: false,
                uploading: false,
                uploadStatus: "uploaded",
                uploadFileName: file.name,
                uploadMeta: meta,
                uploadError: "",
              }
            : item,
        ),
      );
      setMessage(`Image "${file.name}" received and attached to item #${index + 1}.`);
    } catch (uploadError) {
      URL.revokeObjectURL(objectUrl);
      previewUrlsRef.current.delete(objectUrl);
      const errMsg = uploadError instanceof Error ? uploadError.message : "Could not upload image.";
      setError(`Item #${index + 1} image upload failed: ${errMsg}`);
      setItems((current) =>
        current.map((item, idx) =>
          idx === index
            ? {
                ...item,
                uploading: false,
                previewUrl: undefined,
                uploadStatus: "error",
                uploadError: errMsg,
              }
            : item,
        ),
      );
    }
  }

  function clearItemImage(index: number) {
    setItems((current) =>
      current.map((item, idx) => {
        if (idx !== index) return item;
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
          previewUrlsRef.current.delete(item.previewUrl);
        }
        return {
          ...item,
          mediaId: null,
          imageUrl: "",
          previewUrl: undefined,
          previewBroken: false,
          uploadStatus: "idle",
          uploadFileName: undefined,
          uploadMeta: undefined,
          uploadError: undefined,
        };
      }),
    );
  }

  function addRow() {
    if (items.length >= maxItemsPerSet) return;
    setItems((current) => [
      ...current,
      { name: "", value: "", sourceLabel: "", imageUrl: "", mediaId: null },
    ]);
  }

  function removeRow(index: number) {
    setItems((current) =>
      current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current,
    );
  }

  function applyTemplate(template: Template) {
    setTitle(template.title);
    setDescription(template.description);
    setMetricName(template.metricName);
    setMetricUnit(template.metricUnit);
    setDecimalPlaces(0);
    setItems(
      template.items.map(([name, value]) => ({
        name,
        value: String(value),
        sourceLabel: template.sourceLabel,
        imageUrl: "",
        mediaId: null,
      })),
    );
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
      decimalPlaces,
      visibility: nextVisibility,
      items: completedRows.map((item) => ({
        ...(item.id ? { id: item.id } : {}),
        name: item.name,
        value: Number(item.value),
        sourceLabel: item.sourceLabel.trim() || "Manual entry",
        ...(item.mediaId
          ? { mediaId: item.mediaId }
          : item.imageUrl
            ? { imageUrl: item.imageUrl }
            : { mediaId: null, imageUrl: null }),
      })),
    };
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
      setDecimalPlaces(typeof playset.decimalPlaces === "number" ? playset.decimalPlaces : null);
      setVisibility(playset.visibility);
      const loaded: ItemDraft[] =
        playset.items?.map((item) => ({
          id: item.id,
          name: item.name,
          value: String(item.value),
          sourceLabel: item.sourceLabel,
          imageUrl: item.imageUrl ?? "",
          mediaId: item.mediaId ?? null,
        })) ?? [];
      setItems(loaded.length > 0 ? loaded : blankRows());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not open the playset.");
    } finally {
      setBusy(false);
    }
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
        const updated = await updateCreatorPlayset(token, editingId, {
          ...payload(),
          expectedRevision: editingRevision,
        });
        await openEditor(updated.id);
        setMessage("Draft saved. Publish it when you are ready.");
      } else {
        const created = await createCreatorPlayset(token, payload());
        await openEditor(created.id);
        setMessage("Draft saved. You can publish it from here.");
      }
      await loadWorkspace(token);
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
        current = await updateCreatorPlayset(token, editingId, {
          ...payload(nextVisibility),
          expectedRevision: editingRevision,
        });
      } else {
        current = await createCreatorPlayset(token, payload(nextVisibility));
      }
      if (current.status !== "PUBLISHED") {
        current = await creatorPlaysetAction(token, current.id, "publish", current.revision);
      }
      await openEditor(current.id);
      setMessage(
        current.visibility === "UNLISTED"
          ? `Published as unlisted. Share playset ID: ${current.id}.`
          : current.moderationState === "APPROVED"
            ? "Published. It is now live in Community, solo, and multiplayer."
            : `Published as unlisted while awaiting moderator approval. Share playset ID: ${current.id} — you’ll receive a notification once approved for Community.`,
      );
      await loadWorkspace(token);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish the playset.");
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
            decimalPlaces: detail.decimalPlaces ?? null,
            visibility: "PUBLIC",
            items: (detail.items ?? []).map((item) => ({
              id: item.id,
              name: item.name,
              value: item.value,
              sourceLabel: item.sourceLabel,
              ...(item.mediaId ? { mediaId: item.mediaId } : { imageUrl: item.imageUrl }),
            })),
            expectedRevision: revision,
          });
          revision = updated.revision;
        }
        const published = await creatorPlaysetAction(token, set.id, "publish", revision);
        setMessage(
          published.visibility === "PUBLIC" && published.moderationState !== "APPROVED"
            ? `“${set.title}” was published as unlisted while awaiting moderator approval. Share ID: ${published.id} — we’ll notify you when it’s approved for Community.`
            : `“${set.title}” is live.`,
        );
      }
      await loadWorkspace(token);
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
      setMessage(`“${deleteTarget.title}” was archived and freed a slot.`);
      setDeleteTarget(null);
      await loadWorkspace(token);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Could not archive the playset.");
    } finally {
      setBusy(false);
    }
  }

  async function saveHandle() {
    if (!token || !handleInput.trim()) return;
    setBusy(true);
    clearFeedback();
    try {
      const updated = await updateCreatorProfile(token, { handle: handleInput.trim().toLowerCase() });
      setProfile((cur) => (cur ? { ...cur, handle: updated.handle } : cur));
      setEditingHandle(false);
      setMessage(`Handle updated to @${updated.handle}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update handle.");
    } finally {
      setBusy(false);
    }
  }

  async function openUpgradeModal() {
    setUpgradeError("");
    setUpgradeBusy(false);
    setUpgradeOpen(true);
    setKofiInfo(null);
    if (token && publicSettings.payments.kofiEnabled) {
      try {
        setKofiInfo(await fetchKofiIntent(token));
      } catch {
        // Optional Ko-fi intent fetch; UI handles unavailability cleanly.
      }
    }
  }

  async function launchXenditCheckout() {
    if (!token) return;
    setUpgradeBusy(true);
    setUpgradeError("");
    try {
      const { invoiceUrl } = await startXenditUpgrade(token);
      window.location.href = invoiceUrl;
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : "Could not start Xendit checkout.");
      setUpgradeBusy(false);
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setProfile(null);
    setSets([]);
    resetEditor();
  }

  async function signInWithDiscord() {
    if (!supabase) return;
    setBusy(true);
    setOauthError("");
    const { error: authErr } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/studio` },
    });
    if (authErr) {
      setBusy(false);
      setOauthError(authErr.message);
    }
  }

  if (!supabase) {
    return (
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-8">
        <Link href="/" className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          <ArrowLeft size={15} className="mr-2 inline" />
          Back to game
        </Link>
        <section className="mt-16 rounded-md border border-white/20 bg-[#1b1734] p-7">
          <h1 className="text-4xl font-bold">CREATOR STUDIO</h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Creator sign-in needs the Supabase URL and publishable key in the frontend environment.
          </p>
        </section>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-8">
        <Link href="/" className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          <ArrowLeft size={15} className="mr-2 inline" />
          Back to game
        </Link>
        <section className="mt-16 rounded-md border border-white/20 bg-[#1b1734] p-7 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-highlight)]">
            Creator Studio
          </p>
          <h1 className="mt-3 text-4xl font-bold [text-shadow:3px_3px_0_var(--accent-time-attack)] sm:text-5xl">
            BUILD A PLAYSET
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
            Create Higher or Lower sets with your own items, custom WebP images, and measurable stats.
            Free accounts include up to 3 active playsets (50 items each). Sign in with Discord or
            Google to start.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void signInWithDiscord()}
              className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-sm bg-[#5865F2] px-5 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? <LoaderCircle size={15} className="animate-spin" /> : null}
              Continue with Discord
            </button>
            <GoogleSignInButton
              supabase={supabase}
              redirectPath="/studio"
              disabled={busy}
              onBusyChange={setBusy}
              onError={setOauthError}
              fallbackClassName="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-sm border border-white/80 bg-white px-5 text-xs font-bold uppercase tracking-[0.1em] text-[#15122b] transition hover:brightness-95 disabled:opacity-50"
            />
          </div>

          {oauthError && (
            <p role="alert" className="mt-4 rounded-sm border border-red-400/40 bg-red-950/30 p-3 text-xs text-red-200">
              {oauthError}
            </p>
          )}
        </section>
      </main>
    );
  }

  const editingSet = sets.find((set) => set.id === editingId);
  const readOnly =
    editingSet?.status === "ARCHIVED" || editingSet?.moderationState === "REMOVED";
  const isPro = profile?.tier === "PRO";
  const activePublishBan = profile?.restrictions.find(
    (r) => r.type === "PUBLISH_BAN" || r.type === "SUSPENDED",
  );
  const analyticsByPlayset = new Map(
    (profile?.analytics ?? []).map((a) => [a.playsetId, a]),
  );

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)] hover:text-white">
            <ArrowLeft size={15} className="mr-2 inline" />
            Back to game
          </Link>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-highlight)]">
            Creator Studio
          </span>
          {profile?.isStaff && (
            <Link
              href="/admin"
              className="rounded-sm border border-[var(--accent-action-higher)]/45 bg-[var(--accent-action-higher)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent-action-higher)] hover:bg-[var(--accent-action-higher)] hover:text-[#15122b]"
            >
              Admin Console
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {profile && !isPro && (
            <button
              type="button"
              onClick={() => void openUpgradeModal()}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-sm bg-[var(--accent-time-attack)] px-3.5 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
            >
              <Crown size={14} aria-hidden="true" />
              Upgrade to Pro
            </button>
          )}
          <button
            type="button"
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((open) => !open)}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-sm border border-white/25 px-3 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:border-white hover:bg-white/5"
          >
            <Bell size={14} aria-hidden="true" />
            Notifications
            {unreadCount > 0 && (
              <span className="rounded-full bg-[var(--accent-highlight)] px-1.5 py-0.5 text-[10px] font-black text-[#15122b]">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            className={SECONDARY}
            onClick={() => {
              resetEditor();
              setMessage("Started a new draft.");
            }}
          >
            <Plus size={14} />
            New playset
          </button>
          <button className="text-xs text-[var(--text-muted)] hover:text-white" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {unreadCount > 0 && !notificationsOpen && notifications[0] && (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-[var(--accent-highlight)]/45 bg-[var(--accent-highlight)]/10 px-4 py-3 text-xs text-white"
        >
          <div className="flex items-start gap-2.5">
            <Bell size={15} className="mt-0.5 shrink-0 text-[var(--accent-highlight)]" aria-hidden="true" />
            <div>
              <p className="font-bold text-[var(--accent-highlight)]">
                {notifications[0].title}
                {unreadCount > 1 ? ` (+${unreadCount - 1} more)` : ""}
              </p>
              <p className="mt-0.5 text-[var(--text-secondary)]">{notifications[0].message}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="rounded-sm border border-white/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white hover:bg-white/10"
            >
              View all ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => void handleMarkNotificationsRead()}
              className="rounded-sm bg-[var(--accent-highlight)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#15122b]"
            >
              Mark read
            </button>
          </div>
        </div>
      )}

      {notificationsOpen && (
        <section
          aria-label="Creator notifications"
          className="mt-4 rounded-sm border border-white/20 bg-[#191530] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-[var(--accent-highlight)]" aria-hidden="true" />
              <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-white">
                Creator Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[var(--accent-highlight)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--accent-highlight)]">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkNotificationsRead()}
                  className="rounded-sm border border-white/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent-highlight)] hover:bg-white/10"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="text-xs text-[var(--text-muted)] hover:text-white"
              >
                Close
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="py-4 text-xs text-[var(--text-muted)]">
              No moderation notifications yet. You’ll see updates here whenever a moderator approves,
              restores, hides, or removes one of your playsets.
            </p>
          ) : (
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {notifications.map((notif) => {
                const unread = !notif.readAt;
                return (
                  <li
                    key={notif.id}
                    className={`rounded-sm border p-3 text-xs ${
                      unread
                        ? "border-[var(--accent-highlight)]/45 bg-[var(--accent-highlight)]/10"
                        : "border-white/10 bg-black/15"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-white">
                          {notif.title}
                          {unread && (
                            <span className="ml-2 rounded-full bg-[var(--accent-highlight)] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#15122b]">
                              New
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-[var(--text-secondary)]">{notif.message}</p>
                        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {notif.playsetId && notif.type === "PLAYSET_APPROVED" && (
                          <Link
                            href={`/playsets/${encodeURIComponent(notif.playsetId)}`}
                            className="rounded-sm border border-emerald-400/40 bg-emerald-950/35 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-200 hover:bg-emerald-900/50"
                          >
                            View public page
                          </Link>
                        )}
                        {notif.playsetId && (
                          <button
                            type="button"
                            onClick={() => void openEditor(notif.playsetId!)}
                            className="rounded-sm border border-white/25 px-2.5 py-1 text-[10px] font-bold uppercase text-white hover:bg-white/10"
                          >
                            Open in editor
                          </button>
                        )}
                        {unread && (
                          <button
                            type="button"
                            onClick={() => void handleMarkNotificationsRead([notif.id])}
                            className="text-[10px] font-bold uppercase text-[var(--accent-highlight)] hover:underline"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {profile && (
        <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-sm border border-white/15 bg-[#191530] px-4 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                isPro
                  ? "border border-[var(--accent-highlight)]/50 bg-[var(--accent-highlight)]/15 text-[var(--accent-highlight)]"
                  : "border border-white/20 bg-white/5 text-[var(--text-secondary)]"
              }`}
            >
              {isPro && <Sparkles size={11} aria-hidden="true" />}
              {isPro ? "Creator Pro" : "Free Plan"}
            </span>

            {editingHandle ? (
              <div className="flex items-center gap-2">
                <input
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  maxLength={30}
                  aria-label="Creator handle"
                  className="rounded-sm border border-white/25 bg-[#121024] px-2 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => void saveHandle()}
                  className="rounded-sm bg-[var(--accent-highlight)] px-2 py-1 text-[10px] font-bold uppercase text-[#15122b]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingHandle(false);
                    setHandleInput(profile.handle);
                  }}
                  className="text-[10px] text-[var(--text-muted)] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingHandle(true)}
                className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-white"
              >
                <span>@{profile.handle}</span>
                <Pencil size={11} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-muted)]">
            <span>
              Slots:{" "}
              <strong className="text-white">
                {profile.activeSlotsUsed}/{profile.maxPlaysets}
              </strong>
              {!isPro && profile.devicePoolSlotsUsed > profile.activeSlotsUsed
                ? ` (${profile.devicePoolSlotsUsed}/${profile.maxPlaysets} across linked free accounts on this device)`
                : ""}
            </span>
            <span>
              Items limit: <strong className="text-white">{profile.maxItemsPerSet}/set</strong>
            </span>
            {isPro && (
              <span className="text-emerald-300">Ad-free unlocked · Studio analytics enabled</span>
            )}
          </div>
        </section>
      )}

      {activePublishBan && (
        <div role="alert" className="mt-4 flex items-center gap-2 rounded-sm border border-red-400/40 bg-red-950/35 p-3 text-xs text-red-200">
          <ShieldAlert size={16} className="shrink-0" aria-hidden="true" />
          <span>
            Publishing restricted ({activePublishBan.type}): {activePublishBan.reason}
          </span>
        </div>
      )}

      <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 rounded-md border border-white/20 bg-[#1b1734] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent-highlight)]">
                {editorMode === "edit" ? "Editing playset" : "New playset"}
              </p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                {editorMode === "edit" ? title || "Untitled draft" : "MAKE IT COMPARABLE"}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                Every row needs an item name and a number. Use the same unit for every row—for
                example, all populations in people or all prices in USD.
              </p>
            </div>
            {editingSet && (
              <div className="flex flex-wrap gap-2">
                <span className="rounded-sm border border-white/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  {statusLabel(editingSet.status)}
                </span>
                {editingSet.moderationState && editingSet.moderationState !== "UNREVIEWED" && editingSet.moderationState !== "APPROVED" && (
                  <span className="rounded-sm border border-red-400/40 bg-red-950/35 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-200">
                    {editingSet.moderationState}
                  </span>
                )}
              </div>
            )}
          </div>

          {editingSet?.moderationState === "REMOVED" && (
            <div role="alert" className="mt-4 rounded-sm border border-red-400/40 bg-red-950/35 p-3 text-xs text-red-200">
              Removed by moderation{editingSet.moderationReason ? `: ${editingSet.moderationReason}` : "."} This playset cannot be edited or republished.
            </div>
          )}
          {editingSet?.moderationState === "HIDDEN" && (
            <div role="status" className="mt-4 rounded-sm border border-amber-400/40 bg-amber-950/35 p-3 text-xs text-amber-200">
              Hidden from public discovery by moderation{editingSet.moderationReason ? `: ${editingSet.moderationReason}` : "."} Public links and discovery feeds will not list this playset until restored.
            </div>
          )}
          {!publicSettings.features.creatorPublishEnabled && (
            <div role="status" className="mt-4 rounded-sm border border-amber-400/40 bg-amber-950/35 p-3 text-xs text-amber-200">
              Publishing is currently paused by platform administrators. Publishing and republishing are disabled until restored.
            </div>
          )}
          {!publicSettings.features.creatorUploadEnabled && (
            <div role="status" className="mt-4 rounded-sm border border-amber-400/40 bg-amber-950/35 p-3 text-xs text-amber-200">
              Image uploads are temporarily disabled by platform administrators.
            </div>
          )}
          {publicSettings.features.mediaStorageConfigured === false && (
            <div role="status" className="mt-4 rounded-sm border border-amber-400/40 bg-amber-950/35 p-3 text-xs text-amber-200">
              Image uploads are temporarily unavailable: server media storage is not configured yet.
            </div>
          )}
          {editingSet?.status === "PUBLISHED" &&
            editingSet.visibility === "PUBLIC" &&
            editingSet.moderationState === "UNREVIEWED" && (
              <div role="status" className="mt-4 rounded-sm border border-amber-400/40 bg-amber-950/35 p-3 text-xs leading-5 text-amber-100">
                <strong>Pending moderator approval — currently unlisted.</strong> Anyone with this
                playset&apos;s link or ID can play it now. Once approved by a moderator, it will
                appear in Community and you&apos;ll receive a notification.
              </div>
            )}

          {editorMode === "create" && (
            <div className="mt-7 rounded-sm border border-white/15 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-[var(--accent-highlight)]" />
                <h2 className="text-xs font-bold uppercase tracking-[0.1em]">Start from an example</h2>
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                Templates are editable. Values use real-world estimates and can be replaced.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.label}
                    type="button"
                    className={SECONDARY}
                    onClick={() => applyTemplate(template)}
                  >
                    {template.label}
                    <ArrowRight size={13} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <fieldset disabled={readOnly || busy} className="mt-7">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className={`${LABEL} sm:col-span-3`}>
                Title{" "}
                <span className="normal-case tracking-normal text-[var(--text-muted)]">
                  3–100 characters
                </span>
                <input
                  className={FIELD}
                  value={title}
                  maxLength={100}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Countries by Population"
                />
              </label>
              <label className={`${LABEL} sm:col-span-3`}>
                Description{" "}
                <span className="normal-case tracking-normal text-[var(--text-muted)]">
                  optional, up to 500 characters
                </span>
                <textarea
                  className={`${FIELD} min-h-20 resize-y`}
                  value={description}
                  maxLength={500}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What will players compare?"
                />
              </label>
              <label className={LABEL}>
                Value name{" "}
                <span className="normal-case tracking-normal text-[var(--text-muted)]">up to 60</span>
                <input
                  className={FIELD}
                  value={metricName}
                  maxLength={60}
                  onChange={(event) => setMetricName(event.target.value)}
                  placeholder="Population"
                />
              </label>
              <label className={LABEL}>
                Unit{" "}
                <span className="normal-case tracking-normal text-[var(--text-muted)]">up to 60</span>
                <input
                  className={FIELD}
                  value={metricUnit}
                  maxLength={60}
                  onChange={(event) => setMetricUnit(event.target.value)}
                  placeholder="people, mm, USD, %"
                />
              </label>
              <label className={LABEL}>
                Decimal precision{" "}
                <span className="normal-case tracking-normal text-[var(--text-muted)]">display</span>
                <select
                  className={FIELD}
                  value={decimalPlaces === null ? "" : String(decimalPlaces)}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setDecimalPlaces(raw === "" ? null : Number(raw));
                  }}
                >
                  {DECIMAL_PRECISION_OPTIONS.map((option) => (
                    <option key={option.value || "auto"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-white/15 bg-black/20 px-3.5 py-2.5 text-xs">
              <span className="text-[var(--text-muted)]">
                Gameplay display preview ({metricName.trim() || "Value"}):
              </span>
              <strong className="font-bold text-[var(--accent-highlight)]">
                {formatPlaysetDisplayValue(
                  items
                    .map((row) => row.value.trim())
                    .find((v) => v.length > 0 && Number.isFinite(Number(v))) ?? "1234.56",
                  metricUnit,
                  decimalPlaces,
                )}
              </strong>
            </div>

            <div className="mt-7">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Items and values</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                    Enter plain numbers only: <code>1200000</code> or <code>1.2e6</code>. Upload PNG,
                    JPEG, or WebP item images (max 2 MB, auto-resized to WebP).
                  </p>
                </div>
                <span className="text-xs tabular-nums text-[var(--text-muted)]">
                  {completedRows.length}/{maxItemsPerSet} completed
                </span>
              </div>

              <div className="mt-4 hidden grid-cols-[minmax(0,1.2fr)_minmax(110px,.65fr)_minmax(0,1fr)_40px] gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] sm:grid">
                <span>Item name</span>
                <span>Number</span>
                <span>Source note</span>
                <span />
              </div>
              <div className="mt-2 space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id ?? index}
                    className="grid gap-2 rounded-sm border border-white/10 bg-black/15 p-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(110px,.65fr)_minmax(0,1fr)_40px]"
                  >
                    <label className="sm:hidden text-[10px] font-bold uppercase text-[var(--text-muted)]">
                      Item name
                      <input
                        className={FIELD}
                        value={item.name}
                        maxLength={100}
                        onChange={(event) => updateItem(index, "name", event.target.value)}
                        placeholder={index === 0 ? "Japan" : "Item name"}
                      />
                    </label>
                    <input
                      className={`${FIELD} hidden sm:block`}
                      value={item.name}
                      maxLength={100}
                      onChange={(event) => updateItem(index, "name", event.target.value)}
                      placeholder={index === 0 ? "Japan" : "Item name"}
                      aria-label={`Row ${index + 1} item name`}
                    />

                    <label className="sm:hidden text-[10px] font-bold uppercase text-[var(--text-muted)]">
                      Number
                      <input
                        className={FIELD}
                        value={item.value}
                        inputMode="decimal"
                        onChange={(event) => updateItem(index, "value", event.target.value)}
                        placeholder="1200000"
                      />
                    </label>
                    <input
                      className={`${FIELD} hidden sm:block`}
                      value={item.value}
                      inputMode="decimal"
                      onChange={(event) => updateItem(index, "value", event.target.value)}
                      placeholder="1200000"
                      aria-label={`Row ${index + 1} numeric value`}
                    />

                    <label className="sm:hidden text-[10px] font-bold uppercase text-[var(--text-muted)]">
                      Source note
                      <input
                        className={FIELD}
                        value={item.sourceLabel}
                        maxLength={100}
                        onChange={(event) => updateItem(index, "sourceLabel", event.target.value)}
                        placeholder="World Bank, 2024"
                      />
                    </label>
                    <input
                      className={`${FIELD} hidden sm:block`}
                      value={item.sourceLabel}
                      maxLength={100}
                      onChange={(event) => updateItem(index, "sourceLabel", event.target.value)}
                      placeholder="World Bank, 2024"
                      aria-label={`Row ${index + 1} source note`}
                    />

                    <button
                      type="button"
                      className="mt-1 inline-flex h-10 items-center justify-center text-white/55 hover:text-white disabled:opacity-30"
                      onClick={() => removeRow(index)}
                      disabled={items.length === 1}
                      aria-label={`Remove row ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>

                    <div className="flex flex-wrap items-center gap-3 pt-1 sm:col-span-full">
                      {(item.previewUrl || item.imageUrl) && !item.previewBroken ? (
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-sm border border-white/25 bg-black/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.previewUrl || item.imageUrl}
                            alt={item.name ? `${item.name} preview` : `Item ${index + 1} preview`}
                            className="h-full w-full object-cover"
                            onError={() =>
                              setItems((current) =>
                                current.map((entry, idx) =>
                                  idx === index ? { ...entry, previewBroken: true } : entry,
                                ),
                              )
                            }
                          />
                        </div>
                      ) : (item.previewUrl || item.imageUrl) && item.previewBroken ? (
                        <div className="grid size-12 shrink-0 place-items-center rounded-sm border border-amber-400/35 bg-amber-950/30 px-1 text-center text-[9px] font-bold text-amber-200">
                          Preview failed
                        </div>
                      ) : null}

                      <label
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-white/20 bg-white/[0.04] px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] transition ${
                          item.uploading || readOnly || busy || !publicSettings.features.creatorUploadEnabled
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer hover:border-white/50 hover:text-white"
                        }`}
                      >
                        {item.uploading ? (
                          <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <ImagePlus size={13} aria-hidden="true" />
                        )}
                        {item.uploading
                          ? "Uploading…"
                          : item.imageUrl
                            ? "Replace image"
                            : "Upload image"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={item.uploading || readOnly || busy || !publicSettings.features.creatorUploadEnabled}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            void handleFileUpload(index, f);
                          }}
                          className="sr-only"
                        />
                      </label>

                      {item.imageUrl && (
                        <button
                          type="button"
                          onClick={() => clearItemImage(index)}
                          className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-red-300"
                        >
                          <X size={12} aria-hidden="true" /> Remove image
                        </button>
                      )}

                      {item.uploadStatus === "uploading" && (
                        <span
                          role="status"
                          aria-live="polite"
                          className="inline-flex items-center gap-1.5 rounded-sm border border-sky-400/35 bg-sky-950/40 px-2.5 py-1 text-[11px] text-sky-200"
                        >
                          <LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
                          Uploading {item.uploadFileName || "image"}…
                        </span>
                      )}

                      {item.uploadStatus === "uploaded" && (
                        <span
                          role="status"
                          aria-live="polite"
                          className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-400/40 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-200"
                        >
                          <Check size={12} aria-hidden="true" />
                          Image received
                          {item.uploadFileName ? `: ${item.uploadFileName}` : ""}
                          {item.uploadMeta ? ` (${item.uploadMeta})` : ""}
                        </span>
                      )}

                      {item.uploadStatus !== "uploaded" &&
                        item.uploadStatus !== "uploading" &&
                        item.uploadStatus !== "error" &&
                        item.imageUrl && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300/85">
                            <Check size={12} aria-hidden="true" />
                            Image attached
                          </span>
                        )}

                      {item.uploadStatus === "error" && item.uploadError && (
                        <span
                          role="alert"
                          className="inline-flex items-center gap-1.5 rounded-sm border border-red-400/40 bg-red-950/40 px-2.5 py-1 text-[11px] text-red-200"
                        >
                          <CircleAlert size={12} aria-hidden="true" />
                          {item.uploadError}
                        </span>
                      )}

                      {item.value.trim().length > 0 && Number.isFinite(Number(item.value.trim())) && (
                        <span className="ml-auto inline-flex items-center rounded-sm border border-white/15 bg-white/[0.04] px-2 py-1 text-[11px] text-[var(--text-secondary)]">
                          Displays as:{" "}
                          <strong className="ml-1 text-[var(--accent-highlight)]">
                            {formatPlaysetDisplayValue(item.value.trim(), metricUnit, decimalPlaces)}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={SECONDARY}
                  onClick={addRow}
                  disabled={items.length >= maxItemsPerSet}
                >
                  <Plus size={15} />
                  Add row
                </button>
                {!isPro && items.length >= maxItemsPerSet && (
                  <button
                    type="button"
                    onClick={() => void openUpgradeModal()}
                    className="text-xs text-[var(--accent-highlight)] underline"
                  >
                    Need up to 200 items/set? Upgrade to Creator Pro
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-5">
              <h2 className="text-lg font-bold">Who can see it?</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setVisibility("PUBLIC")}
                  className={`rounded-sm border p-3 text-left transition ${
                    visibility === "PUBLIC"
                      ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/10"
                      : "border-white/15 hover:border-white/35"
                  }`}
                >
                  <Globe2 size={17} className="text-[var(--accent-highlight)]" />
                  <strong className="mt-2 block text-sm">Public (After approval)</strong>
                  <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">
                    Starts unlisted by link while awaiting review; listed in Community once approved.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("UNLISTED")}
                  className={`rounded-sm border p-3 text-left transition ${
                    visibility === "UNLISTED"
                      ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/10"
                      : "border-white/15 hover:border-white/35"
                  }`}
                >
                  <EyeOff size={17} className="text-[var(--accent-highlight)]" />
                  <strong className="mt-2 block text-sm">Unlisted</strong>
                  <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">
                    Hidden from lists; shared by playset ID.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("PRIVATE")}
                  className={`rounded-sm border p-3 text-left transition ${
                    visibility === "PRIVATE"
                      ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/10"
                      : "border-white/15 hover:border-white/35"
                  }`}
                >
                  <Lock size={17} className="text-[var(--accent-highlight)]" />
                  <strong className="mt-2 block text-sm">Private draft</strong>
                  <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">
                    Only you can open it.
                  </span>
                </button>
              </div>
              {visibility === "PUBLIC" && (
                <p className="mt-3 rounded-sm border border-sky-400/35 bg-sky-950/30 p-3 text-xs leading-5 text-sky-100">
                  Public playsets require moderator approval before appearing in Community. After
                  you publish, your set starts <strong>unlisted</strong> (playable via direct link
                  or ID). You&apos;ll be notified here as soon as a moderator or admin approves it.
                </p>
              )}
            </div>
          </fieldset>

          {error && (
            <div role="alert" className="mt-5 flex gap-2 rounded-sm border border-red-400/40 bg-red-950/30 p-3 text-sm text-red-200">
              <CircleAlert size={17} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {message && (
            <p role="status" className="mt-5 rounded-sm border border-[var(--accent-highlight)]/35 bg-[var(--accent-highlight)]/10 p-3 text-sm text-[var(--accent-highlight)]">
              {message}
            </p>
          )}
          {issues.length > 0 && !readOnly && (
            <details className="mt-4 text-xs text-[var(--text-secondary)]">
              <summary className="cursor-pointer font-bold">What needs attention ({issues.length})</summary>
              <ul className="mt-2 space-y-1 pl-4">
                {issues.slice(0, 8).map((issue) => (
                  <li key={issue} className="list-disc">
                    {issue}
                  </li>
                ))}
                {issues.length > 8 && <li className="list-disc">…and {issues.length - 8} more.</li>}
              </ul>
            </details>
          )}

          {!readOnly && (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className={SECONDARY}
                disabled={busy || !canSaveDraft}
                onClick={() => void saveDraft()}
              >
                {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
                Save draft
              </button>
              <button
                type="button"
                className={PRIMARY}
                disabled={busy || !canPublish || !publicSettings.features.creatorPublishEnabled}
                onClick={() => void saveAndPublish()}
              >
                {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
                {editorMode === "edit" && editingSet?.status === "PUBLISHED"
                  ? "Save and republish"
                  : "Save and publish"}
              </button>
              {(editorMode === "create" || editingId) && (
                <button
                  type="button"
                  className="min-h-11 px-3 text-xs text-[var(--text-muted)] hover:text-white"
                  onClick={resetEditor}
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {editorMode === "edit" && editingSet && (
            <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
              {editingSet.status !== "ARCHIVED" && editingSet.moderationState !== "REMOVED" && (
                <button
                  type="button"
                  className={SECONDARY}
                  disabled={busy || (!publicSettings.features.creatorPublishEnabled && editingSet.status !== "PUBLISHED")}
                  onClick={() => void togglePublished(editingSet)}
                >
                  {editingSet.status === "PUBLISHED" ? (
                    <>
                      <EyeOff size={14} />
                      Unpublish
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      Publish
                    </>
                  )}
                </button>
              )}
              {editingSet.status !== "ARCHIVED" && editingSet.moderationState !== "REMOVED" && (
                <button
                  type="button"
                  className={SECONDARY}
                  disabled={busy}
                  onClick={() => setDeleteTarget(editingSet)}
                >
                  <Archive size={14} />
                  Archive
                </button>
              )}
              {editingSet.status === "PUBLISHED" && editingSet.moderationState !== "REMOVED" && (
                <Link className={SECONDARY} href={`/playsets/${encodeURIComponent(editingSet.id)}`}>
                  <ArrowRight size={14} />
                  Play solo
                </Link>
              )}
            </div>
          )}
        </section>

        <aside className="rounded-md border border-white/20 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Your playsets</h2>
            {loadingSets && <LoaderCircle size={15} className="animate-spin text-[var(--text-muted)]" />}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Drafts, live sets, and archived sets stay here. Archiving frees a slot.
          </p>
          <div className="mt-4 space-y-2.5">
            {sets.map((set) => {
              const stats = analyticsByPlayset.get(set.id);
              const isPendingApproval =
                set.status === "PUBLISHED" &&
                set.visibility === "PUBLIC" &&
                set.moderationState === "UNREVIEWED";
              const isApprovedPublic =
                set.status === "PUBLISHED" &&
                set.visibility === "PUBLIC" &&
                set.moderationState === "APPROVED";
              return (
                <article
                  key={set.id}
                  className={`rounded-sm border p-3 transition ${
                    editingId === set.id
                      ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/5"
                      : "border-white/10 bg-black/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold">{set.title}</h3>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                        {statusLabel(set.status)} · {visibilityLabel(set.visibility)} · {set.itemCount} rows
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                        set.moderationState === "REMOVED"
                          ? "bg-red-500/20 text-red-300"
                          : isPendingApproval
                            ? "bg-amber-400/20 text-amber-200"
                            : isApprovedPublic
                              ? "bg-emerald-400/15 text-emerald-300"
                              : set.status === "PUBLISHED"
                                ? "bg-emerald-400/15 text-emerald-300"
                                : set.status === "ARCHIVED"
                                  ? "bg-white/10 text-white/50"
                                  : "bg-amber-300/15 text-amber-200"
                      }`}
                    >
                      {set.moderationState === "REMOVED"
                        ? "Removed"
                        : isPendingApproval
                          ? "Pending approval"
                          : isApprovedPublic
                            ? "Approved · Live"
                            : statusLabel(set.status)}
                    </span>
                  </div>

                  {isPendingApproval && (
                    <p className="mt-1.5 text-[10px] text-amber-200">
                      Unlisted until approved by a moderator (playable via link/ID below).
                    </p>
                  )}

                  {set.moderationState === "HIDDEN" && (
                    <p className="mt-1.5 text-[10px] text-amber-200">
                      Hidden from public listing (playable via direct link).
                    </p>
                  )}

                  {isPro && stats && (
                    <div className="mt-2 grid grid-cols-3 gap-1 rounded bg-white/[0.03] px-2 py-1.5 text-[10px] text-[var(--text-secondary)]">
                      <span>
                        Plays: <strong className="text-white">{stats.plays30d}</strong>
                      </span>
                      <span>
                        Done: <strong className="text-white">{stats.completionRate}%</strong>
                      </span>
                      <span>
                        Avg: <strong className="text-white">{stats.avgScore}</strong>
                      </span>
                    </div>
                  )}

                  {(set.visibility === "UNLISTED" || isPendingApproval) && (
                    <p className="mt-2 break-all rounded bg-black/20 p-1.5 font-mono text-[9px] text-[var(--text-muted)]">
                      {set.id}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--accent-highlight)]"
                      onClick={() => void openEditor(set.id)}
                    >
                      <Pencil size={12} />
                      {set.status === "ARCHIVED" || set.moderationState === "REMOVED" ? "View" : "Edit"}
                    </button>
                    {set.status !== "ARCHIVED" && set.moderationState !== "REMOVED" && (
                      <button
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--text-secondary)] hover:text-white"
                        onClick={() => void togglePublished(set)}
                      >
                        {set.status === "PUBLISHED" ? (
                          <>
                            <EyeOff size={12} />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Eye size={12} />
                            Publish
                          </>
                        )}
                      </button>
                    )}
                    {set.status !== "ARCHIVED" && set.moderationState !== "REMOVED" && (
                      <button
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--text-muted)] hover:text-red-300"
                        onClick={() => setDeleteTarget(set)}
                      >
                        <Archive size={12} />
                        Archive
                      </button>
                    )}
                    {set.status === "PUBLISHED" && set.moderationState !== "REMOVED" && (
                      <Link
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--text-secondary)] hover:text-white"
                        href={`/playsets/${encodeURIComponent(set.id)}`}
                      >
                        <Check size={12} />
                        Play
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
            {sets.length === 0 && !loadingSets && (
              <p className="rounded-sm border border-dashed border-white/15 p-5 text-center text-xs leading-5 text-[var(--text-muted)]">
                Nothing here yet. Start with a template or build a set from scratch.
              </p>
            )}
          </div>
        </aside>
      </div>

      <NativeModalDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        eyebrow="Confirm Archive"
        title="Archive this playset?"
      >
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          “{deleteTarget?.title}” will disappear from solo and multiplayer, cannot be edited afterward,
          and will free one active creator slot.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            autoFocus
            className={`${SECONDARY} flex-1`}
            onClick={() => setDeleteTarget(null)}
          >
            Keep it
          </button>
          <button
            type="button"
            className={`${PRIMARY} flex-1`}
            disabled={busy}
            onClick={() => void archiveSet()}
          >
            {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Archive size={15} />}
            Archive
          </button>
        </div>
      </NativeModalDialog>

      <NativeModalDialog
        open={upgradeOpen}
        onClose={() => {
          setUpgradeOpen(false);
          setUpgradeError("");
        }}
        eyebrow="One-Time Creator Unlock"
        title="Upgrade to Creator Pro"
      >
        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <ul className="space-y-1.5 rounded-sm border border-white/15 bg-black/20 p-3.5 text-xs">
            <li>• Up to <strong>25 active playsets</strong> (up from 3)</li>
            <li>• Up to <strong>200 items per playset</strong> (up from 50)</li>
            <li>• Studio 30-day plays, completion rate, and average score</li>
            <li>• Creator Pro supporter badge on public playset cards</li>
            <li>• Zero ads across browsing and gameplay while signed in</li>
          </ul>

          {upgradeError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-sm border border-rose-400/40 bg-rose-950/50 px-3 py-2.5 text-xs text-rose-100"
            >
              <CircleAlert size={15} className="mt-0.5 shrink-0 text-rose-300" />
              <span>{upgradeError}</span>
            </div>
          )}

          {publicSettings.payments.xenditEnabled && (
            <button
              type="button"
              disabled={upgradeBusy}
              onClick={() => void launchXenditCheckout()}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[#15122b] hover:brightness-110 disabled:opacity-50"
            >
              <Crown size={15} />
              {upgradeBusy
                ? "Redirecting to Xendit…"
                : `Unlock via GCash / Maya / Card (₱${publicSettings.payments.pricePhp})`}
            </button>
          )}

          {publicSettings.payments.kofiEnabled && (
            <div className="space-y-2 rounded-sm border border-white/15 bg-white/[0.03] p-3.5">
              <p className="text-xs font-bold text-white">
                International / PayPal via Ko-fi (${publicSettings.payments.priceUsd})
              </p>
              <p className="text-[11px] leading-5 text-[var(--text-muted)]">
                Include your personal claim code in the Ko-fi message so Creator Pro unlocks
                automatically:
              </p>
              <div className="flex items-center justify-between gap-2 rounded bg-black/35 px-3 py-2 font-mono text-xs text-[var(--accent-highlight)]">
                <span>{kofiInfo?.claimCode ?? profile?.kofiClaimCode ?? "…"}</span>
                <button
                  type="button"
                  onClick={() => {
                    const code = kofiInfo?.claimCode ?? profile?.kofiClaimCode ?? "";
                    if (code) {
                      void navigator.clipboard?.writeText(code);
                      setCopiedClaim(true);
                      window.setTimeout(() => setCopiedClaim(false), 2000);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-white"
                >
                  {copiedClaim ? <Check size={12} /> : <Copy size={12} />}
                  {copiedClaim ? "Copied" : "Copy"}
                </button>
              </div>
              {kofiInfo?.kofiUrl && (
                <a
                  href={kofiInfo.kofiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm border border-white/30 px-4 text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-white/10"
                >
                  Open Ko-fi Checkout <ExternalLink size={13} />
                </a>
              )}
            </div>
          )}

          {!publicSettings.payments.xenditEnabled && !publicSettings.payments.kofiEnabled && (
            <p className="rounded-sm border border-amber-300/30 bg-amber-950/25 p-3 text-xs text-amber-100">
              Online payments are not enabled yet. Administrators can activate Xendit or Ko-fi (or grant
              Creator Pro directly) from the Admin Console.
            </p>
          )}
        </div>
      </NativeModalDialog>
    </main>
  );
}
