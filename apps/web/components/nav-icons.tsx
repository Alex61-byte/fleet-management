import { themeClasses } from "../../../design/tailwind.theme";
import type { ReactNode } from "react";

export type NavIconName = "home" | "users" | "truck" | "shield" | "user-cog" | "more";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function HomeGlyph() {
  return (
    <>
      <path {...strokeProps} d="M4 10.5 12 4l8 6.5" />
      <path {...strokeProps} d="M6.5 9.5V19a1 1 0 0 0 1 1h3.25v-5.25h2.5V20H16.5a1 1 0 0 0 1-1V9.5" />
    </>
  );
}

function UsersGlyph() {
  return (
    <>
      <circle {...strokeProps} cx="9" cy="8" r="3" />
      <path {...strokeProps} d="M3.5 19.5c.6-3.1 2.7-4.75 5.5-4.75s4.9 1.65 5.5 4.75" />
      <circle {...strokeProps} cx="16.5" cy="8.25" r="2.25" />
      <path {...strokeProps} d="M14.75 14.6c1.55-.35 2.85.2 3.75 1.55.55.85.85 1.85.95 2.85" />
    </>
  );
}

function TruckGlyph() {
  return (
    <>
      <path {...strokeProps} d="M3 16.5V8.75A1.75 1.75 0 0 1 4.75 7H13.5v9.5" />
      <path {...strokeProps} d="M13.5 10.5h3.35c.4 0 .77.2.99.53L19.5 14v2.5" />
      <path {...strokeProps} d="M3 16.5h16.5" />
      <circle {...strokeProps} cx="7.25" cy="16.5" r="1.75" />
      <circle {...strokeProps} cx="16.25" cy="16.5" r="1.75" />
    </>
  );
}

function ShieldGlyph() {
  return (
    <path
      {...strokeProps}
      d="M12 3.5 5.5 6.25v5.1c0 4.05 2.7 7.35 6.5 8.65 3.8-1.3 6.5-4.6 6.5-8.65v-5.1L12 3.5Z"
    />
  );
}

function UserCogGlyph() {
  return (
    <>
      <circle {...strokeProps} cx="9" cy="8" r="3" />
      <path {...strokeProps} d="M3.75 19.25c.55-2.95 2.55-4.5 5.25-4.5 1.05 0 1.95.25 2.7.7" />
      <circle {...strokeProps} cx="16.5" cy="15.5" r="2.35" />
      <path {...strokeProps} d="M16.5 12.4v1.05M16.5 17.55v1.05M13.9 14l.9.55M18.2 16.45l.9.55M13.9 17l.9-.55M18.2 14.55l.9-.55" />
    </>
  );
}

function MoreGlyph() {
  // Tiny centers may use fill so horizontal dots stay legible at 20px.
  return (
    <>
      <circle cx="6" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </>
  );
}

const glyphs: Record<NavIconName, () => ReactNode> = {
  home: HomeGlyph,
  users: UsersGlyph,
  truck: TruckGlyph,
  shield: ShieldGlyph,
  "user-cog": UserCogGlyph,
  more: MoreGlyph,
};

/** Decorative Owner/Admin nav glyph — color via currentColor / parent text class. */
export function NavIcon({ name }: { name: NavIconName }) {
  const Glyph = glyphs[name];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={themeClasses.navIcon}
      aria-hidden="true"
    >
      <g className={themeClasses.navIconGlyph}>
        <Glyph />
      </g>
    </svg>
  );
}

export function navIconForHref(href: string): NavIconName {
  switch (href) {
    case "/home":
      return "home";
    case "/drivers":
      return "users";
    case "/vehicles":
      return "truck";
    case "/security":
      return "shield";
    case "/admins":
      return "user-cog";
    default:
      return "home";
  }
}
