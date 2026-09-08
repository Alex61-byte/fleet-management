"use client";

import {
  complianceNotificationsA11yLabel,
  vehicleLabel,
  type ComplianceNotificationItem,
} from "@fleet/sdk";
import { themeClasses } from "../../../design/tailwind.theme";
import Link from "next/link";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { NavIcon } from "./nav-icons";
import { Banner, SecondaryButton, Skeleton } from "./ui";

function formatDateOn(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return dateIso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function NotificationItemRow({
  item,
  onNavigate,
}: {
  item: ComplianceNotificationItem;
  onNavigate: () => void;
}) {
  const statusLabel = item.state === "expired" ? "Expired" : "Due soon";
  const badgeClass =
    item.state === "expired" ? themeClasses.badgeExpired : themeClasses.badgeWarning;
  return (
    <Link
      href={`/vehicles/${item.vehicle_id}`}
      onClick={onNavigate}
      className={`${themeClasses.notifMenuItem} hover:bg-hover focus-visible:shadow-ring no-underline`}
    >
      <span className="text-label font-medium text-text-primary">
        {vehicleLabel(item)}
      </span>
      <span className={`${themeClasses.caption} text-text-secondary`}>
        {item.license_plate}
      </span>
      <span className="flex flex-row flex-wrap items-center gap-1">
        <span className={`${themeClasses.caption} text-text-secondary`}>
          {item.field_label}
        </span>
        <span className={badgeClass}>{statusLabel}</span>
        <span className={`${themeClasses.caption} font-tabular tabular-nums text-text-secondary`}>
          {formatDateOn(item.date_on)}
        </span>
      </span>
    </Link>
  );
}

export function NotificationMenuPanel({
  open,
  onClose,
  items,
  truncated,
  loading,
  error,
  offline,
  onRetry,
  titleId,
}: {
  open: boolean;
  onClose: () => void;
  items: ComplianceNotificationItem[];
  truncated: boolean;
  loading: boolean;
  error: string | null;
  offline: boolean;
  onRetry: () => void;
  titleId: string;
}) {
  if (!open) return null;

  let body: ReactNode;
  if (offline || error === "offline") {
    body = (
      <div className="p-2 flex flex-col gap-2">
        <Banner tone="warning">You are offline.</Banner>
      </div>
    );
  } else if (loading) {
    body = (
      <div className="p-2 flex flex-col gap-2" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  } else if (error) {
    body = (
      <div className="p-2 flex flex-col gap-2">
        <Banner>{error}</Banner>
        <SecondaryButton type="button" onClick={onRetry}>
          Try again
        </SecondaryButton>
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <div className={`${themeClasses.emptyState} px-2`}>
        <p className="text-label font-semibold text-text-primary text-center">
          No compliance alerts.
        </p>
        <p className={`${themeClasses.caption} text-text-secondary text-center mt-1`}>
          Insurance, inspection, and road tax are clear for the next 30 days.
        </p>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col">
        {items.map((item) => (
          <NotificationItemRow
            key={`${item.vehicle_id}:${item.field}`}
            item={item}
            onNavigate={onClose}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={`${themeClasses.notifMenuPopover} absolute right-0 top-full mt-1 max-h-[min(420px,70vh)]`}
    >
      <div className={themeClasses.notifMenuHeader}>
        <h2 id={titleId} className={themeClasses.notifMenuTitle}>
          Compliance alerts
        </h2>
        <button
          type="button"
          className={`${themeClasses.buttonGhost} ${themeClasses.buttonIcon}`}
          onClick={onClose}
          aria-label="Close"
        >
          <span aria-hidden="true" className="text-title leading-none">
            ×
          </span>
        </button>
      </div>
      <div className={themeClasses.notifMenuBody}>{body}</div>
      {truncated ? (
        <div className={themeClasses.notifMenuFooter}>
          <p className={`${themeClasses.caption} text-text-secondary`}>
            Showing 50 most urgent.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function NotificationControl({
  count,
  loading,
  error,
  offline,
  items,
  truncated,
  open,
  onOpenChange,
  onRetry,
}: {
  count: number;
  loading: boolean;
  error: string | null;
  offline: boolean;
  items: ComplianceNotificationItem[];
  truncated: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}) {
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const showBadge = count > 0 && !loading && !error && !offline;
  const a11y = complianceNotificationsA11yLabel(showBadge ? count : 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="relative overflow-visible">
      <button
        type="button"
        className={`${themeClasses.buttonIcon} ${themeClasses.buttonGhost} ${themeClasses.notifButton} hover:bg-hover focus-visible:shadow-ring`}
        aria-label={a11y}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
      >
        <NavIcon name="bell" />
        {showBadge ? (
          <span className={themeClasses.notifBadge} aria-hidden="true">
            {count}
          </span>
        ) : null}
      </button>
      <NotificationMenuPanel
        open={open}
        onClose={() => onOpenChange(false)}
        items={items}
        truncated={truncated}
        loading={loading}
        error={error}
        offline={offline}
        onRetry={onRetry}
        titleId={titleId}
      />
    </div>
  );
}
