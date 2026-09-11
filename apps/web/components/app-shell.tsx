"use client";

import { vehiclesNavA11yLabel, type VehiclesNavUrgency } from "@fleet/sdk";
import { themeClasses } from "../../../design/tailwind.theme";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../lib/auth-context";
import { useComplianceNotifications } from "../lib/compliance-notifications";
import { useVehiclesNavUrgency } from "../lib/vehicles-nav-urgency";
import { CompanyNameDialog } from "./company-name-dialog";
import { NavIcon, navIconForHref } from "./nav-icons";
import { NotificationControl } from "./notification-menu";
import { AppFooter } from "./app-footer";
import { Banner, BrandMark, OfflineBanner, PrimaryButton } from "./ui";

function vehiclesNavClass(urgency: VehiclesNavUrgency, active: boolean): string {
  const base =
    "min-h-hit px-2 mx-1 rounded-md text-label font-medium flex flex-row items-center gap-1.5 focus-visible:shadow-ring";
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
  const router = useRouter();
  const ownerAdmin = Boolean(me && me.role !== "driver");
  const vehiclesUrgency = useVehiclesNavUrgency(ownerAdmin);
  const notifications = useComplianceNotifications(ownerAdmin, offline);
  const [menuOpen, setMenuOpen] = useState(false);

  // US-15 / US-29: unauthenticated or session ended → sign-in (banner lives there).
  useEffect(() => {
    if (ready && !me) router.replace("/sign-in");
  }, [ready, me, router]);

  // Close notification menu on route change (US-71).
  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  if (!ready || !me) {
    return (
      <main className={`${themeClasses.page} min-h-screen p-3`}>
        <div className="h-6 w-40 bg-disabled-surface rounded-md" aria-busy="true" />
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

  const individual = me.account_kind === "individual";
  const items = [
    { href: "/home", label: "Home" },
    ...(!individual ? [{ href: "/drivers", label: "Drivers" }] : []),
    { href: "/vehicles", label: "Vehicles" },
    { href: "/service-due", label: "Service due" },
    ...(!individual ? [{ href: "/reports/daily-usage", label: "Usage report" }] : []),
    { href: "/security", label: "Security" },
    ...(!individual && me.role === "owner" ? [{ href: "/admins", label: "Admins" }] : []),
  ];
  const roleLabel = individual ? "Individual" : me.role === "owner" ? "Owner" : "Admin";
  const companyLabel =
    !individual && me.company_name && me.company_name.trim()
      ? me.company_name.trim()
      : null;

  return (
    <div className={`${themeClasses.shell} min-h-screen`}>
      <CompanyNameDialog />
      <nav className={`${themeClasses.sidebar} p-2 gap-0.5`} aria-label="Main">
        <p className={themeClasses.sidebarRole}>{roleLabel}</p>
        {companyLabel ? (
          <p className={`${themeClasses.caption} px-2 truncate`} title={companyLabel}>
            {companyLabel}
          </p>
        ) : null}
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
      <div className={`${themeClasses.content} flex flex-col min-h-screen`}>
        <header className={themeClasses.globalHeader}>
          <div className={themeClasses.globalHeaderLockup}>
            <BrandMark variant="nav" />
            <span className={themeClasses.globalHeaderProduct}>Fleet</span>
          </div>
          <div className={themeClasses.globalHeaderActions}>
            <NotificationControl
              count={notifications.count}
              loading={notifications.loading}
              error={notifications.error}
              offline={notifications.offline || offline}
              items={notifications.items}
              truncated={notifications.truncated}
              open={menuOpen}
              onOpenChange={setMenuOpen}
              onRetry={() => void notifications.refresh()}
            />
          </div>
        </header>
        <div className={`${themeClasses.pageHeader} px-content-gutter-compact pt-2`}>
          <h1 className={themeClasses.pageTitle}>{title}</h1>
          {action ? <div className={themeClasses.pageHeaderActions}>{action}</div> : null}
        </div>
        <main className={`${themeClasses.contentPadCompact} w-full flex flex-col gap-2 flex-1`}>
          <OfflineBanner offline={offline} />
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
}

export function Denied({ title, body }: { title: string; body: string }) {
  const { me } = useAuth();
  const backHref = me?.role === "driver" ? "/driver" : me ? "/home" : "/";
  const backLabel = me?.role === "driver" ? "Back to home" : "Back";
  return (
    <div className="flex flex-col gap-2 max-w-[400px]">
      <h2 className={themeClasses.title}>{title}</h2>
      <p className={`${themeClasses.body} text-text-secondary`}>{body}</p>
      <Link
        href={backHref}
        className={`${themeClasses.buttonSecondary} inline-flex items-center justify-center`}
      >
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
