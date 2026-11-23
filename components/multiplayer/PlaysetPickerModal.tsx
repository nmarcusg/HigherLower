"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Layers, Search, X } from "lucide-react";
import type { CategoryDomain, CategorySummary, PublicPlaysetSummary } from "@/lib/backend";

export type PlaysetPickerGroup = CategoryDomain | "CUSTOM";

export interface PlaysetPickerOption {
  id: string;
  title: string;
  description: string;
  metricName: string;
  itemCount: number;
  group: PlaysetPickerGroup;
  groupLabel: string;
}

const DOMAIN_LABELS: Record<CategoryDomain, string> = {
  MOVIE_SERIES: "Movies & Series",
  GAMING: "Gaming",
  SOCIAL_MEDIA: "Social Media",
  MUSIC: "Music",
};

const GROUP_ORDER: readonly PlaysetPickerGroup[] = [
  "MOVIE_SERIES",
  "GAMING",
  "SOCIAL_MEDIA",
  "MUSIC",
  "CUSTOM",
];

/**
 * Combine built-in playable categories and public custom playsets into one
 * deduplicated list of picker options. `/playsets` also returns built-in sets,
 * so categories take precedence to retain domain grouping.
 */
export function buildPlaysetPickerOptions(
  categories: readonly CategorySummary[],
  playsets: readonly PublicPlaysetSummary[],
): PlaysetPickerOption[] {
  const options: PlaysetPickerOption[] = [];
  const seen = new Set<string>();

  for (const category of categories) {
    if (!category.playable || !category.playsetId) continue;
    if (seen.has(category.playsetId)) continue;
    seen.add(category.playsetId);
    options.push({
      id: category.playsetId,
      title: category.title,
      description: category.description,
      metricName: category.metric.name,
      itemCount: category.itemCount,
      group: category.domain,
      groupLabel: DOMAIN_LABELS[category.domain],
    });
  }

  for (const playset of playsets) {
    if (seen.has(playset.id)) continue;
    seen.add(playset.id);
    options.push({
      id: playset.id,
      title: playset.title,
      description: playset.description,
      metricName: playset.metricName,
      itemCount: playset.itemCount,
      group: "CUSTOM",
      groupLabel: "Custom",
    });
  }

  return options;
}

interface PlaysetPickerModalProps {
  open: boolean;
  onClose: () => void;
  options: readonly PlaysetPickerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading?: boolean;
  onLoadUnlisted?: (playsetId: string) => Promise<{ ok: boolean; message: string; id?: string }>;
}

