"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
        {showSkeletons ? (
          <>
            <div className={themeClasses.publicLockup} aria-hidden="true">
              <Skeleton className="h-mark-public w-mark-public-width" />
              <Skeleton className="h-2 w-10" />
            </div>
            <div className={themeClasses.publicHeaderActions} aria-hidden="true">
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
                href="/sign-in"
                className={`${themeClasses.buttonSecondary} focus-visible:shadow-ring inline-flex items-center justify-center`}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className={`${themeClasses.buttonPrimary} focus-visible:shadow-ring inline-flex items-center justify-center`}
              >
                Create company
              </Link>
            </div>
          </>
        )}
      </header>
      <div className={themeClasses.publicBody}>
        <OfflineBanner offline={offline} />
        <div className={`${themeClasses.publicHero} md:flex-row`}>
          <div className={themeClasses.publicHeroCopy}>
            <h1 className={themeClasses.publicHeroTitle}>Fleet</h1>
            <p className={themeClasses.publicHeroCaption}>Fleet operations</p>
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
          </div>
        </div>
        <div className={themeClasses.publicDescription}>
          <h2 className={themeClasses.publicDescriptionTitle}>What Fleet is for</h2>
          <p className={themeClasses.publicDescriptionBody}>
            Create a company. The first person is the Owner. Owners and Admins manage drivers and
            vehicles for that company. Drivers use mobile. Vehicles keep license plate, insurance,
            inspection, country of registration, and road tax dates. Fleet warns when those dates
            are due soon or expired.
          </p>
        </div>
      </div>
    </div>
  );
}
