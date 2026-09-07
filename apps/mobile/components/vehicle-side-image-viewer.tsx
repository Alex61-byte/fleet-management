import { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, type NumberProp } from "react-native-svg";

/** design/tokens/motion.json → vehicle-side-zoom */
export const VEHICLE_SIDE_ZOOM = {
  min: 1,
  max: 3,
  step: 0.5,
  default: 1,
} as const;

function clampZoom(value: number): number {
  const stepped = Math.round(value / VEHICLE_SIDE_ZOOM.step) * VEHICLE_SIDE_ZOOM.step;
  return Math.min(VEHICLE_SIDE_ZOOM.max, Math.max(VEHICLE_SIDE_ZOOM.min, Number(stepped.toFixed(2))));
}

export type VehicleSideImageViewerProps = {
  open: boolean;
  sideLabel: string;
  imageUrl: string;
  onClose: () => void;
  /** When set, replaces default `{sideLabel} photo` (e.g. damage photo N of M). */
  title?: string;
};

/**
 * US-42–US-44 view-only side image viewer (full-screen; not clear-confirm sheet).
 * Also reused for handover damage enlarge (US-54/56).
 */
export function VehicleSideImageViewer({
  open,
  sideLabel,
  imageUrl,
  onClose,
  title: titleOverride,
}: VehicleSideImageViewerProps) {
  const insets = useSafeAreaInsets();
  const [zoom, setZoom] = useState<number>(VEHICLE_SIDE_ZOOM.default);
  const [loadError, setLoadError] = useState(false);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const pinchBaseDistance = useRef<number | null>(null);
  const pinchStartZoom = useRef<number>(VEHICLE_SIDE_ZOOM.default);

  useEffect(() => {
    if (!open) return;
    setZoom(VEHICLE_SIDE_ZOOM.default);
    setLoadError(false);
    pinchBaseDistance.current = null;
    pinchStartZoom.current = VEHICLE_SIDE_ZOOM.default;
  }, [open, imageUrl]);

  const title = titleOverride?.trim() || `${sideLabel} photo`;
  const atMin = zoom <= VEHICLE_SIDE_ZOOM.min;
  const atMax = zoom >= VEHICLE_SIDE_ZOOM.max;

  function onStageLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setStageSize({ w: width, h: height });
  }

  function touchDistance(touches: GestureResponderEvent["nativeEvent"]["touches"]): number | null {
    if (touches.length < 2) return null;
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
  }

  function onTouchStart(e: GestureResponderEvent) {
    const d = touchDistance(e.nativeEvent.touches);
    if (d != null && d > 0) {
      pinchBaseDistance.current = d;
      pinchStartZoom.current = zoom;
    }
  }

  function onTouchMove(e: GestureResponderEvent) {
    const d = touchDistance(e.nativeEvent.touches);
    const base = pinchBaseDistance.current;
    if (d == null || base == null || base <= 0) return;
    setZoom(clampZoom(pinchStartZoom.current * (d / base)));
  }

  function onTouchEnd() {
    pinchBaseDistance.current = null;
    setZoom((z) => clampZoom(z));
  }

  return (
    <Modal
      visible={open}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 bg-canvas"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        accessibilityViewIsModal
      >
        <View className="h-vehicle-side-viewer-toolbar px-2 flex-row items-center justify-between gap-1 border-b border-divider bg-surface-raised">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close photo viewer"
            onPress={onClose}
            className="h-hit w-hit flex items-center justify-center rounded-md p-0"
            hitSlop={8}
          >
            <CloseIcon />
          </Pressable>
          <Text
            className="flex-1 min-w-0 font-semibold text-label text-text-primary text-center"
            numberOfLines={1}
          >
            {title}
          </Text>
          <View className="flex-row items-center gap-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={atMin ? "Zoom out, minimum zoom" : "Zoom out"}
              disabled={atMin}
              onPress={() => setZoom((z) => clampZoom(z - VEHICLE_SIDE_ZOOM.step))}
              className={`h-hit w-hit flex items-center justify-center rounded-md p-0 ${atMin ? "opacity-40" : ""}`}
              hitSlop={8}
            >
              <ZoomOutIcon />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={atMax ? "Zoom in, maximum zoom" : "Zoom in"}
              disabled={atMax}
              onPress={() => setZoom((z) => clampZoom(z + VEHICLE_SIDE_ZOOM.step))}
              className={`h-hit w-hit flex items-center justify-center rounded-md p-0 ${atMax ? "opacity-40" : ""}`}
              hitSlop={8}
            >
              <ZoomInIcon />
            </Pressable>
          </View>
        </View>

        <View
          className="flex-1 min-h-0 bg-surface-sunken items-center justify-center overflow-hidden p-2"
          onLayout={onStageLayout}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          {loadError ? (
            <Text className="text-caption text-text-secondary text-center p-2">
              Photo could not be shown.
            </Text>
          ) : (
            <Image
              source={{ uri: imageUrl }}
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              onError={() => setLoadError(true)}
              style={{
                width: Math.max(stageSize.w - 16, 1),
                height: Math.max(stageSize.h - 16, 1),
                transform: [{ scale: zoom }],
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const STROKE = 1.75 as NumberProp;
/** Matches text-primary token used by other outline icons on mobile chrome. */
const ICON_STROKE = "#0f172a";

function CloseIcon() {
  const s = {
    fill: "none" as const,
    stroke: ICON_STROKE,
    strokeWidth: STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path {...s} d="M6 6l12 12" />
      <Path {...s} d="M18 6L6 18" />
    </Svg>
  );
}

function ZoomInIcon() {
  const s = {
    fill: "none" as const,
    stroke: ICON_STROKE,
    strokeWidth: STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle {...s} cx="11" cy="11" r="7" />
      <Path {...s} d="M21 21l-4.3-4.3" />
      <Path {...s} d="M11 8v6" />
      <Path {...s} d="M8 11h6" />
    </Svg>
  );
}

function ZoomOutIcon() {
  const s = {
    fill: "none" as const,
    stroke: ICON_STROKE,
    strokeWidth: STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle {...s} cx="11" cy="11" r="7" />
      <Path {...s} d="M21 21l-4.3-4.3" />
      <Path {...s} d="M8 11h6" />
    </Svg>
  );
}
