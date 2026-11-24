"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface NativeModalDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  closedBy?: "any" | "closerequest" | "none";
  maxWidthClass?: string;
  children: ReactNode;
}

/**
 * Native `<dialog>` modal using `showModal()` and declarative `closedby`
 * (with Safari pointer-coordinate backdrop light-dismiss fallback).
 */
export default function NativeModalDialog({
  open,
  onClose,
  title,
  eyebrow,
  closedBy = "any",
  maxWidthClass = "max-w-lg",
  children,
}: NativeModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.returnValue = "";
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => {
      dialog.returnValue = "";
      onCloseRef.current();
    };
    const handleCancel = (event: Event) => {
      if (closedBy === "none") {
        event.preventDefault();
      }
    };
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [closedBy]);

  // Safari fallback for `closedby="any"` using pointerdown+pointerup outside dialog rect.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || closedBy !== "any" || "closedBy" in HTMLDialogElement.prototype) {
      return;
    }

    let pressedOutside = false;
    const isOutside = (event: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      );
    };
    const onPointerDown = (event: PointerEvent) => {
      pressedOutside = isOutside(event);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (pressedOutside && isOutside(event) && dialog.open) {
        dialog.close();
      }
      pressedOutside = false;
    };
    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, [closedBy]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: closedBy } as Record<string, string>)}
      className={`m-auto w-[calc(100%-2rem)] ${maxWidthClass} rounded-md border-2 border-white/80 bg-[#18152e] p-6 text-white shadow-[8px_8px_0_var(--accent-classic)]`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-highlight)]">
              {eyebrow}
            </p>
          )}
          <h1 id={titleId} className="mt-1 text-xl font-bold tracking-tight text-white">
            {title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close dialog"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm border border-white/20 text-[var(--text-secondary)] transition hover:border-white hover:text-white"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </dialog>
  );
}
