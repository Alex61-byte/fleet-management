import { vehiclesNavA11yLabel } from "@fleet/sdk";
import { Redirect, Tabs, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { NavIcon, tabBarIconForName } from "../../components/nav-icons";
import { useAuth } from "../../lib/auth";
import { useVehiclesNavUrgency } from "../../lib/vehicles-nav-urgency";

const NAV_URGENCY_CRITICAL = "#b42318";
const NAV_URGENCY_SOON = "#93370d";
const NAV_URGENCY_FG = "#ffffff";
const TAB_ACTIVE = "#163a64";
const TAB_INACTIVE = "#4b5968";
const TAB_BAR_BG = "#ffffff";

export default function OwnerLayout() {
  const { me, ready } = useAuth();
  const router = useRouter();
  const ownerAdmin = Boolean(me && me.role !== "driver");
  const vehiclesUrgency = useVehiclesNavUrgency(ownerAdmin);

  if (!ready) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  if (!me) return <Redirect href="/sign-in" />;
  if (me.role === "driver") return <Redirect href="/(driver)/denied" />;

  const vehiclesUrgent = vehiclesUrgency !== "none";
  const vehiclesUrgencyBg =
    vehiclesUrgency === "critical"
      ? NAV_URGENCY_CRITICAL
      : vehiclesUrgency === "warning"
        ? NAV_URGENCY_SOON
        : undefined;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: TAB_BAR_BG, height: 44 },
        headerTitleStyle: { fontSize: 20, fontWeight: "600", color: "#0c1219" },
        // Icon + label need >44; default RN label (~10px) is too small for US-32.
        tabBarStyle: {
          minHeight: 56,
          paddingTop: 4,
          paddingBottom: 4,
          backgroundColor: TAB_BAR_BG,
        },
        // Global tints only. Never put urgency white on tabBar*TintColor for Vehicles —
        // BottomTabBar applies the *focused* route's tints to every tab (white-on-white).
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: tabBarIconForName("home") }}
      />
      <Tabs.Screen
        name="drivers"
        listeners={{
          // Nested stack can restore `[id]`; tab should always open the list.
          tabPress: (event) => {
            event.preventDefault();
            router.navigate("/(owner)/drivers");
          },
        }}
        options={{
          title: "Drivers",
          headerShown: false,
          tabBarIcon: tabBarIconForName("users"),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        listeners={{
          // Nested stack can restore `[id]`; tab should always open the list.
          tabPress: (event) => {
            event.preventDefault();
            router.navigate("/(owner)/vehicles");
          },
        }}
        options={({ navigation }) => {
          const focused = navigation.isFocused();
          return {
            title: "Vehicles",
            headerShown: false,
            tabBarAccessibilityLabel: vehiclesNavA11yLabel(vehiclesUrgency),
            // US-28: fill + inverse fg on this item only (not bar-wide tints).
            tabBarIcon: ({ color, size }) => (
              <NavIcon
                name="truck"
                color={
                  vehiclesUrgent
                    ? NAV_URGENCY_FG
                    : typeof color === "string"
                      ? color
                      : TAB_INACTIVE
                }
                size={size}
              />
            ),
            tabBarLabelStyle: {
              fontSize: 13,
              fontWeight: "600",
              marginTop: 2,
              ...(vehiclesUrgent ? { color: NAV_URGENCY_FG } : null),
            },
            tabBarItemStyle: vehiclesUrgent
              ? {
                  backgroundColor: vehiclesUrgencyBg,
                  // Selected + urgency: top edge in nav-urgency-fg (design tabItemUrgencySelected).
                  ...(focused
                    ? { borderTopWidth: 2, borderTopColor: NAV_URGENCY_FG }
                    : { borderTopWidth: 0 }),
                }
              : undefined,
          };
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          headerShown: false,
          tabBarIcon: tabBarIconForName("more"),
        }}
      />
    </Tabs>
  );
}
