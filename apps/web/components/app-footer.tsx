"use client";

import Link from "next/link";
import { themeClasses } from "../../../design/tailwind.theme";
import { useAuth } from "../lib/auth-context";

export function AppFooter({
  variant = "default",
}: {
  /** public = max-w public content gutter; default = full parent width gutter */
  variant?: "default" | "public";
}) {
  const { me, ready } = useAuth();
  const year = new Date().getFullYear();
  const inner =
    variant === "public"
      ? themeClasses.appFooterInnerPublic
      : themeClasses.appFooterInner;

  const signedIn = ready && Boolean(me);
  const isDriver = me?.role === "driver";
  const isOwnerAdmin = signedIn && !isDriver;

  const homeHref = !signedIn ? "/" : isDriver ? "/driver" : "/home";
  const homeLabel = "Home";

  return (
    <footer className={themeClasses.appFooter}>
      <div className={inner}>
        <p className={themeClasses.appFooterCopy}>© {year} Fleet</p>
        <nav className={themeClasses.appFooterNav} aria-label="Footer">
          <Link
            href={homeHref}
            className={`${themeClasses.link} focus-visible:shadow-ring inline-flex items-center no-underline`}
          >
            {homeLabel}
          </Link>
          {isOwnerAdmin ? (
            <Link
              href="/billing"
              className={`${themeClasses.link} focus-visible:shadow-ring inline-flex items-center no-underline`}
            >
              Billing
            </Link>
          ) : null}
          {!signedIn ? (
            <Link
              href="/pricing"
              className={`${themeClasses.link} focus-visible:shadow-ring inline-flex items-center no-underline`}
            >
              Pricing
            </Link>
          ) : null}
          <Link
            href="/terms"
            className={`${themeClasses.link} focus-visible:shadow-ring inline-flex items-center no-underline`}
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className={`${themeClasses.link} focus-visible:shadow-ring inline-flex items-center no-underline`}
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
