"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMarkPublic, OfflineBanner, Skeleton } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { useAuth } from "../../lib/auth-context";
import {
  type AccountKindFilter,
  plansForKind,
} from "../../lib/pricing-catalog";

export default function PublicPricingPage() {
  const { me, ready, offline } = useAuth();
  const router = useRouter();
  const signedInStaff = Boolean(me && me.role !== "driver");
  const showSkeletons = !ready || signedInStaff;
  const [kind, setKind] = useState<AccountKindFilter>("individual");
  const plans = plansForKind(kind);

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
              <Link href="/" className={themeClasses.publicLockup}>
                <BrandMarkPublic />
                <span className={themeClasses.publicWordmark}>Fleet</span>
              </Link>
              <div className={themeClasses.publicHeaderActions}>
                <span
                  className={`${themeClasses.caption} font-semibold text-text-primary px-1 min-h-hit inline-flex items-center`}
                  aria-current="page"
                >
                  Pricing
                </span>
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
        <div>
          <h1 className={themeClasses.pageTitle}>Pricing</h1>
          <p className={themeClasses.pageSubtitle}>
            Software plans. No hardware. Prices in USD; tax not included.
          </p>
        </div>
        <div
          className={themeClasses.pricingKindToggle}
          role="tablist"
          aria-label="Account kind"
        >
          <button
            type="button"
            role="tab"
            aria-selected={kind === "individual"}
            className={
              kind === "individual"
                ? `${themeClasses.pricingKindOptionSelected} focus-visible:shadow-ring`
                : `${themeClasses.pricingKindOption} focus-visible:shadow-ring`
            }
            onClick={() => setKind("individual")}
          >
            Individual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kind === "company"}
            className={
              kind === "company"
                ? `${themeClasses.pricingKindOptionSelected} focus-visible:shadow-ring`
                : `${themeClasses.pricingKindOption} focus-visible:shadow-ring`
            }
            onClick={() => setKind("company")}
          >
            Company
          </button>
        </div>
        <div className={themeClasses.pricingGrid}>
          {showSkeletons
            ? [0, 1].map((i) => (
                <div key={i} className={themeClasses.pricingCard} aria-hidden="true">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-2 w-40" />
                  <Skeleton className="min-h-hit w-full mt-2" />
                </div>
              ))
            : plans.map((plan) => {
                const cardClass = plan.popular
                  ? themeClasses.pricingCardPopular
                  : themeClasses.pricingCard;
                const ctaClass = plan.popular
                  ? themeClasses.buttonPrimary
                  : themeClasses.buttonSecondary;
                return (
                  <section key={plan.code} className={cardClass} aria-labelledby={`plan-${plan.code}`}>
                    <div className="flex flex-row items-start justify-between gap-1">
                      <h2 id={`plan-${plan.code}`} className={themeClasses.pricingCardName}>
                        {plan.name}
                      </h2>
                      {plan.popular ? (
                        <span className={themeClasses.badgeNeutral}>Popular</span>
                      ) : null}
                    </div>
                    <p className={themeClasses.caption}>{plan.blurb}</p>
                    <div>
                      <p className={themeClasses.pricingCardPrice}>{plan.priceLabel}</p>
                      <p className={themeClasses.pricingCardMeter}>{plan.meter}</p>
                    </div>
                    <ul className={themeClasses.pricingFeatureList}>
                      {plan.features.map((f) => (
                        <li
                          key={f.text}
                          className={
                            f.included
                              ? themeClasses.pricingFeatureItem
                              : themeClasses.pricingFeatureMuted
                          }
                        >
                          {f.included ? f.text : `Not included: ${f.text}`}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={plan.ctaHref}
                      className={`${ctaClass} focus-visible:shadow-ring inline-flex items-center justify-center w-full mt-auto`}
                    >
                      {plan.ctaLabel}
                    </Link>
                  </section>
                );
              })}
        </div>
        <p className={themeClasses.pricingFootnote}>
          Checkout and plan limits are not billed in-product yet. Creating an account does not charge
          a card.
        </p>
      </div>
    </div>
  );
}
