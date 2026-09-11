"use client";

import {
  complianceNotificationsA11yLabel,
  odometerUnitLabel,
  vehicleLabel,
  type NotificationMenuItem,
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

function itemHref(item: NotificationMenuItem): string {
  if (item.href_hint === "vehicle_handovers") {
    return `/vehicles/${item.vehicle_id}?tab=handovers`;
  }
  if (item.href_hint === "service_due") return "/service-due";
  return `/vehicles/${item.vehicle_id}`;
}

function statusChrome(item: NotificationMenuItem): { label: string; badgeClass: string } {
  if (item.section === "compliance") {
    return {
      label: item.state === "expired" ? "Expired" : "Due soon",
      badgeClass:
        item.state === "expired" ? themeClasses.badgeExpired : themeClasses.badgeWarning,
    };
  }
  if (item.section === "service") {
    if (item.state === "due") {
      return { label: "Due", badgeClass: themeClasses.badgeExpired };
    }
    return { label: "Approaching", badgeClass: themeClasses.badgeWarning };
  }
  return { label: "Out open", badgeClass: themeClasses.badgeWarning };
}

function detailLine(item: NotificationMenuItem): string {
  if (item.section === "compliance" && item.date_on) {
    return formatDateOn(item.date_on);
  }
  if (item.section === "service") {
    if (item.distance_remaining != null && item.distance_unit) {
      const unit = odometerUnitLabel(item.distance_unit);
      if (item.state === "approaching") {
        return `${item.distance_remaining} ${unit} remaining`;
      }
      return item.distance_remaining <= 0
        ? `Due by distance`
        : `${item.distance_remaining} ${unit} left`;
    }
    return item.state === "due" ? "Due by days" : "Service soon";
  }
  if (item.driver_email) return item.driver_email;
  return "Driver unknown";
}

function NotificationItemRow({
  item,
  onNavigate,
}: {
  item: NotificationMenuItem;
  onNavigate: () => void;
}) {
  const chrome = statusChrome(item);
  return (
    <Link
      href={itemHref(item)}
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
        <span className={chrome.badgeClass}>{chrome.label}</span>
        <span className={`${themeClasses.caption} font-tabular tabular-nums text-text-secondary`}>
          {detailLine(item)}
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
  items: NotificationMenuItem[];
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
          No alerts.
        </p>
        <p className={`${themeClasses.caption} text-text-secondary text-center mt-1`}>
          Compliance, service, and open handovers are clear.
        </p>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col">
        {items.map((item) => (
          <NotificationItemRow
            key={`${item.section}:${item.vehicle_id}:${item.field}:${item.handover_id ?? ""}`}
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
          Alerts
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
  items: NotificationMenuItem[];
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
