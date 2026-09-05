"use client";

import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthShell, Banner, Field, OfflineBanner, PrimaryButton, SecondaryButton, TextInput, TextLink } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { searchAddress, type NominatimResult } from "../../lib/nominatim";

export default function SignUpPage() {
  const { applySession, offline } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [address, setAddress] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResults, setLookupResults] = useState<NominatimResult[]>([]);
  const [lookupNote, setLookupNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [companyError, setCompanyError] = useState("");

  const canSubmit =
    password.length >= 8 &&
    confirm.length >= 8 &&
    Boolean(registrationNumber.trim()) &&
    Boolean(vatNumber.trim()) &&
    Boolean(address.trim()) &&
    !offline &&
    !busy;

  useEffect(() => {
    if (address.trim().length < 3) {
      setLookupResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      setLookupBusy(true);
      setLookupNote("");
      void searchAddress(address, ctrl.signal)
        .then((rows) => {
          setLookupResults(rows);
          if (!rows.length) setLookupNote("No lookup results. You can keep the address you typed.");
        })
        .catch(() => {
          setLookupResults([]);
          setLookupNote("Address lookup unavailable. Enter the address manually.");
        })
        .finally(() => setLookupBusy(false));
    }, 400);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [address]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBanner("");
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
    setCompanyError("");
    if (password !== confirm) {
      setConfirmError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setPasswordError("At least 8 characters.");
      return;
    }
    if (!registrationNumber.trim() || !vatNumber.trim() || !address.trim()) {
      setCompanyError("Registration number, VAT number, and address are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.register({
        email: email.trim(),
        password,
        registration_number: registrationNumber.trim(),
        vat_number: vatNumber.trim(),
        address: address.trim(),
      });
      await applySession(res.access_token, res.refresh_token, res.principal);
      router.replace("/home");
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "email_in_use") {
          setEmailError("This email cannot be used.");
          setBanner("This email cannot be used.");
        } else if (err.code === "password_too_short") {
          setPasswordError(mapAuthError(err.code, err.message));
        } else if (err.code === "validation_error") {
          setCompanyError(mapAuthError(err.code, err.message));
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
    <AuthShell title="Create company" caption="Create the first Owner account for your company.">
      <OfflineBanner offline={offline} />
      {banner ? <Banner>{banner}</Banner> : null}
      <form className="flex flex-col gap-2 mt-2" onSubmit={onSubmit} aria-label="Create company">
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
        <Field label="Company registration number" error={companyError}>
          <TextInput
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            disabled={busy}
            required
          />
        </Field>
        <Field label="VAT number">
          <TextInput value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} disabled={busy} required />
        </Field>
        <Field
          label="Address"
          hint={lookupBusy ? "Looking up address…" : lookupNote || "Type an address; optional free lookup via OpenStreetMap."}
        >
          <TextInput value={address} onChange={(e) => setAddress(e.target.value)} disabled={busy} required />
        </Field>
        {lookupResults.length > 0 ? (
          <ul className="flex flex-col gap-1" aria-label="Address suggestions">
            {lookupResults.map((r) => (
              <li key={r.display_name}>
                <SecondaryButton
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAddress(r.display_name);
                    setLookupResults([]);
                    setLookupNote("");
                  }}
                >
                  {r.display_name}
                </SecondaryButton>
              </li>
            ))}
          </ul>
        ) : null}
        <PrimaryButton type="submit" busy={busy} disabled={!canSubmit}>
          Create company
        </PrimaryButton>
      </form>
      <div className={themeClasses.authLinks}>
        <TextLink href="/sign-in">Already have an account? Sign in</TextLink>
      </div>
    </AuthShell>
  );
}
