"use client";

import { FleetApiError, type VehicleIssue } from "@fleet/sdk";
import { useCallback, useEffect, useState } from "react";
import { Banner, Field, PrimaryButton, SecondaryButton, Skeleton, TextInput } from "./ui";
import { themeClasses } from "../../../design/tailwind.theme";
import { api } from "../lib/api";

export function VehicleIssuesTab({
  vehicleId,
  offline,
}: {
  vehicleId: string;
  offline: boolean;
}) {
  const [items, setItems] = useState<VehicleIssue[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await api.listVehicleIssues(vehicleId);
      setItems(res.items);
    } catch (err) {
      setItems([]);
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load issues.");
    }
  }, [vehicleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (offline) {
      setFormError("You are offline. Try again when connected.");
      return;
    }
    const t = title.trim();
    if (!t) {
      setFormError("Title is required.");
      return;
    }
    setBusy(true);
    try {
      await api.createVehicleIssue(vehicleId, {
        title: t,
        description: description.trim() || undefined,
      });
      setTitle("");
      setDescription("");
      await load();
    } catch (err) {
      setFormError(err instanceof FleetApiError ? err.message : "Could not create issue.");
    } finally {
      setBusy(false);
    }
  }

  async function onClose(issueId: string) {
    if (offline) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.closeVehicleIssue(vehicleId, issueId);
      await load();
    } catch (err) {
      setFormError(err instanceof FleetApiError ? err.message : "Could not close issue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={(e) => void onCreate(e)} className="flex flex-col gap-2">
        <h2 className={themeClasses.label}>Report issue</h2>
        {formError ? <Banner tone="danger">{formError}</Banner> : null}
        <Field label="Title">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            disabled={busy || offline}
            required
          />
        </Field>
        <Field label="Description (optional)">
          <TextInput
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            disabled={busy || offline}
          />
        </Field>
        <PrimaryButton type="submit" disabled={busy || offline}>
          {busy ? "Working…" : "Create issue"}
        </PrimaryButton>
      </form>

      <div className="flex flex-col gap-1">
        <h2 className={themeClasses.label}>Issues</h2>
        {items === null ? (
          <Skeleton className="h-12" />
        ) : loadError ? (
          <Banner tone="danger">{loadError}</Banner>
        ) : items.length === 0 ? (
          <p className={themeClasses.body}>No issues yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((issue) => (
              <li key={issue.id} className={`${themeClasses.raised} p-2 flex flex-col gap-1`}>
                <div className="flex flex-wrap items-center gap-1 justify-between">
                  <span className={themeClasses.label}>{issue.title}</span>
                  <span
                    className={
                      issue.status === "open" ? themeClasses.badgeWarning : themeClasses.badgeOk
                    }
                  >
                    {issue.status}
                  </span>
                </div>
                {issue.description ? (
                  <p className={themeClasses.caption}>{issue.description}</p>
                ) : null}
                <span className={themeClasses.caption}>
                  {issue.source === "handover" ? "From handover · " : ""}
                  {new Date(issue.created_at).toLocaleString()}
                </span>
                {issue.status === "open" ? (
                  <SecondaryButton
                    type="button"
                    disabled={busy || offline}
                    onClick={() => void onClose(issue.id)}
                  >
                    Close
                  </SecondaryButton>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
