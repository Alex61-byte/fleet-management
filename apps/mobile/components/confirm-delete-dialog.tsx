import { Modal, Pressable, Text, View } from "react-native";
import Svg, { Path, type NumberProp } from "react-native-svg";
import { DangerButton, SecondaryButton } from "./ui";

export type ConfirmDeleteDialogProps = {
  open: boolean;
  title: string;
  body: string;
  caption?: string;
  confirmLabel: string;
  confirmBusyLabel?: string;
  busy?: boolean;
  disabledConfirm?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Standing destructive-confirm pattern (US-40 / A41 / rule 61).
 */
export function ConfirmDeleteDialog({
  open,
  title,
  body,
  caption,
  confirmLabel,
  confirmBusyLabel = "Working…",
  busy = false,
  disabledConfirm = false,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <Pressable
        className="flex-1 bg-surface-overlay justify-end p-3"
        disabled={busy}
        onPress={() => {
          if (!busy) onCancel();
        }}
      >
        <Pressable
          className="bg-surface-raised border border-border rounded-lg p-3 gap-2 shadow-overlay"
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="summary"
          accessibilityLabel={title}
        >
          <Text className="font-semibold text-section text-text-primary">{title}</Text>
          <Text className="text-body text-text-primary">{body}</Text>
          {caption ? <Text className="text-caption text-text-secondary">{caption}</Text> : null}
          <SecondaryButton title="Cancel" disabled={busy} onPress={onCancel} />
          <DangerButton
            title={busy ? confirmBusyLabel : confirmLabel}
            disabled={busy || disabledConfirm}
            onPress={onConfirm}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const STROKE = 1.75 as NumberProp;

/** Outline trash icon for clear/delete icon buttons. */
export function TrashIcon({ size = 20, color = "#b42318" }: { size?: number; color?: string }) {
  const s = {
    fill: "none" as const,
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path {...s} d="M4 7h16" />
      <Path {...s} d="M10 11v6" />
      <Path {...s} d="M14 11v6" />
      <Path {...s} d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
      <Path {...s} d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </Svg>
  );
}
