"use client";

import { FormEvent, useState } from "react";
import { AuthShell, Field, OfflineBanner, PrimaryButton, TextInput, TextLink } from "../../../components/ui";
import { themeClasses } from "../../../../../design/tailwind.theme";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

export default function ForgotPasswordPage() {
  const { offline } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.forgotPassword(email);
    } finally {
      setDone(true);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Reset password" caption="Password reset is for Owners and Admins.">
      <OfflineBanner offline={offline} />
      {done ? (
        <p className="font-sans text-body text-text-primary mt-2">
          If this email is an Owner or Admin, you can continue with the reset.
        </p>
      ) : (
        <form className="flex flex-col gap-2 mt-2" onSubmit={onSubmit} aria-label="Reset password">
          <Field label="Email">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
          </Field>
          <PrimaryButton type="submit" busy={busy} disabled={offline}>
            Send reset
          </PrimaryButton>
        </form>
      )}
      <div className={themeClasses.authLinks}>
        <TextLink href="/sign-in">Back to sign in</TextLink>
      </div>
    </AuthShell>
  );
}
