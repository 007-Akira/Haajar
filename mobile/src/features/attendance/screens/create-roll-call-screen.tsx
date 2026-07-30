import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import {
  EmptyState,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  TextField,
} from "@/components";
import { getMockGroupDetails } from "@/features/groups/data/mock-group-details";
import { colors, layout, radii, spacing, typography } from "@/theme";

import { rollCallNameExamples } from "../data/mock-roll-calls";
import { getRollCallPermissions } from "../permissions/roll-call-permissions";

export function CreateRollCallScreen(): JSX.Element {
  const router = useRouter();
  const { eventId, groupId } = useLocalSearchParams<{
    eventId: string;
    groupId: string;
  }>();
  const group = getMockGroupDetails(eventId, groupId);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [notifyMembers, setNotifyMembers] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const canCreate = group ? getRollCallPermissions(group.userRole).canCreate : false;
  const nameError = submitted && !name.trim() ? "Enter a roll-call name." : undefined;

  function handleStart(): void {
    setSubmitted(true);
    if (!group || !canCreate || !name.trim()) return;
    setLoading(true);
    setTimeout(() => {
      router.replace({
        pathname: "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]",
        params: { eventId, groupId, rollCallId: "morning-assembly" },
      });
    }, 700);
  }

  if (!group || !canCreate) {
    return (
      <ScreenContainer showGrid testID="create-roll-call-denied">
        <EmptyState
          actionLabel="Go Back"
          description="Only organisers and super organisers can create a roll call."
          onActionPress={() => router.back()}
          title="Action unavailable"
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      keyboardSafe
      scroll
      showGrid
      testID="create-roll-call-screen"
    >
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back to group details",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: () => router.back(),
        }}
        subtitle={group.name}
        title="Create Roll Call"
      />
      <View style={styles.form}>
        <TextField
          error={nameError}
          label="Roll-call name"
          onChangeText={setName}
          placeholder="Morning assembly"
          required
          testID="roll-call-name-field"
          value={name}
        />
        <TextField
          label="Note"
          multiline
          onChangeText={setNote}
          placeholder="Optional instructions"
          testID="roll-call-note-field"
          value={note}
        />
        <View style={styles.examples}>
          <Text style={styles.examplesLabel}>[ EXAMPLES ]</Text>
          {rollCallNameExamples.map((example) => (
            <SecondaryButton
              fullWidth
              key={example}
              label={example}
              onPress={() => setName(example)}
            />
          ))}
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>Notify members</Text>
            <Text style={styles.toggleDescription}>Mock preference only.</Text>
          </View>
          <Switch
            accessibilityLabel="Notify members"
            accessibilityRole="switch"
            onValueChange={setNotifyMembers}
            testID="notify-members-toggle"
            thumbColor={colors.surface}
            trackColor={{ false: colors.border, true: colors.accent }}
            value={notifyMembers}
          />
        </View>
      </View>
      <PrimaryButton
        fullWidth
        label="Start Roll Call"
        loading={loading}
        onPress={handleStart}
        testID="submit-roll-call-button"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing["2xl"] },
  form: { gap: spacing.xl },
  examples: { gap: spacing.xs },
  examplesLabel: { ...typography.technicalLabel, color: colors.textSecondary },
  toggleRow: {
    minHeight: layout.minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  toggleCopy: { flex: 1, gap: spacing.half },
  toggleTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  toggleDescription: { ...typography.caption, color: colors.textSecondary },
});
