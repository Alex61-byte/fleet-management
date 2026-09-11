"use client";

import Link from "next/link";
import { AppFooter } from "../../components/app-footer";
import { BrandMarkPublic, OfflineBanner, Skeleton } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { useAuth } from "../../lib/auth-context";

const SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: "service",
    title: "Service description",
    body: [
      "Fleet is a software-as-a-service product that helps organizations and individuals manage fleet operations. Core capabilities may include vehicle records, compliance date tracking, company driver administration, vehicle handovers, and driver daily usage logs, as exposed in the product from time to time.",
      "Fleet provides software tools only. It is not a dispatch network, carrier, insurer, or regulator, and it does not replace professional advice for transport, employment, or safety compliance in your jurisdiction.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts and tenancy",
    body: [
      "Access requires an account. Company workspaces and individual workspaces are separate tenants. You are responsible for keeping sign-in credentials confidential and for activity under accounts you control.",
      "Owners and admins manage users and fleet data within their workspace according to product roles. Drivers receive access only to the driver experiences granted by their company. You must provide accurate registration details and promptly update them when they change.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: [
      "You may use Fleet only for lawful fleet and vehicle administration purposes. You must not attempt to gain unauthorized access to other tenants’ data, probe or disrupt the service, misuse invites or authentication flows, upload unlawful or harmful content, or reverse engineer the product except where applicable law allows.",
      "We may suspend or restrict access when we reasonably believe these terms or applicable law have been violated, or when needed to protect the service or other customers.",
    ],
  },
  {
    id: "data",
    title: "Data and tenancy",
    body: [
      "Fleet is designed so operational data is scoped to your tenant (company or individual workspace). Role-based product controls limit what signed-in users can see and change inside that tenant.",
      "This page is not a privacy policy. Personal-data processing, rights, and related topics are described in the separate Privacy notice at /privacy.",
    ],
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    body: [
      "Fleet is provided on an “as is” and “as available” basis to the fullest extent permitted by law. We do not warrant uninterrupted or error-free operation, or that the service will meet every operational, legal, or regulatory requirement you may have.",
      "Plan catalogs and in-product billing placeholders may describe future commercial packaging. Creating an account does not, by itself, charge a payment card. In-product payment processing is offered only when explicitly enabled in the product.",
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: [
      "To the fullest extent permitted by applicable law, Fleet and its operators are not liable for indirect, incidental, special, consequential, or lost-profit damages, or for loss of data, goodwill, or business opportunity, arising from use of or inability to use the service.",
      "Nothing in these terms excludes liability that cannot be excluded under applicable law (including for fraud or willful misconduct where such exclusion is prohibited).",
    ],
  },
  {
    id: "changes",
    title: "Changes to terms",
    body: [
      "We may update these Terms and Conditions as the product evolves. The version published at this URL is the current product terms. Material changes may be highlighted in-product or by other reasonable notice when appropriate.",
      "Continued use of Fleet after updated terms are published constitutes acceptance of the revised terms, except where applicable law requires a different process. This slice does not impose a separate clickwrap or re-accept gate inside the app.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    body: [
      "Questions about these terms may be sent through your usual Fleet support channel or the contact method published on the Fleet website for your region.",
      "If you cannot reach support, contact the workspace Owner who invited you or who manages your Fleet tenant.",
    ],
  },
];

export default function PublicTermsPage() {
  const { ready, offline } = useAuth();
  const showHeaderSkeletons = !ready;

  return (
    <div className={`${themeClasses.pagePublic} min-h-screen flex flex-col`}>
      <header className={themeClasses.publicHeader}>
        <div className={themeClasses.publicHeaderInner}>
          {showHeaderSkeletons ? (
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
                <Link
                  href="/pricing"
                  className={`${themeClasses.link} focus-visible:shadow-ring inline-flex items-center no-underline min-h-hit px-1`}
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
        <div>
          <h1 className={themeClasses.pageTitle}>Terms and Conditions</h1>
          <p className={themeClasses.pageSubtitle}>
            Product terms for using Fleet. Not a substitute for legal advice.
          </p>
          <p className={themeClasses.termsMeta}>Product draft · effective when published at this URL</p>
        </div>
        <article className={themeClasses.termsDocument} aria-label="Terms and Conditions">
          {SECTIONS.map((section) => (
            <section key={section.id} className={themeClasses.termsSection} aria-labelledby={`terms-${section.id}`}>
              <h2 id={`terms-${section.id}`} className={themeClasses.termsSectionTitle}>
                {section.title}
              </h2>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 32)} className={themeClasses.termsSectionBody}>
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
      </div>
      <AppFooter variant="public" />
    </div>
  );
}
