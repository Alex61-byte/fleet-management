"use client";

import Link from "next/link";
import { AppFooter } from "../../components/app-footer";
import { BrandMarkPublic, OfflineBanner, Skeleton } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { useAuth } from "../../lib/auth-context";

const SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: "who",
    title: "Who we are",
    body: [
      "This Privacy notice describes how the Fleet product (“Fleet”, “we”, “us”) handles personal data when you use our websites, web app, and related services.",
      "Until a formal legal entity address is published for your region, treat the Fleet product operators as the controller of personal data processed to run the service. Workspace Owners may also act as controllers of operational data they enter about their own drivers and fleet.",
    ],
  },
  {
    id: "scope",
    title: "Scope",
    body: [
      "Fleet is offered for global use. This notice applies to visitors, account holders (Owners, Admins, Individual Owners), and Drivers who access Fleet on the web or through supported clients.",
      "It covers personal data processed to provide the product. It is a product draft for transparency, not certified legal advice and not a substitute for local counsel or a full multi-jurisdiction schedule.",
    ],
  },
  {
    id: "categories",
    title: "Personal data we process",
    body: [
      "Depending on how you use Fleet, we may process: account identifiers (such as email address); authentication data (password hashes, session tokens, optional authenticator/TOTP secrets); profile and role information; company workspace details you provide (for example legal name, registration, VAT, and address fields); driver invite and acceptance records; vehicle and compliance-related records you store; handover and daily usage entries; optional images you upload (such as vehicle appearance or handover damage photos); technical logs needed to operate and secure the service; and support communications you send us.",
      "We do not require you to submit special-category data to use core Fleet features. Please do not upload content you are not permitted to share.",
    ],
  },
  {
    id: "purposes",
    title: "Purposes and legal bases",
    body: [
      "We process personal data to: create and secure accounts; authenticate users; provide tenant-scoped fleet features; send transactional messages such as invites and password resets; maintain service integrity and prevent abuse; improve reliability; and meet legal obligations that apply to us.",
      "Where GDPR or similar laws apply, we rely on appropriate bases such as performance of a contract (providing the service you requested), legitimate interests (securing and operating the product in a way that does not override your rights), consent where we specifically ask for it, and legal obligation when required. Workspace customers may have their own bases for data they upload about drivers or staff.",
    ],
  },
  {
    id: "sharing",
    title: "Sharing and processors",
    body: [
      "We do not sell personal data. We share data with service providers who process it on our instructions to host infrastructure, send email, store files, or monitor service health—only as needed to run Fleet.",
      "We may disclose information if required by law, to protect rights and safety, or in connection with a corporate transaction, subject to appropriate safeguards. Other users in your tenant see data according to product roles (for example Owners and Admins managing company drivers).",
    ],
  },
  {
    id: "transfers",
    title: "International transfers",
    body: [
      "Because Fleet operates globally, personal data may be processed in countries other than where you live. When we transfer personal data internationally, we use appropriate safeguards recognized by applicable law (such as contractual protections with processors) where required.",
      "Exact hosting regions may change as infrastructure evolves; we aim to keep transfers limited to what is necessary to deliver the service.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    body: [
      "We keep personal data only as long as needed for the purposes above: while your account or tenant is active, for a reasonable period afterward for security and dispute handling, and longer when law requires or permits (for example audit or abuse prevention).",
      "Workspace Owners control much of the operational content in their tenant. Deleting a driver or other records in-product removes access according to product rules; residual copies may remain briefly in backups.",
    ],
  },
  {
    id: "security",
    title: "Security",
    body: [
      "We apply administrative and technical measures appropriate to a multi-tenant SaaS product, including access controls, encrypted transport (HTTPS), password hashing, optional TOTP for eligible roles, and tenant isolation in application logic.",
      "No method of transmission or storage is fully secure. You are responsible for protecting account credentials and for configuring your workspace responsibly.",
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    body: [
      "Depending on your location, you may have rights to access, correct, delete, or restrict processing of your personal data; to object to certain processing; to data portability; and to withdraw consent where processing is consent-based. You may also lodge a complaint with a supervisory authority in your country of residence or work.",
      "This page is not an in-product data-subject request portal. To exercise rights, use the contact path below. We may need to verify your identity and may direct workspace-held data requests to the relevant tenant Owner when they are the controller.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    body: [
      "Fleet uses cookies and similar technologies that are necessary to sign in, keep sessions secure, and operate the web application. We do not use the product as an advertising network.",
      "If we add non-essential analytics or marketing cookies later, we will update this notice and apply any consent mechanism required by law.",
    ],
  },
  {
    id: "children",
    title: "Children",
    body: [
      "Fleet is directed at organizations and adults managing vehicles and drivers. It is not intended for children. We do not knowingly collect personal data from children for the purpose of offering the service to them.",
    ],
  },
  {
    id: "changes",
    title: "Changes",
    body: [
      "We may update this Privacy notice as the product or laws change. The version published at this URL is current when you view it. Material changes may be highlighted in-product or by other reasonable notice when appropriate.",
    ],
  },
  {
    id: "contact",
    title: "Contact and requests",
    body: [
      "Privacy questions and data-subject requests may be sent through your usual Fleet support channel or the contact method published on the Fleet website for your region.",
      "If you use Fleet through a company workspace, you may also contact your workspace Owner or Admin. For product terms of use, see the separate Terms and Conditions page.",
    ],
  },
];

export default function PublicPrivacyPage() {
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
          <h1 className={themeClasses.pageTitle}>Privacy</h1>
          <p className={themeClasses.pageSubtitle}>
            How Fleet handles personal data for global product use. Product draft — not legal advice.
          </p>
          <p className={themeClasses.termsMeta}>Product draft · effective when published at this URL</p>
        </div>
        <article className={themeClasses.termsDocument} aria-label="Privacy">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              className={themeClasses.termsSection}
              aria-labelledby={`privacy-${section.id}`}
            >
              <h2 id={`privacy-${section.id}`} className={themeClasses.termsSectionTitle}>
                {section.title}
              </h2>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className={themeClasses.termsSectionBody}>
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
