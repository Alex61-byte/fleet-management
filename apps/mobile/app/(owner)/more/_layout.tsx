import { Stack } from "expo-router";
import { OwnerHeaderNotifications } from "../../../components/owner-header-notifications";

export default function MoreStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitleStyle: { color: "#0c1219" },
        headerRight: () => <OwnerHeaderNotifications />,
      }}
    />
  );
}
