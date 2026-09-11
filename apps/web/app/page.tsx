"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppFooter } from "../components/app-footer";
import { BrandMarkPublic, OfflineBanner, Skeleton } from "../components/ui";
import { themeClasses } from "../../../design/tailwind.theme";
import { useAuth } from "../lib/auth-context";

export default function PublicLandingPage() {
  const { me, ready, offline } = useAuth();
  const router = useRouter();
  const signedInStaff = Boolean(me && me.role !== "driver");
  const showSkeletons = !ready || signedInStaff;
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (ready && signedInStaff) {
      router.replace("/home");
    }
  }, [ready, signedInStaff, router]);

  useEffect(() => {
    if (!ready || !me || me.role !== "driver") return;
    router.replace("/driver");
  }, [ready, me, router]);

  if (ready && me?.role === "driver") {
    return (
      <main className={`${themeClasses.page} min-h-screen p-3`}>
        <div className="h-6 w-40 bg-disabled-surface rounded-md" />
      </main>
    );
  }

  return (
    <div className={`${themeClasses.pagePublic} min-h-screen flex flex-col`}>
      <header className={themeClasses.publicHeader}>
        <div className={themeClasses.publicHeaderInner}>
          {showSkeletons ? (
            <>
              <div className={themeClasses.publicLockup} aria-hidden="true">
                <Skeleton className="h-mark-public w-mark-public-width" />
                <Skeleton className="h-2 w-10" />
              </div>
              <div className={themeClasses.publicHeaderActions} aria-hidden="true">
                <Skeleton className="min-h-hit w-8" />
                <Skeleton className="min-h-hit w-8" />
                <Skeleton className="min-h-hit w-10" />
              </div>
            </>
          ) : (
            <>
              <div className={themeClasses.publicLockup}>
                <BrandMarkPublic />
                <span className={themeClasses.publicWordmark}>Fleet</span>
              </div>
              <div className={themeClasses.publicHeaderActions}>
                <Link
                  href="/pricing"
                  className={`${themeClasses.link} focus-visible:shadow-ring inline-flex items-center justify-center no-underline px-1`}
                >
                  Pricing
                </Link>
                <Link
                  href="/sign-in"
                  className={`${themeClasses.buttonSecondary} focus-visible:shadow-ring inline-flex items-center justify-center`}
                >
                  Sign in
                </Link>
                <Link
                  href="/account-kind"
                  className={`${themeClasses.buttonPrimary} focus-visible:shadow-ring inline-flex items-center justify-center`}
                >
                  Create account
                </Link>
              </div>
            </>
          )}
        </div>
      </header>
      <div className={themeClasses.publicBody}>
        <OfflineBanner offline={offline} />
        <div className={`${themeClasses.publicHero} md:flex-row md:items-stretch`}>
          <div className={themeClasses.publicHeroCopy}>
            <p className={`${themeClasses.badgeNeutral} w-fit`}>Web and mobile</p>
            <h1 className={themeClasses.publicHeroTitle}>Fleet</h1>
            <p className={themeClasses.publicHeroCaption}>Fleet operations</p>
            <p className={themeClasses.publicHeroLead}>
              Keep vehicles compliant, invite drivers, and record handovers in one calm ops console
              for companies and personal owners.
            </p>
            {!showSkeletons ? (
              <div className="flex flex-row flex-wrap gap-1 pt-1">
                <Link
                  href="/account-kind"
                  className={`${themeClasses.buttonPrimary} focus-visible:shadow-ring inline-flex items-center justify-center`}
                >
                  Create account
                </Link>
                <Link
                  href="/pricing"
                  className={`${themeClasses.buttonSecondary} focus-visible:shadow-ring inline-flex items-center justify-center`}
                >
                  View pricing
                </Link>
              </div>
            ) : null}
          </div>
          <div className={themeClasses.publicHeroMapStack}>
            <div className={themeClasses.publicHeroMap}>
              {showSkeletons ? (
                <div className={themeClasses.publicHeroMapSkeleton} />
              ) : mapFailed ? null : (
                <img
                  src="/landing/hero-map.svg"
                  alt="Static street map"
                  className={themeClasses.publicHeroMapImage}
                  onError={() => setMapFailed(true)}
                />
              )}
            </div>
            {!showSkeletons && !mapFailed ? (
              <p className={themeClasses.publicHeroMapCaption}>
                Schematic overview — not live GPS tracking.
              </p>
            ) : null}
          </div>
        </div>

        <div className={themeClasses.publicValueGrid} aria-label="What you can do">
          {showSkeletons ? (
            [0, 1, 2].map((i) => (
              <div key={i} className={themeClasses.publicValueCard} aria-hidden="true">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-40" />
              </div>
            ))
          ) : (
            <>
              <section className={themeClasses.publicValueCard}>
                <h2 className={themeClasses.publicValueTitle}>Compliance dates</h2>
                <p className={themeClasses.publicValueBody}>
                  Insurance, inspection, road tax, and registration with clear due-soon warnings.
                </p>
              </section>
              <section className={themeClasses.publicValueCard}>
                <h2 className={themeClasses.publicValueTitle}>Drivers and handovers</h2>
                <p className={themeClasses.publicValueBody}>
                  Companies invite drivers by email. Drivers log next travel, handovers, and daily
                  usage.
                </p>
              </section>
              <section className={themeClasses.publicValueCard}>
                <h2 className={themeClasses.publicValueTitle}>Company or personal</h2>
                <p className={themeClasses.publicValueBody}>
                  Run a multi-driver fleet or manage your own vehicles — choose at create account.
                </p>
              </section>
            </>
          )}
        </div>

        {!showSkeletons ? (
          <div className={themeClasses.publicPathRow} aria-label="Account paths">
            <section className={themeClasses.publicPathCardAccent}>
              <h2 className={themeClasses.publicValueTitle}>Company</h2>
              <p className={themeClasses.publicValueBody}>
                Built for fleets with people and vehicles to coordinate. You create the company as
                Owner, add Admins when you need help, and invite drivers by email. Keep every vehicle’s
                plate, insurance, inspection, registration country, and road tax in one place. Drivers
                can log next travel, complete vehicle handovers, and record daily usage so you always
                know who had the vehicle and what was driven. Fleet flags dates that are due soon or
                already expired.
              </p>
              <Link
                href="/sign-up"
                className={`${themeClasses.link} focus-visible:shadow-ring mt-1 inline-flex items-center min-h-hit`}
              >
                Create company
              </Link>
            </section>
            <section className={themeClasses.publicPathCard}>
              <h2 className={themeClasses.publicValueTitle}>Individual</h2>
              <p className={themeClasses.publicValueBody}>
                Built for you and the vehicles you own—no company setup and no driver roster. Track
                each vehicle’s plate, insurance, inspection, registration country, and road tax, plus
                optional custom expiration dates when you need them. Fleet warns before dates lapse
                and after they expire so renewals stay on your radar. You manage only your own
                vehicles; invites, handovers, and daily usage stay on the company path.
              </p>
              <Link
                href="/individual-sign-up"
                className={`${themeClasses.link} focus-visible:shadow-ring mt-1 inline-flex items-center min-h-hit`}
              >
                Create personal account
              </Link>
            </section>
          </div>
        ) : null}

        <div className={themeClasses.publicDescription}>
          <h2 className={themeClasses.publicDescriptionTitle}>What Fleet is for</h2>
          <p className={themeClasses.publicDescriptionBody}>
            Choose a company workspace or a personal account. With a company, you start as Owner; you and
            your Admins manage vehicles and invite drivers. With a personal account, you manage only your
            own vehicles—no drivers. For each vehicle, track plate, insurance, inspection, registration
            country, and road tax. Fleet flags dates that are coming due or already expired so nothing slips.
          </p>
          <p className={themeClasses.publicDescriptionMeta}>
            Software plans only — no hardware telematics. See{" "}
            <Link href="/pricing" className={`${themeClasses.link} focus-visible:shadow-ring`}>
              Pricing
            </Link>
            .
          </p>
        </div>
      </div>
      <AppFooter variant="public" />
    </div>
  );
}
