"use client";

import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { themeClasses } from "../../../design/tailwind.theme";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { Banner, Field, PrimaryButton, TextInput } from "./ui";

/**
 * Blocking prompt for drivers missing first/last name (US-121).
 */
export function DriverNameDialog() {
  const { me, offline, reload } = useAuth();
  const open = Boolean(me?.driver_name_required);
  const titleId = useId();
  const bodyId = useId();
  const firstRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [secondLastName, setSecondLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [firstError, setFirstError] = useState("");
  const [lastError, setLastError] = useState("");
  const [banner, setBanner] = useState("");

  useEffect(() => {
    if (!open) {
      setFirstName("");
      setLastName("");
      setSecondLastName("");
      setFirstError("");
      setLastError("");
      setBanner("");
      setBusy(false);
      return;
    }
    const t = window.setTimeout(() => firstRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFirstError("");
    setLastError("");
    setBanner("");
    const first = firstName.trim();
    const last = lastName.trim();
    const second = secondLastName.trim();
    let invalid = false;
    if (!first) {
      setFirstError("Name is required.");
      invalid = true;
    }
    if (!last) {
      setLastError("Last Name is required.");
      invalid = true;
    }
    if (invalid) return;
    if (offline) {
      setBanner("You are offline.");
      return;
    }
    setBusy(true);
    try {
      await api.setMyName({
        first_name: first,
        last_name: last,
        second_last_name: second,
      });
      await reload();
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "validation_error") setBanner(mapAuthError(err.code, err.message));
        else if (err.code === "forbidden") setBanner("Only you can set your name.");
        else setBanner(mapAuthError(err.code, err.message));
      } else {
        setBanner("Unexpected error.");
      }
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = Boolean(firstName.trim() && lastName.trim()) && !busy && !offline;

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
          Add your name
        </h2>
        <p id={bodyId} className={themeClasses.body}>
          Enter your name to continue. This is required before using driver features.
        </p>
        {offline ? <Banner tone="warning">You are offline.</Banner> : null}
        {banner ? <Banner>{banner}</Banner> : null}
        <form className="flex flex-col gap-2" onSubmit={onSubmit} aria-label="Set your name">
          <Field label="Name" error={firstError}>
            <TextInput
              ref={firstRef}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={busy || offline}
              required
              autoComplete="given-name"
              error={Boolean(firstError)}
            />
          </Field>
          <Field label="Last Name" error={lastError}>
            <TextInput
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={busy || offline}
              required
              autoComplete="family-name"
              error={Boolean(lastError)}
            />
          </Field>
          <Field label="Second Last Name">
            <TextInput
              value={secondLastName}
              onChange={(e) => setSecondLastName(e.target.value)}
              disabled={busy || offline}
              autoComplete="additional-name"
            />
          </Field>
          <PrimaryButton type="submit" busy={busy} disabled={!canSubmit}>
            Save
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
