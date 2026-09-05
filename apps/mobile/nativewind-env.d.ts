/// <reference types="nativewind/types" />

// RN 0.86 + TS moduleResolution bundler: ensure className merges onto RN props.
// NativeWind's package types load but do not always merge in this monorepo layout.
import "react-native";

declare module "react-native" {
  interface ViewProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface TextProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface ImagePropsBase {
    className?: string;
    cssInterop?: boolean;
  }
  interface PressableStateCallbackType {
    // keep ambient
  }
  interface TouchableWithoutFeedbackProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface SwitchProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface TextInputProps {
    className?: string;
    placeholderClassName?: string;
  }
  interface ScrollViewProps {
    contentContainerClassName?: string;
    indicatorClassName?: string;
  }
}

// Pressable uses PressableProps which may not be an interface on the root module
declare module "react-native/Libraries/Components/Pressable/Pressable" {
  interface PressableProps {
    className?: string;
  }
}
