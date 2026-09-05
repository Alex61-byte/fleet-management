"use client";

import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { AuthShell, Banner, Field, OfflineBanner, PrimaryButton, TextInput, TextLink } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

function InviteAcceptForm() {
  const { applySession, offline } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token")?.trim() ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(Boolean(token));
  const [blocked, setBlocked] = useState(!token);
  const [banner, setBanner] = useState(!token ? "This invitation link is invalid or has expired." : "");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setResolving(true);
      try {
        const preview = await api.previewInvite(token);
        if (cancelled) return;
        setEmail(preview.email);
        setBlocked(false);
        setBanner("");
      } catch (err) {
        if (cancelled) return;
        setBlocked(true);
        if (err instanceof FleetApiError) {
          if (err.code === "login_disabled") setBanner(mapAuthError(err.code, err.message));
          else setBanner("This invitation link is invalid or has expired.");
        } else setBanner("This invitation link is invalid or has expired.");
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setConfirmError("");
    if (password !== confirm) {
      setConfirmError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setBanner("");
    try {
      const res = await api.acceptInvite({
        token,
        email: email.trim(),
        password,
        client: "web",
      });
      await applySession(res.access_token, res.refresh_token, res.principal);
      router.replace("/driver");
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "password_too_short") setPasswordError(mapAuthError(err.code, err.message));
        else if (err.code === "email_not_invited") {
          setBlocked(true);
          setBanner("This invitation is not valid for that email.");
        } else if (err.code === "invite_invalid") {
          setBlocked(true);
          setBanner("This invitation link is invalid or has expired.");
        } else setBanner(mapAuthError(err.code, err.message));
      } else setBanner("Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Accept invitation" caption="Set your password to continue.">
      <OfflineBanner offline={offline} />
      {banner ? <Banner>{banner}</Banner> : null}
      {resolving ? <p className={themeClasses.caption}>Checking invitation…</p> : null}
      {!resolving && !blocked ? (
        <form className="flex flex-col gap-2 mt-2" onSubmit={onSubmit} aria-label="Accept invitation">
          <Field label="Email">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} required />
          </Field>
          <Field label="Password" hint="At least 8 characters" error={passwordError}>
            <TextInput
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={Boolean(passwordError)}
              disabled={busy}
              required
            />
          </Field>
          <Field label="Confirm password" error={confirmError}>
            <TextInput
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={Boolean(confirmError)}
              disabled={busy}
              required
            />
          </Field>
          <PrimaryButton type="submit" busy={busy} disabled={offline || busy}>
            Set password
          </PrimaryButton>
        </form>
      ) : null}
      {blocked ? (
        <div className={themeClasses.authLinks}>
          <TextLink href="/sign-in">Back to sign in</TextLink>
        </div>
      ) : null}
    </AuthShell>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-canvas p-3" />}>
      <InviteAcceptForm />
    </Suspense>
  );
}
