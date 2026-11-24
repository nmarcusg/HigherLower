"use client";

import { useRef, type KeyboardEvent } from "react";

export interface TabOption<T extends string> {
  id: T;
  label: string;
  badge?: string | number;
}

interface AdminTabsProps<T extends string> {
  label: string;
  tabs: ReadonlyArray<TabOption<T>>;
  activeId: T;
  onChange: (next: T) => void;
}

/**
 * Single-row scrollable ARIA tablist supporting Arrow/Home/End keyboard
 * activation without color-only active indicators.
 */
export default function AdminTabs<T extends string>({
  label,
  tabs,
  activeId,
  onChange,
}: AdminTabsProps<T>) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const target = tabs[nextIndex];
    if (target) {
      onChange(target.id);
      buttonRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div role="tablist" aria-label={label} className="admin-tablist">
      {tabs.map((tab, index) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(index, e)}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
