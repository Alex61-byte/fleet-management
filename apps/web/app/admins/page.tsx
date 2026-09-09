"use client";

import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { FormEvent, useEffect, useState } from "react";
import { AppShell, Denied, ErrorRetry } from "../../components/app-shell";
import { Banner, Field, PrimaryButton, Skeleton, TextInput } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

type Admin = { id: string; email: string; role: "admin" };

export default function AdminsPage() {
  const { me, ready, offline } = useAuth();
  const [items, setItems] = useState<Admin[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [banner, setBanner] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.listAdmins();
      setItems(res.items);
    } catch (err) {
      if (err instanceof FleetApiError && err.status === 403) setError("forbidden");
      else setError("Could not load Admins.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready && me) void load();
  }, [ready, me]);

  if (me?.account_kind === "individual") {
    return (
      <AppShell title="Admins">
        <Denied
          title="Not available"
          body="Admins are only available on company accounts."
        />
      </AppShell>
    );
  }

  if (me && me.role !== "owner") {
    return (
      <AppShell title="Admins">
        <Denied title="Not allowed" body="Only the Owner can add Admins." />
      </AppShell>
    );
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setBanner("");
    if (password !== confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.createAdmin(email, password);
      setEmail("");
      setPassword("");
      setConfirm("");
      setShowForm(false);
      await load();
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "email_in_use") setEmailError("This email cannot be used.");
        else if (err.code === "password_too_short") setPasswordError(mapAuthError(err.code, err.message));
        else setBanner(mapAuthError(err.code, err.message));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Admins"
      action={
        <PrimaryButton type="button" onClick={() => setShowForm(true)}>
          Add Admin
        </PrimaryButton>
      }
    >
      {loading ? (
        <Skeleton className="h-12" />
      ) : error === "forbidden" ? (
        <Denied title="Not allowed" body="Only the Owner can add Admins." />
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => void load()} />
      ) : (
        <>
          {items && items.length === 0 ? (
            <p className={themeClasses.body}>No Admins yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {items?.map((a) => (
                <li key={a.id} className={`${themeClasses.raised} p-2 min-h-hit`}>
                  <p className={themeClasses.label}>{a.email}</p>
                  <p className={themeClasses.caption}>Admin</p>
                </li>
              ))}
            </ul>
          )}
          {showForm ? (
            <form className="flex flex-col gap-2 max-w-[400px] mt-2" onSubmit={onCreate} aria-label="Create Admin">
              {banner ? <Banner>{banner}</Banner> : null}
              <Field label="Email" error={emailError}>
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={Boolean(emailError)}
                  required
                  disabled={busy}
                />
              </Field>
              <Field label="Password" hint="At least 8 characters" error={passwordError}>
                <TextInput
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={Boolean(passwordError)}
                  required
                  disabled={busy}
                />
              </Field>
              <Field label="Confirm password">
                <TextInput
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={busy}
                />
              </Field>
              <PrimaryButton type="submit" busy={busy} disabled={offline}>
                Create Admin
              </PrimaryButton>
            </form>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