export function PlaysetPickerModal({
  open,
  onClose,
  options,
  selectedId,
  onSelect,
  loading = false,
  onLoadUnlisted,
}: PlaysetPickerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<PlaysetPickerGroup | "ALL">("ALL");
  const [unlistedId, setUnlistedId] = useState("");
  const [unlistedStatus, setUnlistedStatus] = useState("");
  const [unlistedBusy, setUnlistedBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      queueMicrotask(() => {
        searchInputRef.current?.focus();
      });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Fallback for browsers without native `closedby="any"` (e.g. Safari):
  // require both pointerdown and pointerup outside the dialog's bounding box so
  // dragging text inside the modal onto the backdrop never closes it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (event: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };

    const handlePointerDown = (event: PointerEvent) => {
      pressedOutside = isOutside(event);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (pressedOutside && isOutside(event)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const availableGroups = useMemo(() => {
    const present = new Set(options.map((option) => option.group));
    return GROUP_ORDER.filter((group) => present.has(group));
  }, [options]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return options.filter((option) => {
      if (activeGroup !== "ALL" && option.group !== activeGroup) return false;
      if (!normalizedQuery) return true;
      return (
        option.title.toLowerCase().includes(normalizedQuery) ||
        option.description.toLowerCase().includes(normalizedQuery) ||
        option.metricName.toLowerCase().includes(normalizedQuery) ||
        option.groupLabel.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [activeGroup, options, query]);

  function handleDialogClose() {
    const dialog = dialogRef.current;
    if (dialog) dialog.returnValue = "";
    onClose();
  }

  function handlePick(id: string) {
    onSelect(id);
    dialogRef.current?.close();
  }

  async function handleLoadUnlistedSubmit() {
    if (!onLoadUnlisted) return;
    const trimmed = unlistedId.trim();
    if (!trimmed) {
      setUnlistedStatus("Enter the playset ID from its shared link.");
      return;
    }
    setUnlistedBusy(true);
    setUnlistedStatus("");
    try {
      const result = await onLoadUnlisted(trimmed);
      setUnlistedStatus(result.message);
      if (result.ok && result.id) {
        onSelect(result.id);
        setUnlistedId("");
        dialogRef.current?.close();
      }
    } finally {
      setUnlistedBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleDialogClose}
      {...({ closedby: "any" } as Record<string, string>)}
      className="m-auto w-[min(94vw,46rem)] max-h-[88dvh] flex-col overflow-hidden rounded-md border border-white/25 bg-[#1b1734] p-0 text-white shadow-[0_12px_0_var(--accent-classic)] backdrop:bg-[#090719]/80 backdrop:backdrop-blur-xs open:flex"
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-action-higher)]">
            Match catalog
          </p>
          <h1 id={titleId} className="mt-1 text-xl font-bold text-white sm:text-2xl">
            Choose a category or playset
          </h1>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close playset picker"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm border border-white/25 text-[var(--text-secondary)] transition hover:border-white hover:bg-white/10 hover:text-white"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="border-b border-white/10 bg-[#15122b]/70 px-5 py-4 sm:px-6">
        <div className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            ref={searchInputRef}
            type="search"
            autoFocus
            aria-label="Search categories and playsets"
            placeholder="Search by title, metric, or domain…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-sm border border-white/25 bg-[#15122b] py-2.5 pr-16 pl-10 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchInputRef.current?.focus();
              }}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent-highlight)] hover:bg-white/10"
            >
              Clear
            </button>
          )}
        </div>

        {availableGroups.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by category group">
            <button
              type="button"
              aria-pressed={activeGroup === "ALL"}
              onClick={() => setActiveGroup("ALL")}
              className={`min-h-8 rounded-sm border px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                activeGroup === "ALL"
                  ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/15 text-white"
                  : "border-white/20 text-[var(--text-secondary)] hover:border-white/45 hover:text-white"
              }`}
            >
              All ({options.length})
            </button>
            {availableGroups.map((group) => {
              const label = group === "CUSTOM" ? "Custom" : DOMAIN_LABELS[group];
              const count = options.filter((option) => option.group === group).length;
              return (
                <button
                  key={group}
                  type="button"
                  aria-pressed={activeGroup === group}
                  onClick={() => setActiveGroup(group)}
                  className={`min-h-8 rounded-sm border px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                    activeGroup === group
                      ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/15 text-white"
                      : "border-white/20 text-[var(--text-secondary)] hover:border-white/45 hover:text-white"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        {loading && options.length === 0 ? (
          <div className="rounded-sm border border-dashed border-white/20 bg-white/[0.02] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
            Loading available categories and playsets…
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="rounded-sm border border-dashed border-white/20 bg-white/[0.02] px-4 py-10 text-center">
            <p className="text-sm font-bold text-white">No categories or playsets match your search</p>
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              Try a different keyword or reset your search filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveGroup("ALL");
                searchInputRef.current?.focus();
              }}
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-sm border border-white/40 px-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-[#15122b]"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {filteredOptions.map((option) => {
              const selected = option.id === selectedId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handlePick(option.id)}
                  aria-pressed={selected}
                  className={`flex flex-col justify-between rounded-sm border p-3.5 text-left transition ${
                    selected
                      ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/12 shadow-[0_0_0_1px_var(--accent-highlight)]"
                      : "border-white/15 bg-[#15122b]/85 hover:border-white/45 hover:bg-white/[0.05]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-sm bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--accent-action-higher)]">
                        {option.groupLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)]">
                        {selected && (
                          <span className="inline-flex items-center gap-1 text-[var(--accent-highlight)]">
                            <Check size={12} aria-hidden="true" /> Selected
                          </span>
                        )}
                        {!selected && option.itemCount > 0 && `${option.itemCount} items`}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-white">{option.title}</p>
                    {option.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--text-secondary)]">
                        {option.description}
                      </p>
                    )}
                  </div>
                  <p className="mt-2.5 border-t border-white/10 pt-2 text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    Metric: <span className="text-white/90">{option.metricName}</span>
                    {selected && option.itemCount > 0 ? ` · ${option.itemCount} items` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {onLoadUnlisted && (
          <details className="mt-5 rounded-sm border border-white/15 bg-[#15122b]/80 px-4 py-3">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
              Use an unlisted playset ID
            </summary>
            <p className="mt-2 text-[11px] leading-5 text-[var(--text-muted)]">
              Paste the playset ID from an unlisted set’s shared link. The set must be published and playable.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                aria-label="Unlisted playset ID"
                value={unlistedId}
                onChange={(event) => setUnlistedId(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleLoadUnlistedSubmit();
                  }
                }}
                placeholder="Playset ID"
                className="w-full rounded-sm border border-white/25 bg-[#15122b] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/30"
              />
              <button
                type="button"
                disabled={unlistedBusy}
                onClick={() => void handleLoadUnlistedSubmit()}
                className="shrink-0 rounded-sm border border-white/35 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-white hover:text-[#15122b] disabled:opacity-50"
              >
                {unlistedBusy ? "Loading…" : "Load"}
              </button>
            </div>
            {unlistedStatus && (
              <p role="status" className="mt-2 text-[11px] text-[var(--accent-highlight)]">
                {unlistedStatus}
              </p>
            )}
          </details>
        )}
      </div>
    </dialog>
  );
}

interface PlaysetPickerFieldProps {
  label?: string;
  options: readonly PlaysetPickerOption[];
  selectedId: string;
  selectedTitleFallback?: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
  onLoadUnlisted?: (playsetId: string) => Promise<{ ok: boolean; message: string; id?: string }>;
  className?: string;
}

export function PlaysetPickerField({
  label = "Category / playset",
  options,
  selectedId,
  selectedTitleFallback,
  onSelect,
  disabled = false,
  loading = false,
  onLoadUnlisted,
  className = "",
}: PlaysetPickerFieldProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selectedId) ?? null,
    [options, selectedId],
  );

  const displayTitle =
    selectedOption?.title ||
    selectedTitleFallback ||
    (loading && !selectedId ? "Loading available categories…" : selectedId || "No playset selected");

  const displaySubtitle = selectedOption
    ? `${selectedOption.groupLabel}${selectedOption.itemCount > 0 ? ` · ${selectedOption.itemCount} items` : ""}`
    : selectedId
      ? "Selected playset"
      : "Pick a category or custom playset";

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        {label}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-white/25 bg-[#15122b] px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{displayTitle}</p>
          <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {displaySubtitle}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setModalOpen(true)}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm border border-[var(--accent-highlight)]/60 bg-[var(--accent-highlight)]/10 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--accent-highlight)] transition hover:bg-[var(--accent-highlight)] hover:text-[#15122b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Layers size={13} aria-hidden="true" />
          Choose playset
        </button>
      </div>

      <PlaysetPickerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        options={options}
        selectedId={selectedId}
        onSelect={onSelect}
        loading={loading}
        onLoadUnlisted={onLoadUnlisted}
      />
    </div>
  );
}
