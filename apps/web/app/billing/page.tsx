"use client";

import { AppShell } from "../../components/app-shell";
import { themeClasses } from "../../../../design/tailwind.theme";

export default function BillingPage() {
  return (
    <AppShell title="Billing">
      <section className={themeClasses.panel} aria-labelledby="billing-status-heading">
        <h2 id="billing-status-heading" className={themeClasses.label}>
          Plan &amp; billing
        </h2>
        <p className={`${themeClasses.body} mt-1`}>
          In-product billing is not available yet. You can keep using Fleet; no payment is collected
          here.
        </p>
        <p className={`${themeClasses.caption} mt-1`}>
          Software plan catalog for new accounts stays on the public Pricing page when signed out.
          Payment collection and entitlements will arrive in a later release.
        </p>
      </section>
    </AppShell>
  );
}
