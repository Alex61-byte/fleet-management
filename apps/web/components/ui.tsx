"use client";

import { themeClasses } from "../../../design/tailwind.theme";
import { AppFooter } from "./app-footer";
import type { VehicleCustomExpiration, VehicleOpenOut, Warning } from "@fleet/sdk";
import { warningFieldLabel } from "@fleet/sdk";
import Link from "next/link";
import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

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

type SelectOption = { value: string; label: string; disabled?: boolean };

function optionsFromChildren(children: ReactNode): SelectOption[] {
  const out: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== "option") return;
    const el = child as ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>;
    const value = el.props.value == null ? "" : String(el.props.value);
    const label = Children.toArray(el.props.children)
      .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : ""))
      .join("")
      .trim();
    out.push({ value, label: label || value, disabled: Boolean(el.props.disabled) });
  });
  return out;
}

/**
 * Styled select: raised trigger + portaled listbox (stable anchor at any viewport size).
 * Accepts native `<option>` children like a select. Use for toolbar filters/sorts and forms.
 */
export function SelectInput({
  error,
  className,
  label,
  children,
  id,
  value,
  defaultValue,
  disabled,
  name,
  required,
  onChange,
  "aria-label": ariaLabel,
}: SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
  /** Optional overline above the control (e.g. Custody, Sort). */
  label?: string;
}) {
  const reactId = useId();
  const selectId = id ?? (label ? `select-${label.replace(/\s+/g, "-").toLowerCase()}` : `select-${reactId}`);
  const listboxId = `${selectId}-listbox`;
  const options = useMemo(() => optionsFromChildren(children), [children]);
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(() =>
    defaultValue != null ? String(defaultValue) : (options[0]?.value ?? ""),
  );
  const current = isControlled ? String(value ?? "") : internal;
  const selected = options.find((o) => o.value === current) ?? options[0];
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const updateMenuPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gutter = 8;
    const spaceBelow = window.innerHeight - rect.bottom - gutter;
    const spaceAbove = rect.top - gutter;
    const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(120, Math.min(320, preferBelow ? spaceBelow : spaceAbove));
    const top = preferBelow ? rect.bottom + 4 : Math.max(gutter, rect.top - 4 - maxHeight);
    let left = rect.left;
    const width = Math.max(rect.width, 140);
    if (left + width > window.innerWidth - gutter) {
      left = Math.max(gutter, window.innerWidth - gutter - width);
    }
    if (left < gutter) left = gutter;
    setMenuPos({ top, left, width, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPos();
    const onWin = () => updateMenuPos();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open, updateMenuPos]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function commit(next: string) {
    if (!isControlled) setInternal(next);
    if (onChange) {
      const synthetic = {
        target: { value: next, name: name ?? "", required: Boolean(required) },
        currentTarget: { value: next, name: name ?? "" },
      } as unknown as ChangeEvent<HTMLSelectElement>;
      onChange(synthetic);
    }
    setOpen(false);
    triggerRef.current?.focus();
  }

  const display = selected?.label ?? "";
  const a11yName = ariaLabel ?? label ?? "Select";

  return (
    <div ref={rootRef} className={`${themeClasses.selectField} ${className ?? ""}`}>
      {label ? (
        <span id={`${selectId}-label`} className={themeClasses.overline}>
          {label}
        </span>
      ) : null}
      {/* Keep name/value for progressive forms; hidden from a11y (listbox is the control). */}
      {name ? <input type="hidden" name={name} value={current} required={required} /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-labelledby={label ? `${selectId}-label` : undefined}
        aria-label={label ? undefined : a11yName}
        aria-required={required || undefined}
        aria-invalid={error || undefined}
        className={`${themeClasses.selectControl} ${error ? themeClasses.selectControlError : ""} ${themeClasses.selectTrigger} ${
          open ? "border-focus shadow-ring" : ""
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
      >
        <span className={themeClasses.selectNative}>{display}</span>
        <span aria-hidden className={themeClasses.selectChevron}>
          <SelectChevron />
        </span>
      </button>
      {open && menuPos && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={label ? `${selectId}-label` : undefined}
              aria-label={label ? undefined : a11yName}
              className={themeClasses.selectMenu}
              style={{
                position: "fixed",
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                maxHeight: menuPos.maxHeight,
              }}
            >
              {options.map((opt) => {
                const active = opt.value === current;
                return (
                  <li key={opt.value || "__empty"} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={opt.disabled}
                      className={`${themeClasses.selectOption} ${active ? themeClasses.selectOptionSelected : ""}`}
                      onClick={() => {
                        if (opt.disabled) return;
                        commit(opt.value);
                      }}
                    >
                      <span className="truncate">{opt.label}</span>
                      {active ? (
                        <span className="text-brand font-semibold" aria-hidden>
                          ✓
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
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

/** US-119 — open Out + holding driver on OA vehicle list/Details. */
export function openOutHolderLabel(openOut: VehicleOpenOut | null | undefined): string | null {
  if (!openOut) return null;
  return openOut.driver?.email?.trim() ? openOut.driver.email : "Unavailable";
}

export function openOutCustodyA11y(openOut: VehicleOpenOut | null | undefined): string {
  const holder = openOutHolderLabel(openOut);
  if (!holder) return "";
  return holder === "Unavailable"
    ? "Out open, assigned driver unavailable"
    : `Out open, assigned to ${holder}`;
}

export function OpenOutCustodyCue({
  openOut,
  layout = "inline",
}: {
  openOut: VehicleOpenOut | null | undefined;
  /** inline = list wrap; strip = Details top row */
  layout?: "inline" | "strip";
}) {
  const holder = openOutHolderLabel(openOut);
  if (!holder) return null;
  const a11y = openOutCustodyA11y(openOut);
  return (
    <span
      className={
        layout === "strip"
          ? "inline-flex flex-wrap items-center gap-1"
          : "inline-flex flex-wrap items-center gap-1"
      }
      aria-label={a11y}
    >
      <span className={themeClasses.badgeNeutral}>Out open</span>
      <span className={themeClasses.caption}>{holder}</span>
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
    <div className={`${themeClasses.pageAuth} min-h-screen flex flex-col`}>
      <main className={`flex-1 flex ${themeClasses.authCanvas}`}>
        <div className={`${themeClasses.authCard} flex flex-col`}>
          <AuthLockup />
          <h1 className={themeClasses.authTitle}>{title}</h1>
          {caption ? <p className={themeClasses.authCaption}>{caption}</p> : null}
          {children}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
