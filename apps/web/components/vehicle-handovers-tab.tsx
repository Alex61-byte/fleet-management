"use client";

import {
  FleetApiError,
  odometerUnitLabel,
  type HandoverDetail,
  type HandoverListItem,
  type HandoverType,
} from "@fleet/sdk";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Banner, SecondaryButton, Skeleton } from "./ui";
import { VehicleSideImageViewer } from "./vehicle-side-image-viewer";
import { themeClasses } from "../../../design/tailwind.theme";
import { api } from "../lib/api";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function typeBadge(type: HandoverType) {
  const label = type === "out" ? "Out" : "In";
  const cls = type === "out" ? themeClasses.badgeNeutral : themeClasses.badgeOk;
  return <span className={cls}>{label}</span>;
}

function driverLabel(item: Pick<HandoverListItem, "driver">): string {
  if (item.driver?.email) return item.driver.email;
  return "Unavailable";
}

function serviceSummary(item: HandoverListItem): string {
  return `${item.next_service_days}d · ${item.next_service_distance} ${item.next_service_distance_unit}`;
}

export function VehicleHandoversTab({
  vehicleId,
  offline,
}: {
  vehicleId: string;
  offline: boolean;
}) {
  const [items, setItems] = useState<HandoverListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<HandoverDetail | null | undefined>(undefined);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const closeDetailRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  const loadList = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await api.listVehicleHandovers(vehicleId);
      setItems(res.items);
    } catch (err) {
      setItems([]);
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load handovers.");
    }
  }, [vehicleId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(undefined);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetail(undefined);
    setDetailError(null);
    void (async () => {
      try {
        const d = await api.getVehicleHandover(vehicleId, selectedId);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setDetailError(
            err instanceof FleetApiError ? err.message : "Could not load handover detail.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, vehicleId]);

  useEffect(() => {
    if (selectedId) queueMicrotask(() => closeDetailRef.current?.focus());
  }, [selectedId, detail]);

  const loading = items === null && !loadError;

  return (
    <div className="flex flex-col gap-2" aria-label="Handover history">
      {loadError ? (
        <div className="flex flex-col gap-2">
          <Banner tone="danger">{loadError}</Banner>
          <SecondaryButton type="button" disabled={offline} onClick={() => void loadList()}>
            Retry
          </SecondaryButton>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-1" aria-busy="true">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : items!.length === 0 ? (
        <div className={themeClasses.emptyState}>
          <p className={themeClasses.sectionTitle}>No handovers yet.</p>
          <p className={themeClasses.body}>
            Out and In records for this vehicle will show up here.
          </p>
        </div>
      ) : (
        <>
          <p className={`${themeClasses.caption} font-tabular`}>{items!.length} handovers</p>
          <div className={themeClasses.tableWrap}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-divider text-left">
                  <th className={themeClasses.tableCellMuted}>Type</th>
                  <th className={themeClasses.tableCellMuted}>When</th>
                  <th className={themeClasses.tableCellMuted}>Driver</th>
                  <th className={themeClasses.tableCellMuted}>Mileage</th>
                  <th className={themeClasses.tableCellMuted}>Service</th>
                </tr>
              </thead>
              <tbody>
                {items!.map((item) => {
                  const typeLabel = item.type === "out" ? "Out" : "In";
                  const when = formatWhen(item.created_at);
                  const driver = driverLabel(item);
                  const rowName = `${typeLabel}, ${when}, ${driver}, mileage ${item.mileage} ${item.mileage_unit}`;
                  return (
                    <tr
                      key={item.id}
                      className={`${themeClasses.tableRowHover} cursor-pointer border-b border-divider last:border-0`}
                      tabIndex={0}
                      role="button"
                      aria-label={rowName}
                      onClick={() => setSelectedId(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(item.id);
                        }
                      }}
                    >
                      <td className={themeClasses.tableCell}>
                        <span className="inline-flex items-center gap-1">
                          {typeBadge(item.type)}
                          <span className="sr-only">{typeLabel}</span>
                        </span>
                      </td>
                      <td className={themeClasses.tableCellNum}>{when}</td>
                      <td
                        className={
                          item.driver ? themeClasses.tableCell : themeClasses.tableCellMuted
                        }
                      >
                        {driver}
                      </td>
                      <td className={themeClasses.tableCellNum}>
                        {item.mileage} {item.mileage_unit}
                      </td>
                      <td className={themeClasses.tableCellMuted}>{serviceSummary(item)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedId ? (
        <div
          className={themeClasses.vehicleSideViewerOverlay}
          role="presentation"
          onClick={() => {
            setSelectedId(null);
            setViewerIndex(null);
          }}
        >
          <div
            className={`${themeClasses.vehicleSideViewerDialog} max-w-[560px]`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={themeClasses.vehicleSideViewerToolbar}>
              <button
                ref={closeDetailRef}
                type="button"
                className={`${themeClasses.buttonIcon} ${themeClasses.vehicleSideViewerClose} hover:bg-hover focus-visible:shadow-ring`}
                aria-label="Close handover detail"
                onClick={() => {
                  setSelectedId(null);
                  setViewerIndex(null);
                }}
              >
                ×
              </button>
              <h2 id={titleId} className={themeClasses.vehicleSideViewerTitle}>
                Handover detail
                {detail ? (
                  <>
                    {" "}
                    {typeBadge(detail.type)}
                  </>
                ) : null}
              </h2>
              <span className="w-hit" aria-hidden />
            </div>
            <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[70vh]">
              {detailError ? <Banner tone="danger">{detailError}</Banner> : null}
              {detail === undefined && !detailError ? (
                <div className="flex flex-col gap-1" aria-busy="true">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : null}
              {detail ? (
                <>
                  <DetailRow label="When" value={formatWhen(detail.created_at)} />
                  <DetailRow label="Driver" value={driverLabel(detail)} />
                  {detail.vehicle ? (
                    <DetailRow
                      label="Vehicle"
                      value={`${detail.vehicle.label} · ${detail.vehicle.license_plate}`}
                    />
                  ) : null}
                  <DetailRow
                    label={odometerUnitLabel(detail.mileage_unit)}
                    value={`${detail.mileage} ${detail.mileage_unit}`}
                  />
                  <DetailRow label="Next service (days)" value={String(detail.next_service_days)} />
                  <DetailRow
                    label={`Next service (${odometerUnitLabel(detail.next_service_distance_unit)})`}
                    value={`${detail.next_service_distance} ${detail.next_service_distance_unit}`}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className={themeClasses.label}>Damages</span>
                    {detail.damages_text?.trim() ? (
                      <p className={themeClasses.body}>{detail.damages_text}</p>
                    ) : (
                      <p className={themeClasses.caption}>No damages noted.</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={themeClasses.label}>Damage photos</span>
                    {detail.damage_images.length === 0 ? (
                      <p className={themeClasses.caption}>No damage photos.</p>
                    ) : (
                      <div
                        className={themeClasses.handoverDamageGrid}
                        role="group"
                        aria-label={`Damage photos, ${detail.damage_images.length}`}
                      >
                        {detail.damage_images.map((img, index) => (
                          <button
                            key={img.id}
                            type="button"
                            className={`${themeClasses.handoverDamageThumb} ${themeClasses.handoverDamageThumbFocus} p-0`}
                            aria-label={`Damage photo ${index + 1}`}
                            onClick={() => setViewerIndex(index)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt=""
                              className="h-full w-full object-cover pointer-events-none"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <VehicleSideImageViewer
        open={
          viewerIndex != null &&
          detail != null &&
          detail.damage_images[viewerIndex] != null
        }
        sideLabel="Damage"
        imageUrl={
          viewerIndex != null && detail
            ? (detail.damage_images[viewerIndex]?.url ?? "")
            : ""
        }
        title={
          viewerIndex != null && detail
            ? `Damage photo ${viewerIndex + 1} of ${detail.damage_images.length}`
            : undefined
        }
        onClose={() => setViewerIndex(null)}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={themeClasses.label}>{label}</span>
      <span className={themeClasses.body}>{value}</span>
    </div>
  );
}
