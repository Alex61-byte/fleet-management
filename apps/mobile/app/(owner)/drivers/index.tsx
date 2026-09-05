import type { Driver } from "@fleet/sdk";
import { Link, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Banner, PrimaryButton, PrimaryLink } from "../../../components/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

function statusCopy(d: Driver) {
  if (!d.login_enabled) return "Login disabled";
  if (d.must_change_password) return "Invite pending";
  return "Can sign in";
}

export default function DriversList() {
  const { offline } = useAuth();
  const [items, setItems] = useState<Driver[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems((await api.listDrivers()).items);
    } catch {
      setError("Could not load drivers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-2 gap-2">
      <Stack.Screen
        options={{
          title: "Drivers",
          headerRight: () => (
            <Link href="/(owner)/drivers/new" className="text-brand text-label font-semibold">
              Add driver
            </Link>
          ),
        }}
      />
      {offline ? <Banner tone="warning">You are offline.</Banner> : null}
      {loading ? (
        <View className="h-12 bg-disabled-surface rounded-md" />
      ) : error ? (
        <>
          <Banner>{error}</Banner>
          <PrimaryButton title="Retry" onPress={() => void load()} />
        </>
      ) : items && items.length === 0 ? (
        <>
          <Text className="text-body text-text-primary">No drivers yet. Invite a driver by email — they set their own password.</Text>
          <PrimaryLink href="/(owner)/drivers/new" title="Add driver" />
        </>
      ) : (
        items?.map((d) => (
          <Link key={d.id} href={`/(owner)/drivers/${d.id}`} asChild>
            <Pressable
              className="bg-surface-raised border border-border rounded-md p-2 min-h-hit"
              accessibilityLabel={`${d.email} ${statusCopy(d)}`}
            >
              <Text className="font-medium text-label text-text-primary">{d.email}</Text>
              <Text className="text-caption text-text-secondary">{statusCopy(d)}</Text>
            </Pressable>
          </Link>
        ))
      )}
    </ScrollView>
  );
}
