"use client";

import {
  FleetApiError,
  type ComplianceDocType,
  type ComplianceDocument,
} from "@fleet/sdk";
import { useCallback, useEffect, useId, useState } from "react";
import { Banner, Field, PrimaryButton, SecondaryButton, SelectInput, Skeleton, TextInput } from "./ui";
import { themeClasses } from "../../../design/tailwind.theme";
import { api } from "../lib/api";

const DOC_TYPES: { value: ComplianceDocType; label: string }[] = [
  { value: "insurance", label: "Insurance" },
  { value: "inspection", label: "Inspection" },
  { value: "road_tax", label: "Road tax" },
  { value: "registration", label: "Registration" },
  { value: "other", label: "Other" },
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function VehicleDocumentsTab({
  vehicleId,
  offline,
}: {
  vehicleId: string;
  offline: boolean;
}) {
  const [items, setItems] = useState<ComplianceDocument[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [docType, setDocType] = useState<ComplianceDocType>("insurance");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);
  const fileId = useId();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await api.listVehicleDocuments(vehicleId);
      setItems(res.items);
    } catch (err) {
      setItems([]);
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load documents.");
    }
  }, [vehicleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormOk(null);
    if (offline) {
      setFormError("You are offline. Try again when connected.");
      return;
    }
    if (!file) {
      setFormError("Choose a PDF or image file.");
      return;
    }
    setBusy(true);
    try {
      await api.uploadVehicleDocument(vehicleId, {
        doc_type: docType,
        label: label.trim() || undefined,
        file,
      });
      setFile(null);
      setLabel("");
      setFormOk("Document uploaded.");
      await load();
    } catch (err) {
      setFormError(err instanceof FleetApiError ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(docId: string) {
    if (offline) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.deleteVehicleDocument(vehicleId, docId);
      await load();
    } catch (err) {
      setFormError(err instanceof FleetApiError ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={(e) => void onUpload(e)} className="flex flex-col gap-2">
        <h2 className={themeClasses.label}>Upload document</h2>
        {formError ? <Banner tone="danger">{formError}</Banner> : null}
        {formOk ? <p className={themeClasses.caption} role="status">{formOk}</p> : null}
        <Field label="Type">
          <SelectInput
            value={docType}
            onChange={(e) => setDocType(e.target.value as ComplianceDocType)}
            disabled={busy || offline}
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Label (optional)">
          <TextInput
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={120}
            disabled={busy || offline}
          />
        </Field>
        <Field label="File (PDF or image, max 10 MB)">
          <input
            id={fileId}
            type="file"
            accept="application/pdf,image/*"
            disabled={busy || offline}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-body text-text-primary"
          />
        </Field>
        <PrimaryButton type="submit" disabled={busy || offline}>
          {busy ? "Working…" : "Upload"}
        </PrimaryButton>
      </form>

      <div className="flex flex-col gap-1">
        <h2 className={themeClasses.label}>Documents</h2>
        {items === null ? (
          <Skeleton className="h-12" />
        ) : loadError ? (
          <Banner tone="danger">{loadError}</Banner>
        ) : items.length === 0 ? (
          <p className={themeClasses.body}>No documents yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((d) => (
              <li key={d.id} className={`${themeClasses.raised} p-2 flex flex-col gap-1`}>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className={themeClasses.label}>
                    {DOC_TYPES.find((t) => t.value === d.doc_type)?.label ?? d.doc_type}
                    {d.label ? ` · ${d.label}` : ""}
                  </span>
                  <span className={themeClasses.caption}>{formatBytes(d.byte_size)}</span>
                </div>
                <span className={themeClasses.caption}>
                  {new Date(d.created_at).toLocaleString()}
                </span>
                <div className="flex flex-wrap gap-1">
                  {d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className={themeClasses.buttonSecondary}
                    >
                      Download
                    </a>
                  ) : null}
                  <SecondaryButton
                    type="button"
                    disabled={busy || offline}
                    onClick={() => void onDelete(d.id)}
                  >
                    Delete
                  </SecondaryButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
