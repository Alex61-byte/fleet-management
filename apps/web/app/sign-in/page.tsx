"use client";

import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  AuthShell,
  Banner,
  Field,
  OfflineBanner,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  TextLink,
} from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { takeSessionEndedMessage } from "../../lib/session";

export default function SignInPage() {
  const { applySession, offline } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [sessionBanner, setSessionBanner] = useState("");
  const [codeError, setCodeError] = useState("");

  useEffect(() => {
    const msg = takeSessionEndedMessage();
    if (msg) setSessionBanner(msg);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBanner("");
    setBusy(true);
    try {
      const res = await api.login(email.trim(), password, "web");
      if (res.status === "totp_required") {
        setChallenge(res.challenge_token);
      } else {
        await applySession(res.access_token, res.refresh_token, res.principal);
        if (res.principal.role === "driver") {
          router.replace("/driver");
        } else {
          router.replace("/home");
        }
      }
    } catch (err) {
      if (err instanceof FleetApiError) {
        setBanner(mapAuthError(err.code, "Sign-in details are not correct."));
      } else {
        setBanner("Cannot reach the server. Check your connection and API URL.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onTotp(e: FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setCodeError("");
    setBusy(true);
    try {
      const res = await api.verifyTotp(challenge, code);
      await applySession(res.access_token, res.refresh_token, res.principal);
      router.replace("/home");
    } catch (err) {
      if (err instanceof FleetApiError) {
        setCodeError(mapAuthError(err.code, "That code is not valid."));
      } else {
        setCodeError("That code is not valid.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (challenge) {
    return (
      <AuthShell title="Authenticator code" caption="Enter the 6-digit code from your authenticator app.">
        <OfflineBanner offline={offline} />
        <form className="flex flex-col gap-2 mt-2" onSubmit={onTotp} aria-label="Authenticator code">
          <Field label="Authenticator code" error={codeError}>
            <TextInput
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              error={Boolean(codeError)}
              className="tracking-[0.4em] text-title"
              disabled={busy}
            />
          </Field>
          <PrimaryButton type="submit" busy={busy} disabled={offline}>
            Continue
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={() => {
              setChallenge(null);
              setCode("");
              setCodeError("");
            }}
          >
            Back to sign in
          </SecondaryButton>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign in" caption="Sign in to manage your fleet.">
      <OfflineBanner offline={offline} />
      {sessionBanner ? <Banner tone="warning">{sessionBanner}</Banner> : null}
      {banner ? <Banner>{banner}</Banner> : null}
      <form className="flex flex-col gap-2 mt-2" onSubmit={onSubmit} aria-label="Sign in">
        <Field label="Email">
          <TextInput
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            required
          />
        </Field>
        <Field label="Password">
          <TextInput
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            required
          />
        </Field>
        <PrimaryButton type="submit" busy={busy} disabled={offline}>
          Sign in
        </PrimaryButton>
      </form>
      <div className={themeClasses.authLinks}>
        <TextLink href="/password/forgot">Forgot password</TextLink>
        <TextLink href="/account-kind">Create account</TextLink>
      </div>
    </AuthShell>
  );
}
