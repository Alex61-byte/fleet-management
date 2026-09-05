"use client";

import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import {
  AuthShell,
  Banner,
  Field,
  OfflineBanner,
  PrimaryButton,
  TextInput,
  TextLink,
} from "../../../components/ui";
import { themeClasses } from "../../../../../design/tailwind.theme";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

function ResetForm() {
  const { offline } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBanner("");
    setPasswordError("");
    if (password !== confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(token, password);
      router.replace("/sign-in");
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "password_too_short") setPasswordError(mapAuthError(err.code, err.message));
        else setBanner(mapAuthError(err.code, err.message));
      } else {
        setBanner("Unexpected error.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Set new password" caption="At least 8 characters.">
      <OfflineBanner offline={offline} />
      {banner ? <Banner>{banner}</Banner> : null}
      <form className="flex flex-col gap-2 mt-2" onSubmit={onSubmit} aria-label="Update password">
        <Field label="New password" hint="At least 8 characters" error={passwordError}>
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(passwordError)}
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
        <PrimaryButton type="submit" busy={busy} disabled={offline || !token}>
          Update password
        </PrimaryButton>
      </form>
      <div className={themeClasses.authLinks}>
        <TextLink href="/password/forgot">Request a new reset</TextLink>
      </div>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
