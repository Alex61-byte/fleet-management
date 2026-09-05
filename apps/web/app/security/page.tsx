"use client";

import { FleetApiError, mapAuthError } from "@fleet/sdk";
import QRCode from "qrcode";
import { FormEvent, useEffect, useState } from "react";
import { AppShell, ErrorRetry } from "../../components/app-shell";
import {
  DangerButton,
  Field,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
  TextInput,
} from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

type TotpSetup = { otpauth_url: string; secret: string };

export default function SecurityPage() {
  const { offline, reload } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  async function load() {
    setError("");
    try {
      const res = await api.totpStatus();
      setEnabled(res.enabled);
    } catch {
      setError("Could not load security settings.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!setup?.otpauth_url) {
      setQrDataUrl(null);
      return;
    }
    void QRCode.toDataURL(setup.otpauth_url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 192,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [setup]);

  async function startSetup() {
    setBusy(true);
    setCodeError("");
    try {
      setSetup(await api.totpSetup());
    } catch (err) {
      if (err instanceof FleetApiError) setError(mapAuthError(err.code, err.message));
    } finally {
      setBusy(false);
    }
  }

  async function confirmOn(e: FormEvent) {
    e.preventDefault();
    setCodeError("");
    setBusy(true);
    try {
      await api.totpConfirm(code);
      setSetup(null);
      setQrDataUrl(null);
      setCode("");
      setEnabled(true);
      await reload();
    } catch {
      setCodeError("That code is not valid.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmOffSubmit(e: FormEvent) {
    e.preventDefault();
    setCodeError("");
    setBusy(true);
    try {
      await api.totpDisable(code);
      setConfirmOff(false);
      setCode("");
      setEnabled(false);
      await reload();
    } catch {
      setCodeError("That code is not valid.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Security">
      {enabled === null && !error ? (
        <Skeleton className="h-12" />
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => void load()} />
      ) : (
        <div className="flex flex-col gap-2 max-w-[400px]">
          <div className={`${themeClasses.raised} p-2 min-h-hit flex justify-between items-center`}>
            <span className={themeClasses.label}>Authenticator app</span>
            <span className={themeClasses.caption}>{enabled ? "On" : "Off"}</span>
          </div>
          {enabled ? (
            <>
              <p className={themeClasses.body}>Sign-in also asks for an authenticator code.</p>
              {!confirmOff ? (
                <DangerButton type="button" disabled={offline || busy} onClick={() => setConfirmOff(true)}>
                  Turn off authenticator
                </DangerButton>
              ) : (
                <form className={`${themeClasses.raised} p-2 flex flex-col gap-2`} onSubmit={confirmOffSubmit}>
                  <Field label="Authenticator code" error={codeError}>
                    <TextInput
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      error={Boolean(codeError)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </Field>
                  <DangerButton type="submit" disabled={offline || busy}>
                    Turn off
                  </DangerButton>
                  <SecondaryButton type="button" onClick={() => setConfirmOff(false)}>
                    Cancel
                  </SecondaryButton>
                </form>
              )}
            </>
          ) : (
            <>
              <p className={themeClasses.body}>Sign-in uses email and password only.</p>
              {!setup ? (
                <PrimaryButton type="button" busy={busy} disabled={offline} onClick={() => void startSetup()}>
                  Turn on authenticator
                </PrimaryButton>
              ) : (
                <form className={`${themeClasses.raised} p-2 flex flex-col gap-2`} onSubmit={confirmOn}>
                  <p className={themeClasses.body}>Scan this QR with your authenticator app.</p>
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="Authenticator setup QR code"
                      width={192}
                      height={192}
                      className="mx-auto rounded-md border border-border bg-surface p-1"
                    />
                  ) : (
                    <p className={themeClasses.caption} role="status">
                      Preparing QR code…
                    </p>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <span className={themeClasses.caption}>Or enter this key manually</span>
                    <p className={`${themeClasses.body} font-mono break-all select-all`}>{setup.secret}</p>
                  </div>
                  <Field label="Authenticator code" error={codeError}>
                    <TextInput
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      error={Boolean(codeError)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </Field>
                  <PrimaryButton type="submit" busy={busy} disabled={offline}>
                    Confirm
                  </PrimaryButton>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
