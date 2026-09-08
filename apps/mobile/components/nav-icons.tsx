import { View, type ColorValue } from "react-native";
import Svg, { Circle, Path, type NumberProp } from "react-native-svg";

export type NavIconName = "home" | "users" | "truck" | "shield" | "user-cog" | "more" | "bell";

/** Design token spacing.nav-icon — numeric for RN tabBar (class/% SVG collapses). */
export const NAV_ICON_SIZE = 22;
const STROKE = 1.75;

type GlyphProps = {
  color: string;
};

function stroke(color: string) {
  return {
    fill: "none" as const,
    stroke: color,
    strokeWidth: STROKE as NumberProp,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function HomeGlyph({ color }: GlyphProps) {
  const s = stroke(color);
  return (
    <>
      <Path {...s} d="M4 10.5 12 4l8 6.5" />
      <Path {...s} d="M6.5 9.5V19a1 1 0 0 0 1 1h3.25v-5.25h2.5V20H16.5a1 1 0 0 0 1-1V9.5" />
    </>
  );
}

function UsersGlyph({ color }: GlyphProps) {
  const s = stroke(color);
  return (
    <>
      <Circle {...s} cx="9" cy="8" r="3" />
      <Path {...s} d="M3.5 19.5c.6-3.1 2.7-4.75 5.5-4.75s4.9 1.65 5.5 4.75" />
      <Circle {...s} cx="16.5" cy="8.25" r="2.25" />
      <Path {...s} d="M14.75 14.6c1.55-.35 2.85.2 3.75 1.55.55.85.85 1.85.95 2.85" />
    </>
  );
}

function TruckGlyph({ color }: GlyphProps) {
  const s = stroke(color);
  return (
    <>
      <Path {...s} d="M3 16.5V8.75A1.75 1.75 0 0 1 4.75 7H13.5v9.5" />
      <Path {...s} d="M13.5 10.5h3.35c.4 0 .77.2.99.53L19.5 14v2.5" />
      <Path {...s} d="M3 16.5h16.5" />
      <Circle {...s} cx="7.25" cy="16.5" r="1.75" />
      <Circle {...s} cx="16.25" cy="16.5" r="1.75" />
    </>
  );
}

function ShieldGlyph({ color }: GlyphProps) {
  return (
    <Path
      {...stroke(color)}
      d="M12 3.5 5.5 6.25v5.1c0 4.05 2.7 7.35 6.5 8.65 3.8-1.3 6.5-4.6 6.5-8.65v-5.1L12 3.5Z"
    />
  );
}

function UserCogGlyph({ color }: GlyphProps) {
  const s = stroke(color);
  return (
    <>
      <Circle {...s} cx="9" cy="8" r="3" />
      <Path {...s} d="M3.75 19.25c.55-2.95 2.55-4.5 5.25-4.5 1.05 0 1.95.25 2.7.7" />
      <Circle {...s} cx="16.5" cy="15.5" r="2.35" />
      <Path
        {...s}
        d="M16.5 12.4v1.05M16.5 17.55v1.05M13.9 14l.9.55M18.2 16.45l.9.55M13.9 17l.9-.55M18.2 14.55l.9-.55"
      />
    </>
  );
}

function MoreGlyph({ color }: GlyphProps) {
  // Tiny centers may use fill so horizontal dots stay legible at 20px.
  return (
    <>
      <Circle cx="6" cy="12" r="1.25" fill={color} stroke="none" />
      <Circle cx="12" cy="12" r="1.25" fill={color} stroke="none" />
      <Circle cx="18" cy="12" r="1.25" fill={color} stroke="none" />
    </>
  );
}

function BellGlyph({ color }: GlyphProps) {
  const s = stroke(color);
  return (
    <>
      <Path
        {...s}
        d="M6.5 17.5h11M8 17.5V11a4 4 0 0 1 8 0v6.5M10.25 17.5a1.75 1.75 0 0 0 3.5 0"
      />
      <Path {...s} d="M12 4.5v1.25" />
    </>
  );
}

const glyphs: Record<NavIconName, (props: GlyphProps) => React.ReactNode> = {
  home: HomeGlyph,
  users: UsersGlyph,
  truck: TruckGlyph,
  shield: ShieldGlyph,
  "user-cog": UserCogGlyph,
  more: MoreGlyph,
  bell: BellGlyph,
};

/** Decorative Owner/Admin tab glyph — tint via parent tabBar color. */
export function NavIcon({
  name,
  color,
  size = NAV_ICON_SIZE,
}: {
  name: NavIconName;
  color: string;
  size?: number;
}) {
  const Glyph = glyphs[name];
  const tint = color || "#4b5968";
  return (
    <View
      style={{ width: size, height: size }}
      accessible={false}
      importantForAccessibility="no"
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
        <Glyph color={tint} />
      </Svg>
    </View>
  );
}

export function tabBarIconForName(name: NavIconName) {
  return function TabBarIcon({
    color,
    size,
  }: {
    color: ColorValue;
    size?: number;
  }) {
    return (
      <NavIcon
        name={name}
        color={typeof color === "string" ? color : String(color)}
        size={size ?? NAV_ICON_SIZE}
      />
    );
  };
}
