import { Stack } from "expo-router";
import { OwnerHeaderNotifications } from "../../../components/owner-header-notifications";

/** Prefer list over dynamic `[id]` when the Drivers tab mounts. */
export const unstable_settings = {
  initialRouteName: "index",
};

export default function DriversStack() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitleStyle: { color: "#0c1219" },
        headerRight: () => <OwnerHeaderNotifications />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Drivers" }} />
      <Stack.Screen name="new" options={{ title: "Add driver" }} />
      <Stack.Screen name="[id]" options={{ title: "Edit driver" }} />
    </Stack>
  );
}
