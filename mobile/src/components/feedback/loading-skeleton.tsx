import type { JSX } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";

import { colors, layout, opacity, radii, spacing } from "@/theme";

export interface LoadingSkeletonProps {
  lines?: number;
  width?: DimensionValue;
  testID?: string;
}

export function LoadingSkeleton({
  lines = layout.skeletonDefaultLines,
  width = layout.fullWidth,
  testID,
}: LoadingSkeletonProps): JSX.Element {
  return (
    <View
      accessibilityLabel="Loading content"
      accessibilityRole="progressbar"
      style={[styles.container, { width }]}
      testID={testID}
    >
      <View style={styles.title} />
      {Array.from({ length: lines }).map((_, index) => (
        <View key={index} style={styles.line} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    width: layout.skeletonTitleWidth,
    height: layout.skeletonTitleHeight,
    backgroundColor: colors.gridLine,
    borderRadius: radii.xs,
    opacity: opacity.skeleton,
  },
  line: {
    width: layout.fullWidth,
    height: layout.skeletonLineHeight,
    backgroundColor: colors.gridLine,
    borderRadius: radii.xs,
    opacity: opacity.skeleton,
  },
});
