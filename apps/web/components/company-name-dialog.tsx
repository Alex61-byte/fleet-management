"use client";

import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { themeClasses } from "../../../design/tailwind.theme";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { Banner, Field, PrimaryButton, TextInput } from "./ui";

/**
 * Blocking prompt for company Owners whose tenant has no display name
 * (legacy companies created before name was required).
 */
export function CompanyNameDialog() {
  const { me, offline, reload } = useAuth();
  const open = Boolean(me?.company_name_required);
  const titleId = useId();
  const bodyId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setError("");
      setBanner("");
      setBusy(false);
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBanner("");
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Company name is required.");
      return;
    }
    if (offline) {
      setBanner("You are offline.");
      return;
    }
    setBusy(true);
    try {
      await api.setCompanyName({ name: trimmed });
      await reload();
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "validation_error") setError(mapAuthError(err.code, err.message));
        else if (err.code === "forbidden") setBanner("Only the company Owner can set the company name.");
        else setBanner(mapAuthError(err.code, err.message));
      } else {
        setBanner("Unexpected error.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay p-3"
      role="presentation"
    >
      <div
        className={`${themeClasses.raised} shadow-overlay p-3 flex flex-col gap-2 w-full max-w-[400px]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <h2 id={titleId} className={themeClasses.sectionTitle}>
          Add company name
        </h2>
        <p id={bodyId} className={themeClasses.body}>
          Your company account needs a display name. Enter it once — it identifies your workspace
          across Fleet.
        </p>
        {offline ? <Banner tone="warning">You are offline.</Banner> : null}
        {banner ? <Banner>{banner}</Banner> : null}
        <form className="flex flex-col gap-2" onSubmit={onSubmit} aria-label="Set company name">
          <Field label="Company name" error={error}>
            <TextInput
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy || offline}
              required
              autoComplete="organization"
              error={Boolean(error)}
            />
          </Field>
          <PrimaryButton type="submit" busy={busy} disabled={busy || offline || !name.trim()}>
            Save company name
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
