"use client";

import { FleetApiError, mapAuthError, type Driver } from "@fleet/sdk";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { AppShell, Denied, ErrorRetry } from "../../../components/app-shell";
import { ConfirmDeleteDialog } from "../../../components/confirm-delete-dialog";
import {
  Banner,
  DangerButton,
  Field,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
  TextInput,
} from "../../../components/ui";
import { themeClasses } from "../../../../../design/tailwind.theme";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

export default function EditDriverPage() {
  const { id } = useParams<{ id: string }>();
  const { offline } = useAuth();
  const router = useRouter();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);

  async function load() {
    setLoading(true);
    setError("");
    setDenied(false);
    try {
      const d = await api.getDriver(id);
      setDriver(d);
      setEmail(d.email);
    } catch (err) {
      if (err instanceof FleetApiError && (err.status === 404 || err.status === 403)) setDenied(true);
      else setError("Could not load driver.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setEmailError("");
    setError("");
    setBusy(true);
    try {
      const next = await api.patchDriver(id, { email });
      setDriver(next);
      router.replace("/drivers");
    } catch (err) {
      if (err instanceof FleetApiError && err.code === "email_in_use") {
        setEmailError("This email cannot be used.");
      } else if (err instanceof FleetApiError) {
        setError(mapAuthError(err.code, err.message));
      }
    } finally {
      setBusy(false);
    }
  }

  async function resendInvite() {
    if (!driver) return;
    setResendBusy(true);
    setResendMsg("");
    setError("");
    try {
      const res = await api.resendDriverInvite(id);
      setResendMsg(
        res.invite_email_sent
          ? "Invitation email sent."
          : "Could not send invitation email. Try again.",
      );
    } catch (err) {
      if (err instanceof FleetApiError) setError(mapAuthError(err.code, err.message));
      else setError("Could not resend invitation.");
    } finally {
      setResendBusy(false);
    }
  }

  async function setLogin(enabled: boolean) {
    setBusy(true);
    setError("");
    try {
      const next = await api.patchDriver(id, { login_enabled: enabled });
      setDriver(next);
      setConfirmDisable(false);
    } finally {
      setBusy(false);
    }
  }

  function openDeleteConfirm() {
    setError("");
    setConfirmDelete(true);
  }

  function closeDeleteConfirm() {
    setConfirmDelete(false);
    queueMicrotask(() => deleteTriggerRef.current?.focus());
  }

  async function onDeletePermanently() {
    if (deleting || offline) return;
    setDeleting(true);
    setError("");
    try {
      await api.deleteDriver(id);
      setConfirmDelete(false);
      router.replace("/drivers");
    } catch {
      setConfirmDelete(false);
      setError("Driver could not be deleted.");
      queueMicrotask(() => deleteTriggerRef.current?.focus());
    } finally {
      setDeleting(false);
    }
  }

  if (denied) {
    return (
      <AppShell title="Drivers">
        <Denied title="Not allowed" body="This driver is not available." />
      </AppShell>
    );
  }

  const actionsLocked = offline || busy || deleting;

  return (
    <AppShell title="Edit driver">
      {loading ? (
        <Skeleton className="h-24" />
      ) : error && !driver ? (
        <ErrorRetry message={error} onRetry={() => void load()} />
      ) : driver ? (
        <div className="flex flex-col gap-2 max-w-[400px]">
          {error ? <Banner>{error}</Banner> : null}
          {offline ? <Banner tone="warning">You are offline.</Banner> : null}
          <form className={`${themeClasses.panel} flex flex-col gap-2`} onSubmit={onSave}>
            <Field label="Email" error={emailError}>
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={Boolean(emailError)}
                disabled={actionsLocked}
              />
            </Field>
            <p className={themeClasses.caption}>
              {!driver.login_enabled
                ? "Login disabled"
                : driver.must_change_password
                  ? "Invite pending"
                  : "Can sign in"}
            </p>
            {confirmDisable ? (
              <div
                className={`${themeClasses.raised} p-2 flex flex-col gap-2`}
                role="dialog"
                aria-label="Disable sign-in"
              >
                <p className={themeClasses.body}>Disable sign-in? The driver profile is kept.</p>
                <DangerButton type="button" disabled={actionsLocked} onClick={() => void setLogin(false)}>
                  Disable sign-in
                </DangerButton>
                <SecondaryButton type="button" disabled={actionsLocked} onClick={() => setConfirmDisable(false)}>
                  Cancel
                </SecondaryButton>
              </div>
            ) : driver.login_enabled ? (
              <DangerButton
                type="button"
                disabled={actionsLocked}
                onClick={() => setConfirmDisable(true)}
              >
                Disable sign-in
              </DangerButton>
            ) : (
              <SecondaryButton
                type="button"
                disabled={actionsLocked}
                onClick={() => void setLogin(true)}
                aria-label="Allow mobile sign-in"
              >
                Allow mobile sign-in
              </SecondaryButton>
            )}
            <PrimaryButton type="submit" busy={busy} disabled={offline || deleting}>
              Save driver
            </PrimaryButton>
      {driver?.must_change_password ? (
        <div className="flex flex-col gap-1 mt-2">
          <p className={themeClasses.caption}>Invite pending — driver has not set a password yet.</p>
          {resendMsg ? <Banner tone="warning">{resendMsg}</Banner> : null}
          <SecondaryButton type="button" disabled={offline || resendBusy} onClick={() => void resendInvite()}>
            {resendBusy ? "Sending…" : "Resend invitation"}
          </SecondaryButton>
        </div>
      ) : null}
          </form>

          <div className="border-t border-divider pt-2 flex flex-col gap-2">
            <h2 className={themeClasses.sectionTitle}>Remove driver</h2>
            <p className={themeClasses.caption}>
              Permanently remove this driver from your company. This cannot be undone.
            </p>
            <DangerButton
              ref={deleteTriggerRef}
              type="button"
              disabled={actionsLocked}
              aria-label="Delete driver"
              onClick={openDeleteConfirm}
            >
              Delete driver
            </DangerButton>
          </div>

          <ConfirmDeleteDialog
            open={confirmDelete}
            title="Delete driver?"
            body={
              <>
                {driver.email} will be removed from your company. They cannot sign in. This cannot be
                undone.
              </>
            }
            caption="To add them later, create a new driver."
            confirmLabel="Delete permanently"
            confirmBusyLabel="Deleting…"
            busy={deleting}
            disabledConfirm={offline}
            onCancel={closeDeleteConfirm}
            onConfirm={() => void onDeletePermanently()}
          />
        </div>
      ) : null}
    </AppShell>
  );
}
