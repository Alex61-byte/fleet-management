"use client";

import { themeClasses } from "../../../design/tailwind.theme";
import type { VehicleCustomExpiration, Warning } from "@fleet/sdk";
import { warningFieldLabel } from "@fleet/sdk";
import Link from "next/link";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className={themeClasses.label}>{label}</span>
      {children}
      {hint && !error ? <span className={themeClasses.caption}>{hint}</span> : null}
      {error ? (
        <span className={themeClasses.errorText} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(function TextInput({ error, className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`${themeClasses.input} ${error ? themeClasses.inputError : ""} focus:border-focus outline-none w-full ${className ?? ""}`}
      {...props}
    />
  );
});

function SelectChevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="h-2 w-2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 4.5 6 7.5 9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Native select with chevron inset `spacing.0.5` (4px) from the right edge. */
export function SelectInput({
  error,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <span className="relative block w-full">
      <select
        className={`${themeClasses.input} ${themeClasses.selectInput} ${error ? themeClasses.inputError : ""} focus:border-focus outline-none w-full ${className ?? ""}`}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-text-secondary"
      >
        <SelectChevron />
      </span>
    </span>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean };

export function PrimaryButton({ busy, className, children, disabled, ...props }: BtnProps) {
  return (
    <button
      className={`${themeClasses.buttonPrimary} hover:bg-brand-hover active:bg-brand-pressed focus-visible:shadow-ring disabled:bg-disabled-surface disabled:text-disabled w-full ${className ?? ""}`}
      disabled={disabled || busy}
      {...props}
    >
      {busy ? "Working…" : children}
    </button>
  );
}

export const SecondaryButton = forwardRef<HTMLButtonElement, BtnProps>(
  function SecondaryButton({ className, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`${themeClasses.buttonSecondary} ${className ?? ""}`}
        {...props}
      />
    );
  },
);

export const DangerButton = forwardRef<HTMLButtonElement, BtnProps>(
  function DangerButton({ className, ...props }, ref) {
    return (
      <button ref={ref} className={`${themeClasses.buttonDanger} ${className ?? ""}`} {...props} />
    );
  },
);

export function Banner({
  children,
  tone = "danger",
}: {
  children: ReactNode;
  tone?: "danger" | "warning";
}) {
  const cls = tone === "warning" ? themeClasses.bannerWarning : themeClasses.bannerDanger;
  return (
    <div className={cls} role="alert" aria-live="assertive">
      {children}
    </div>
  );
}

export function OfflineBanner({ offline }: { offline: boolean }) {
  if (!offline) return null;
  return <Banner tone="warning">You are offline.</Banner>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-disabled-surface rounded-md ${className ?? "h-6"}`} />;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`${themeClasses.link} hover:text-link-hover hover:font-semibold focus-visible:shadow-ring active:text-link-pressed inline-flex items-center`}
    >
      {children}
    </Link>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`${themeClasses.buttonPrimary} inline-flex items-center justify-center`}
    >
      {children}
    </Link>
  );
}

export function ExpiryBadges({
  warnings,
  customExpirations,
}: {
  warnings: Warning[];
  customExpirations?: Iterable<Pick<VehicleCustomExpiration, "id" | "label">>;
}) {
  if (!warnings.length) return null;
  return (
    <span className="flex flex-wrap gap-0.5">
      {warnings.map((w) => (
        <span
          key={`${w.field}-${w.state}`}
          className={w.state === "expired" ? themeClasses.badgeExpired : themeClasses.badgeWarning}
        >
          {warningFieldLabel(w.field, customExpirations)}{" "}
          {w.state === "expired" ? "Expired" : "Due soon"}
        </span>
      ))}
    </span>
  );
}

export function BrandMark({ variant = "nav" }: { variant?: "nav" | "auth" }) {
  const frame = variant === "auth" ? themeClasses.brandMarkAuth : themeClasses.brandMark;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={frame} aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="5" className={themeClasses.brandMarkGlyph} />
      <rect x="2" y="2" width="20" height="20" rx="4" className={themeClasses.brandMarkFill} />
      <rect x="4" y="8" width="16" height="8" rx="1.5" className={themeClasses.brandMarkGlyph} />
      <path
        className={themeClasses.brandMarkAccent}
        d="M5.5 8H7.5V16H5.5A1.5 1.5 0 0 1 4 14.5v-5A1.5 1.5 0 0 1 5.5 8Z"
      />
      <circle cx="5.75" cy="12" r="0.9" className={themeClasses.brandMarkGlyph} />
      <rect x="8.5" y="10" width="2.25" height="4" rx="0.4" className={themeClasses.brandMarkFill} />
      <rect x="11.5" y="10" width="2.25" height="4" rx="0.4" className={themeClasses.brandMarkFill} />
      <rect x="14.5" y="10" width="2.25" height="4" rx="0.4" className={themeClasses.brandMarkFill} />
      <circle cx="18.25" cy="12" r="0.9" className={themeClasses.brandMarkFill} />
    </svg>
  );
}

export function BrandMarkPublic() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 20"
      width="40"
      height="20"
      className={themeClasses.brandMarkPublic}
      aria-hidden="true"
    >
      <rect
        x="0.5"
        y="0.5"
        width="39"
        height="19"
        rx="3.25"
        className={`${themeClasses.brandMarkPlateFace} ${themeClasses.brandMarkPlateEdge}`}
        strokeWidth="1"
      />
      <path
        className={themeClasses.brandMarkAccent}
        d="M3.75 0H8.75V20H3.75A3.75 3.75 0 0 1 0 16.25V3.75A3.75 3.75 0 0 1 3.75 0Z"
      />
      <circle cx="4.375" cy="10" r="2.25" className={themeClasses.brandMarkFill} />
      <rect x="11.25" y="5" width="5.625" height="10" rx="1" className={themeClasses.brandMarkFill} />
      <rect x="18.75" y="5" width="5.625" height="10" rx="1" className={themeClasses.brandMarkFill} />
      <rect x="26.25" y="5" width="5.625" height="10" rx="1" className={themeClasses.brandMarkFill} />
      <circle cx="35.625" cy="10" r="2.25" className={themeClasses.brandMarkFill} />
    </svg>
  );
}

export function AuthLockup() {
  return (
    <div className={themeClasses.authLockup}>
      <BrandMark variant="auth" />
      <div className="flex flex-col">
        <span className={themeClasses.authWordmark}>Fleet</span>
        <span className={themeClasses.authCaptionLockup}>Fleet operations</span>
      </div>
    </div>
  );
}

export function AuthShell({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <main className={`${themeClasses.pageAuth} min-h-screen flex ${themeClasses.authCanvas}`}>
      <div className={`${themeClasses.authCard} flex flex-col`}>
        <AuthLockup />
        <h1 className={themeClasses.authTitle}>{title}</h1>
        {caption ? <p className={themeClasses.authCaption}>{caption}</p> : null}
        {children}
      </div>
    </main>
  );
}
