/** Static plan catalog — keep in sync with docs/pricing-plans.md */

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
    blurb: "Compliance dates from $1.50 per car / month.",
    priceLabel: "$1.50",
    meter: "per active vehicle / month",
    features: [
      { text: "Own vehicles, insurance / inspection / tax / registration dates", included: true },
      { text: "30-day warnings and Vehicles nav urgency", included: true },
      { text: "Optional vehicle mileage", included: true },
      { text: "Web and mobile", included: true },
      { text: "Custom expirations", included: false },
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
    blurb: "Photos, MFA, alerts, and custom dates — still just you.",
    priceLabel: "$9",
    meter: "per month workspace · up to 10 vehicles",
    popular: true,
    features: [
      { text: "Everything in Personal", included: true },
      { text: "Up to 10 vehicles (+$2 / vehicle / mo over 10)", included: true },
      { text: "Side images (four sides)", included: true },
      { text: "TOTP MFA and compliance notification menu", included: true },
      { text: "Custom expirations: 3 / vehicle included, +$0.70 / mo per extra row", included: true },
      { text: "Drivers", included: false },
    ],
    ctaHref: "/individual-sign-up",
    ctaLabel: "Get started",
  },
  {
    code: "company_team",
    kind: "company",
    name: "Team",
    blurb: "Small company fleet: drivers, handovers, and usage from $5 / vehicle.",
    priceLabel: "$5",
    meter: "per active vehicle / month · min 1",
    features: [
      { text: "Company fleet vehicles and compliance dates", included: true },
      { text: "Drivers invite (5 included, then +$3 / driver / mo)", included: true },
      { text: "1 Admin + Owner", included: true },
      { text: "Handovers and driver daily usage", included: true },
      { text: "Web and mobile", included: true },
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
    blurb: "Scale drivers and admins plus custom dates from $8 / vehicle.",
    priceLabel: "$8",
    meter: "per active vehicle / month · min 5 billed",
    popular: true,
    features: [
      { text: "Everything in Team ops depth", included: true },
      { text: "Unlimited drivers and Admins", included: true },
      { text: "Custom expirations: 3 / vehicle included, +$0.70 / mo per extra row", included: true },
      { text: "Side images, MFA, notification menu", included: true },
      { text: "Priority support copy", included: true },
    ],
    ctaHref: "/sign-up",
    ctaLabel: "Get started",
  },
];

export function plansForKind(kind: AccountKindFilter): PricingPlan[] {
  return PRICING_PLANS.filter((p) => p.kind === kind);
}
