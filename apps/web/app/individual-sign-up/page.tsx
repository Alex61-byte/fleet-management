"use client";

import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthShell, Banner, Field, OfflineBanner, PrimaryButton, TextInput, TextLink } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

export default function IndividualSignUpPage() {
  const { applySession, offline, me, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const canSubmit = password.length >= 8 && confirm.length >= 8 && Boolean(email.trim()) && !offline && !busy;

  useEffect(() => {
    if (!ready || !me) return;
    if (me.role === "driver") router.replace("/driver");
    else router.replace("/home");
  }, [ready, me, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBanner("");
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }
    if (password !== confirm) {
      setConfirmError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.registerIndividual({
        email: email.trim(),
        password,
      });
      await applySession(res.access_token, res.refresh_token, res.principal);
      router.replace("/home");
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "email_in_use") {
          setEmailError("This email cannot be used.");
          setBanner("This email cannot be used.");
        } else if (err.code === "password_too_short") {
          setPasswordError("Password must be at least 8 characters.");
        } else {
          setBanner(mapAuthError(err.code, err.message));
        }
      } else {
        setBanner("Unexpected error.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create individual account"
      caption="Create a personal account to track your vehicles."
    >
      <OfflineBanner offline={offline} />
      {banner ? <Banner>{banner}</Banner> : null}
      <form className="flex flex-col gap-2 mt-2" onSubmit={onSubmit} aria-label="Create individual account">
        <Field label="Email" error={emailError}>
          <TextInput
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(emailError)}
            disabled={busy}
            required
          />
        </Field>
        <Field label="Password" hint="At least 8 characters." error={passwordError}>
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
        <PrimaryButton type="submit" busy={busy} disabled={!canSubmit}>
          {busy ? "Creating…" : "Create account"}
        </PrimaryButton>
      </form>
      <div className={themeClasses.authLinks}>
        <TextLink href="/account-kind">Back to account type</TextLink>
        <TextLink href="/sign-in">Already have an account? Sign in</TextLink>
      </div>
    </AuthShell>
  );
}
