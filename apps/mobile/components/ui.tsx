import type { VehicleCustomExpiration, Warning } from "@fleet/sdk";
import { warningFieldLabel } from "@fleet/sdk";
import { Link } from "expo-router";
import { forwardRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps,
} from "react-native";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-1">
      <Text className="font-medium text-label text-text-primary">{label}</Text>
      {children}
      {hint && !error ? <Text className="text-caption text-text-secondary">{hint}</Text> : null}
      {error ? (
        <Text className="text-caption text-danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export const TextInput = forwardRef<
  RNTextInput,
  TextInputProps & { error?: boolean; className?: string }
>(function TextInput({ error, className, autoCapitalize, autoCorrect, ...props }, ref) {
  // Passwords must never pick up sentence capitalization (iOS default breaks login).
  const secure = Boolean(props.secureTextEntry);
  return (
    <RNTextInput
      ref={ref}
      className={`min-h-hit px-2 rounded-md bg-surface border text-body text-text-primary ${
        error ? "border-danger" : "border-border"
      } ${className ?? ""}`}
      placeholderTextColor="#4b5968"
      autoCapitalize={autoCapitalize ?? (secure ? "none" : undefined)}
      autoCorrect={autoCorrect ?? (secure ? false : undefined)}
      {...props}
    />
  );
});

export function SelectInput({
  label,
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const display = selected?.label || placeholder;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: Boolean(disabled), expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`min-h-hit px-2 rounded-md bg-surface border border-border justify-center ${
          disabled ? "opacity-50" : ""
        }`}
      >
        <Text className={`text-body ${selected ? "text-text-primary" : "text-text-secondary"}`}>
          {display}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setOpen(false)}
          accessibilityLabel={`Dismiss ${label}`}
        >
          <Pressable
            className="max-h-[70%] bg-surface rounded-t-lg border border-border"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="px-2 py-2 border-b border-border flex-row items-center justify-between">
              <Text className="font-semibold text-title text-text-primary">{label}</Text>
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} className="min-h-hit px-2 justify-center">
                <Text className="font-medium text-label text-brand">Done</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value || "__empty"}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`min-h-hit px-2 justify-center border-b border-divider ${
                      active ? "bg-selected" : "bg-surface"
                    }`}
                  >
                    <Text
                      className={`text-body ${active ? "font-semibold text-text-primary" : "text-text-primary"}`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  busy,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      className={`min-h-hit px-3 rounded-md items-center justify-center ${
        disabled || busy ? "bg-disabled-surface" : "bg-brand"
      }`}
    >
      {busy ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text className={`font-semibold text-label ${disabled ? "text-disabled" : "text-text-inverse"}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className={`min-h-hit px-3 rounded-md bg-surface border border-border items-center justify-center ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <Text className="font-semibold text-label text-text-primary">{title}</Text>
    </Pressable>
  );
}

export function PrimaryLink({
  href,
  title,
}: {
  href: ComponentProps<typeof Link>["href"];
  title: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        className="min-h-hit px-3 rounded-md bg-brand items-center justify-center"
      >
        <Text className="font-semibold text-label text-text-inverse">{title}</Text>
      </Pressable>
    </Link>
  );
}

export function DangerButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className="min-h-hit px-3 rounded-md bg-danger items-center justify-center"
    >
      <Text className="font-semibold text-label text-text-inverse">{title}</Text>
    </Pressable>
  );
}

export function Banner({ children, tone = "danger" }: { children: string; tone?: "danger" | "warning" }) {
  return (
    <View
      className={`p-2 rounded-md ${tone === "warning" ? "bg-warning-subtle" : "bg-danger-subtle"}`}
      accessibilityLiveRegion="assertive"
    >
      <Text className={tone === "warning" ? "text-warning" : "text-danger"}>{children}</Text>
    </View>
  );
}

export function ExpiryBadges({
  warnings,
  customExpirations,
}: {
  warnings: Warning[];
  customExpirations?: Iterable<Pick<VehicleCustomExpiration, "id" | "label">>;
}) {
  if (!warnings.length) return null;
  return (
    <View className="flex-row flex-wrap gap-1">
      {warnings.map((w) => (
        <View
          key={`${w.field}-${w.state}`}
          className={`px-1 py-0.5 rounded-full ${
            w.state === "expired" ? "bg-danger-subtle" : "bg-warning-subtle"
          }`}
        >
          <Text className={`text-caption font-medium ${w.state === "expired" ? "text-danger" : "text-warning"}`}>
            {warningFieldLabel(w.field, customExpirations)}{" "}
            {w.state === "expired" ? "Expired" : "Due soon"}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="flex-1 bg-surface p-2 gap-2">
      <Text className="font-semibold text-title text-text-primary" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}
