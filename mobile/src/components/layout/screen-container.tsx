import type { JSX, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, layout, spacing } from "@/theme";

export interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  showGrid?: boolean;
  keyboardSafe?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

function GridBackground(): JSX.Element {
  const lines = Array.from({ length: layout.gridLineCount });

  return (
    <View pointerEvents="none" style={styles.grid} testID="screen-background-grid">
      {lines.map((_, index) => (
        <View
          key={`horizontal-${index}`}
          style={[styles.horizontalLine, { top: index * layout.gridSize }]}
        />
      ))}
      {lines.map((_, index) => (
        <View
          key={`vertical-${index}`}
          style={[styles.verticalLine, { left: index * layout.gridSize }]}
        />
      ))}
    </View>
  );
}

export function ScreenContainer({
  children,
  scroll = false,
  showGrid = false,
  keyboardSafe = false,
  contentContainerStyle,
  testID,
}: ScreenContainerProps): JSX.Element {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea} testID={testID}>
      {showGrid ? <GridBackground /> : null}
      {keyboardSafe ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboard}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  grid: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  horizontalLine: {
    position: "absolute",
    right: spacing.none,
    left: spacing.none,
    height: layout.gridLineWidth,
    backgroundColor: colors.gridLine,
  },
  verticalLine: {
    position: "absolute",
    top: spacing.none,
    bottom: spacing.none,
    width: layout.gridLineWidth,
    backgroundColor: colors.gridLine,
  },
});
