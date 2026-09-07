"use client";

import { themeClasses } from "../../../design/tailwind.theme";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { DangerButton, SecondaryButton } from "./ui";

export type ConfirmDeleteDialogProps = {
  open: boolean;
  title: string;
  body: ReactNode;
  caption?: ReactNode;
  /** Confirm button label when idle */
  confirmLabel: string;
  /** Confirm button label when busy */
  confirmBusyLabel?: string;
  busy?: boolean;
  disabledConfirm?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** Accessible name for the dialog when title is enough */
  cancelLabel?: string;
};

/**
 * Standing destructive-confirm pattern (US-40 / A41 / rule 61).
 * First trigger opens this; delete runs only after Confirm.
 */
export function ConfirmDeleteDialog({
  open,
  title,
  body,
  caption,
  confirmLabel,
  confirmBusyLabel = "Working…",
  busy = false,
  disabledConfirm = false,
  onCancel,
  onConfirm,
  cancelLabel = "Cancel",
}: ConfirmDeleteDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay p-3"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className={`${themeClasses.raised} shadow-overlay p-3 flex flex-col gap-2 w-full max-w-[400px]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={themeClasses.sectionTitle}>
          {title}
        </h2>
        <div id={bodyId} className={themeClasses.body}>
          {body}
        </div>
        {caption ? <p className={themeClasses.caption}>{caption}</p> : null}
        <SecondaryButton ref={cancelRef} type="button" disabled={busy} onClick={onCancel}>
          {cancelLabel}
        </SecondaryButton>
        <DangerButton
          type="button"
          disabled={busy || disabledConfirm}
          aria-label={busy ? confirmBusyLabel : confirmLabel}
          onClick={onConfirm}
        >
          {busy ? confirmBusyLabel : confirmLabel}
        </DangerButton>
      </div>
    </div>
  );
}

/** Outline trash icon for delete/clear icon buttons (decorative when parent has name). */
export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "block h-nav-icon w-nav-icon shrink-0"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
