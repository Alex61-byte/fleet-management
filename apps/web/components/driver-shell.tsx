"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark, OfflineBanner, SecondaryButton } from "./ui";
import { themeClasses } from "../../../design/tailwind.theme";
import { useAuth } from "../lib/auth-context";

export function DriverShell({
  title,
  children,
  showSignOut = false,
}: {
  title: string;
  children: ReactNode;
  showSignOut?: boolean;
}) {
  const { offline, signOut } = useAuth();

  return (
    <div className={`${themeClasses.page} min-h-screen flex flex-col`}>
      <header
        className="sticky top-0 z-20 h-app-bar w-full bg-surface-raised border-b border-divider border-t-brand-bar border-t-brand-accent px-content-gutter-compact flex flex-row items-center gap-2"
        aria-label="Driver"
      >
        <BrandMark variant="nav" />
        <span className={themeClasses.appBarProduct}>Fleet</span>
        <h1 className={`${themeClasses.pageTitle} ml-2`}>{title}</h1>
      </header>
      <main className={`${themeClasses.contentPadCompact} w-full max-w-auth-card mx-auto flex flex-col gap-2`}>
        <OfflineBanner offline={offline} />
        {children}
        {showSignOut ? (
          <SecondaryButton
            type="button"
            className="w-full"
            onClick={() => void signOut().then(() => (window.location.href = "/sign-in"))}
          >
            Sign out
          </SecondaryButton>
        ) : null}
      </main>
    </div>
  );
}

export function DriverBackLink({ href = "/driver", label = "Back to Home" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className={`${themeClasses.buttonSecondary} inline-flex items-center justify-center no-underline w-full`}
    >
      {label}
    </Link>
  );
}

export function DriverHubLink({
  href,
  title,
  description,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  badge?: string | null;
}) {
  return (
    <Link
      href={href}
      className={`${themeClasses.panel} block no-underline hover:bg-surface-raised focus-visible:shadow-ring outline-none`}
      aria-label={badge ? `${title}. ${badge}. ${description}` : `${title}. ${description}`}
    >
      <div className="flex flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className={themeClasses.label}>{title}</p>
          <p className={themeClasses.caption}>{description}</p>
        </div>
        {badge ? (
          <span className={`${themeClasses.badgeNeutral} shrink-0`}>{badge}</span>
        ) : (
          <span className={`${themeClasses.caption} shrink-0`} aria-hidden>
            →
          </span>
        )}
      </div>
    </Link>
  );
}
