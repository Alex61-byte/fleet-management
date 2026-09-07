import { Stack } from "expo-router";

/** Prefer list over dynamic `[id]` when the Vehicles tab mounts. */
export const unstable_settings = {
  initialRouteName: "index",
};

export default function VehiclesStack() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitleStyle: { color: "#0c1219" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Vehicles" }} />
      <Stack.Screen name="new" options={{ title: "Add vehicle" }} />
      <Stack.Screen name="[id]" options={{ title: "Edit vehicle" }} />
    </Stack>
  );
}
