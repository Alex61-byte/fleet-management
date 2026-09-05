"use client";

import { vehiclesNavA11yLabel, type VehiclesNavUrgency } from "@fleet/sdk";
import { themeClasses } from "../../../design/tailwind.theme";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth-context";
import { useVehiclesNavUrgency } from "../lib/vehicles-nav-urgency";
import { NavIcon, navIconForHref } from "./nav-icons";
import { Banner, OfflineBanner, PrimaryButton, PrimaryLink } from "./ui";

function vehiclesNavClass(urgency: VehiclesNavUrgency, active: boolean): string {
  const base = "min-h-hit px-2 mx-1 rounded-md text-label font-medium flex flex-row items-center gap-1.5 focus-visible:shadow-ring";
  if (urgency === "critical") {
    return `${base} ${themeClasses.navItemUrgencyCritical} hover:bg-nav-urgency-critical-hover hover:text-nav-urgency-fg ${
      active ? themeClasses.navItemUrgencySelected : ""
    }`;
  }
  if (urgency === "warning") {
    return `${base} ${themeClasses.navItemUrgencySoon} hover:bg-nav-urgency-soon-hover hover:text-nav-urgency-fg ${
      active ? themeClasses.navItemUrgencySelected : ""
    }`;
  }
  // Split inactive vs selected so text-nav-fg never fights selected white text.
  if (active) {
    return `${base} ${themeClasses.navItemSelected}`;
  }
  return `${base} text-nav-fg hover:bg-sidebar-hover hover:text-nav-fg-selected`;
}

export function AppShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { me, ready, offline, signOut } = useAuth();
  const path = usePathname();
  const ownerAdmin = Boolean(me && me.role !== "driver");
  const vehiclesUrgency = useVehiclesNavUrgency(ownerAdmin);

  if (!ready) {
    return (
      <main className={`${themeClasses.page} min-h-screen p-3`}>
        <div className="h-6 w-40 bg-disabled-surface rounded-md" />
      </main>
    );
  }

  if (!me) {
    return (
      <main className={`${themeClasses.page} min-h-screen p-3`}>
        <div className="mx-auto max-w-[400px] flex flex-col gap-2">
          <h1 className={themeClasses.title}>Sign in required</h1>
          <p className={`${themeClasses.body} text-text-secondary`}>
            Fleet and driver records are only available after you sign in.
          </p>
          <PrimaryLink href="/sign-in">Sign in</PrimaryLink>
        </div>
      </main>
    );
  }

  if (me.role === "driver") {
    const backHref = "/driver";
    return (
      <main className={`${themeClasses.page} min-h-screen p-3`}>
        <div className="mx-auto max-w-[400px] flex flex-col gap-2">
          <h1 className={themeClasses.title}>Not available</h1>
          <p className={`${themeClasses.body} text-text-secondary`}>
            This area is for Owners and Admins.
          </p>
          <Link
            href={backHref}
            className={`${themeClasses.buttonSecondary} inline-flex items-center justify-center`}
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const items = [
    { href: "/home", label: "Home" },
    { href: "/drivers", label: "Drivers" },
    { href: "/vehicles", label: "Vehicles" },
    { href: "/security", label: "Security" },
    ...(me.role === "owner" ? [{ href: "/admins", label: "Admins" }] : []),
  ];

  return (
    <div className={`${themeClasses.shell} min-h-screen`}>
      <nav className={`${themeClasses.sidebar} p-2 gap-0.5`} aria-label="Main">
        <p className={`${themeClasses.sidebarMeta} px-2 py-1`}>Fleet</p>
        {items.map((item) => {
          const active = path === item.href || path.startsWith(`${item.href}/`);
          const isVehicles = item.href === "/vehicles";
          const urgency = isVehicles ? vehiclesUrgency : "none";
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={isVehicles ? vehiclesNavA11yLabel(urgency) : undefined}
              className={
                isVehicles
                  ? vehiclesNavClass(urgency, active)
                  : active
                    ? `min-h-hit px-2 mx-1 rounded-md text-label flex flex-row items-center gap-1.5 focus-visible:shadow-ring ${themeClasses.navItemSelected}`
                    : "min-h-hit px-2 mx-1 rounded-md text-label font-medium text-nav-fg flex flex-row items-center gap-1.5 hover:bg-sidebar-hover hover:text-nav-fg-selected focus-visible:shadow-ring"
              }
            >
              <NavIcon name={navIconForHref(item.href)} />
              {item.label}
            </Link>
          );
        })}
        <button
          className={`${themeClasses.buttonSecondary} mt-auto`}
          onClick={() => void signOut().then(() => (window.location.href = "/sign-in"))}
        >
          Sign out
        </button>
      </nav>
      <div className={`${themeClasses.content} flex flex-col`}>
        <header className="h-[48px] bg-surface-raised border-b border-divider px-3 flex items-center justify-between">
          <h1 className={themeClasses.pageTitle}>{title}</h1>
          {action}
        </header>
        <main className={`${themeClasses.contentPadCompact} w-full flex flex-col gap-2`}>
          <OfflineBanner offline={offline} />
          {children}
        </main>
      </div>
    </div>
  );
}

export function Denied({ title, body }: { title: string; body: string }) {
  const { me } = useAuth();
  const backHref =
    me?.role === "driver"
      ? "/driver"
      : me
        ? "/home"
        : "/";
  const backLabel = me?.role === "driver" ? "Back to home" : "Back";
  return (
    <div className="flex flex-col gap-2 max-w-[400px]">
      <h2 className={themeClasses.title}>{title}</h2>
      <p className={`${themeClasses.body} text-text-secondary`}>{body}</p>
      <Link href={backHref} className={`${themeClasses.buttonSecondary} inline-flex items-center justify-center`}>
        {backLabel}
      </Link>
    </div>
  );
}

export function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Banner>{message}</Banner>
      <PrimaryButton onClick={onRetry}>Retry</PrimaryButton>
    </div>
  );
}
