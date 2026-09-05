import { vehiclesNavA11yLabel } from "@fleet/sdk";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { tabBarIconForName } from "../../components/nav-icons";
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

  const vehiclesTabStyle =
    vehiclesUrgency === "critical"
      ? { backgroundColor: NAV_URGENCY_CRITICAL }
      : vehiclesUrgency === "warning"
        ? { backgroundColor: NAV_URGENCY_SOON }
        : undefined;
  const vehiclesTint =
    vehiclesUrgency === "none" ? undefined : NAV_URGENCY_FG;

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
        options={{
          title: "Drivers",
          headerShown: false,
          tabBarIcon: tabBarIconForName("users"),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: "Vehicles",
          headerShown: false,
          tabBarIcon: tabBarIconForName("truck"),
          tabBarAccessibilityLabel: vehiclesNavA11yLabel(vehiclesUrgency),
          tabBarActiveTintColor: vehiclesTint ?? TAB_ACTIVE,
          tabBarInactiveTintColor: vehiclesTint ?? TAB_INACTIVE,
          tabBarItemStyle: vehiclesTabStyle,
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
