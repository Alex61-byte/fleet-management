/** Static plan catalog — keep in sync with docs/pricing-plans.md (catalog v2) */

export type AccountKindFilter = "individual" | "company";

export type PricingPlan = {
  code: string;
  kind: AccountKindFilter;
  name: string;
  blurb: string;
  priceLabel: string;
  meter: string;
  popular?: boolean;
  features: { text: string; included: boolean }[];
  ctaHref: string;
  ctaLabel: string;
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    code: "individual_personal",
    kind: "individual",
    name: "Personal",
    blurb: "Compliance dates from $2 per car / month.",
    priceLabel: "$2",
    meter: "per active vehicle / month",
    features: [
      { text: "Own vehicles, insurance / inspection / tax / registration dates", included: true },
      { text: "30-day warnings and Vehicles nav urgency", included: true },
      { text: "Optional vehicle mileage", included: true },
      { text: "Web and mobile", included: true },
      { text: "Custom expirations, docs, digests, issues", included: false },
      { text: "Side images, MFA, notification menu", included: false },
      { text: "Drivers", included: false },
    ],
    ctaHref: "/individual-sign-up",
    ctaLabel: "Get started",
  },
  {
    code: "individual_plus",
    kind: "individual",
    name: "Personal Plus",
    blurb: "Docs, digests, service due, and issues — still just you.",
    priceLabel: "$14",
    meter: "per month workspace · up to 10 vehicles",
    popular: true,
    features: [
      { text: "Everything in Personal", included: true },
      { text: "Up to 10 vehicles (+$2.50 / vehicle / mo over 10)", included: true },
      { text: "Compliance document vault (10 / vehicle included)", included: true },
      { text: "Outbound compliance digest email", included: true },
      { text: "Service-due board and issues / defects", included: true },
      { text: "Side images, TOTP MFA, notification menu", included: true },
      { text: "Custom expirations: 3 / vehicle included, +$0.80 / mo extra", included: true },
      { text: "Drivers", included: false },
    ],
    ctaHref: "/individual-sign-up",
    ctaLabel: "Get started",
  },
  {
    code: "company_team",
    kind: "company",
    name: "Team",
    blurb: "Small company fleet: drivers, handovers, docs, and reports from $7 / vehicle.",
    priceLabel: "$7",
    meter: "per active vehicle / month · min 1",
    features: [
      { text: "Company fleet vehicles and compliance dates", included: true },
      { text: "Drivers invite (5 included, then +$4 / driver / mo)", included: true },
      { text: "1 Admin + Owner", included: true },
      { text: "Handovers, driver daily usage, owner usage report + CSV", included: true },
      { text: "Compliance docs (5 / vehicle), service due, issues", included: true },
      { text: "Outbound compliance digest email", included: true },
      { text: "Custom expirations", included: false },
      { text: "Unlimited drivers / admins", included: false },
    ],
    ctaHref: "/sign-up",
    ctaLabel: "Get started",
  },
  {
    code: "company_fleet",
    kind: "company",
    name: "Fleet",
    blurb: "Scale drivers and admins plus docs depth from $11 / vehicle.",
    priceLabel: "$11",
    meter: "per active vehicle / month · min 5 billed",
    popular: true,
    features: [
      { text: "Everything in Team ops depth", included: true },
      { text: "Unlimited drivers and Admins", included: true },
      { text: "Compliance docs (20 / vehicle included, hard cap 40)", included: true },
      { text: "Custom expirations: 3 / vehicle included, +$0.80 / mo extra", included: true },
      { text: "Side images, MFA, digests, service due, issues, reports", included: true },
      { text: "Priority support copy", included: true },
    ],
    ctaHref: "/sign-up",
    ctaLabel: "Get started",
  },
];

export function plansForKind(kind: AccountKindFilter): PricingPlan[] {
  return PRICING_PLANS.filter((p) => p.kind === kind);
}
