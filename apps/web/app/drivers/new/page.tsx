"use client";

import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AppShell, Denied } from "../../../components/app-shell";
import { Banner, Field, PrimaryButton, TextInput } from "../../../components/ui";
import { themeClasses } from "../../../../../design/tailwind.theme";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

export default function NewDriverPage() {
  const { offline, me } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [banner, setBanner] = useState("");

  if (me?.account_kind === "individual") {
    return (
      <AppShell title="Add driver">
        <Denied
          title="Not available"
          body="Driver management is only available on company accounts."
        />
      </AppShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailError("");
    setBanner("");
    setBusy(true);
    try {
      const created = await api.createDriver(email.trim());
      if (!created.invite_email_sent) {
        // Still navigate; list/edit can resend. Surface via query not required.
        setBanner("Driver created, but the invitation email could not be sent. Resend from the driver profile.");
      }
      router.replace("/drivers");
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "email_in_use") setEmailError("This email cannot be used.");
        else setBanner(mapAuthError(err.code, err.message));
      } else setBanner("Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Add driver">
      {banner ? <Banner>{banner}</Banner> : null}
      <form className="flex flex-col gap-2 max-w-[400px]" onSubmit={onSubmit}>
        <Field
          label="Email"
          hint="We email an invitation so the driver can set their own password. No temporary password."
          error={emailError}
        >
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(emailError)}
            required
            disabled={busy}
          />
        </Field>
        <p className={themeClasses.caption}>The driver opens the invite link and creates a password on web or mobile.</p>
        <PrimaryButton type="submit" busy={busy} disabled={offline || !email.trim()}>
          Send invitation
        </PrimaryButton>
      </form>
    </AppShell>
  );
}
