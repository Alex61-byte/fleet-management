"use client";

import { themeClasses } from "../../../design/tailwind.theme";
import { useEffect, useId, useRef, useState } from "react";

/** design/tokens/motion.json → vehicle-side-zoom */
export const VEHICLE_SIDE_ZOOM = {
  min: 1,
  max: 3,
  step: 0.5,
  default: 1,
} as const;

function clampZoom(value: number): number {
  const stepped = Math.round(value / VEHICLE_SIDE_ZOOM.step) * VEHICLE_SIDE_ZOOM.step;
  return Math.min(VEHICLE_SIDE_ZOOM.max, Math.max(VEHICLE_SIDE_ZOOM.min, Number(stepped.toFixed(2))));
}

export type VehicleSideImageViewerProps = {
  open: boolean;
  sideLabel: string;
  imageUrl: string;
  onClose: () => void;
  /** When set, replaces default `{sideLabel} photo` (e.g. damage photo N of M). */
  title?: string;
};

/**
 * US-42–US-44 view-only side image viewer (web dialog).
 * Separate from clear-confirm; zoom does not write storage.
 * Also reused for handover damage enlarge (US-54/56).
 */
export function VehicleSideImageViewer({
  open,
  sideLabel,
  imageUrl,
  onClose,
  title: titleOverride,
}: VehicleSideImageViewerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(VEHICLE_SIDE_ZOOM.default);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setZoom(VEHICLE_SIDE_ZOOM.default);
    setLoadError(false);
    queueMicrotask(() => closeRef.current?.focus());

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, imageUrl, onClose]);

  if (!open) return null;

  const title = titleOverride?.trim() || `${sideLabel} photo`;
  const atMin = zoom <= VEHICLE_SIDE_ZOOM.min;
  const atMax = zoom >= VEHICLE_SIDE_ZOOM.max;

  return (
    <div
      className={themeClasses.vehicleSideViewerOverlay}
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className={themeClasses.vehicleSideViewerDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={themeClasses.vehicleSideViewerToolbar}>
          <button
            ref={closeRef}
            type="button"
            className={`${themeClasses.buttonIcon} ${themeClasses.vehicleSideViewerClose} hover:bg-hover focus-visible:shadow-ring`}
            aria-label="Close photo viewer"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
          <h2 id={titleId} className={themeClasses.vehicleSideViewerTitle}>
            {title}
          </h2>
          <div className={themeClasses.vehicleSideViewerZoomGroup}>
            <button
              type="button"
              className={`${themeClasses.buttonIcon} ${themeClasses.vehicleSideViewerZoomOut} hover:bg-hover focus-visible:shadow-ring disabled:text-disabled disabled:pointer-events-none`}
              aria-label={atMin ? "Zoom out, minimum zoom" : "Zoom out"}
              disabled={atMin}
              onClick={() => setZoom((z) => clampZoom(z - VEHICLE_SIDE_ZOOM.step))}
            >
              <ZoomOutIcon />
            </button>
            <button
              type="button"
              className={`${themeClasses.buttonIcon} ${themeClasses.vehicleSideViewerZoomIn} hover:bg-hover focus-visible:shadow-ring disabled:text-disabled disabled:pointer-events-none`}
              aria-label={atMax ? "Zoom in, maximum zoom" : "Zoom in"}
              disabled={atMax}
              onClick={() => setZoom((z) => clampZoom(z + VEHICLE_SIDE_ZOOM.step))}
            >
              <ZoomInIcon />
            </button>
          </div>
        </div>
        <div
          className={`${themeClasses.vehicleSideViewerStage} flex`}
          onWheel={(e) => {
            if (e.deltaY === 0) return;
            e.preventDefault();
            setZoom((z) =>
              clampZoom(z + (e.deltaY < 0 ? VEHICLE_SIDE_ZOOM.step : -VEHICLE_SIDE_ZOOM.step)),
            );
          }}
        >
          {loadError ? (
            <p className={`${themeClasses.caption} p-2 text-center`}>Photo could not be shown.</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className={`${themeClasses.vehicleSideViewerImage} object-contain`}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              onError={() => setLoadError(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const iconSvgClass = "block h-nav-icon w-nav-icon shrink-0";

function CloseIcon() {
  return (
    <svg
      className={iconSvgClass}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function ZoomInIcon() {
  return (
    <svg
      className={iconSvgClass}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg
      className={iconSvgClass}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M8 11h6" />
    </svg>
  );
}
