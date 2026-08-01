import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, layout, radii, spacing, typography } from "@/theme";

export interface SegmentedTab<T extends string> {
  label: string;
  value: T;
  count?: number;
}
export interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  testID?: string;
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  accessibilityLabel,
  testID,
}: SegmentedTabsProps<T>): JSX.Element {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tablist"
      style={styles.row}
      testID={testID}
    >
      {tabs.map((tab) => {
        const selected = value === tab.value;
        return (
          <Pressable
            key={tab.value}
            accessibilityLabel={`${tab.label}${tab.count === undefined ? "" : `, ${tab.count}`}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.value)}
            style={[styles.tab, selected && styles.selectedTab]}
            testID={testID ? `${testID}-${tab.value}` : undefined}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>
              {tab.count === undefined ? tab.label : `${tab.label} ${tab.count}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.xs },
  tab: {
    flex: 1,
    minHeight: layout.minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  selectedTab: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  label: { ...typography.badge, color: colors.textPrimary, textAlign: "center" },
  selectedLabel: { color: colors.background },
});
