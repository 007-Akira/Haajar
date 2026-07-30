import type { JSX } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";

import { PrimaryButton } from "../actions/primary-button";
import { SecondaryButton } from "../actions/secondary-button";
import { RoleBadge, type UserRole } from "../status/role-badge";

export interface RegistrationAnswer {
  label: string;
  value: string;
}

export interface MemberVerificationSheetProps {
  visible: boolean;
  memberName: string;
  phone: string;
  groupName: string;
  role: UserRole;
  registrationAnswers: RegistrationAnswer[];
  attendanceStatus: string;
  previousMarkingTime?: string;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

export function MemberVerificationSheet(props: MemberVerificationSheetProps): JSX.Element {
  return (
    <Modal
      animationType="slide"
      onRequestClose={props.onCancel}
      transparent
      visible={props.visible}
    >
      <View style={styles.modal}>
        <Pressable
          accessibilityLabel="Close member verification"
          accessibilityRole="button"
          onPress={props.onCancel}
          style={styles.scrim}
        />
        <View accessibilityViewIsModal style={styles.sheet} testID={props.testID}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>[ VERIFY MEMBER ]</Text>
          <View style={styles.header}>
            <View style={styles.copy}>
              <Text style={styles.name}>{props.memberName}</Text>
              <Text style={styles.meta}>{props.phone}</Text>
              <Text style={styles.meta}>{props.groupName}</Text>
            </View>
            <RoleBadge role={props.role} />
          </View>
          <View style={styles.answers}>
            {props.registrationAnswers.map((answer) => (
              <View key={answer.label} style={styles.answer}>
                <Text style={styles.answerLabel}>{answer.label.toUpperCase()}</Text>
                <Text style={styles.answerValue}>{answer.value}</Text>
              </View>
            ))}
          </View>
          <Text
            style={styles.status}
          >{`CURRENT STATUS: ${props.attendanceStatus.toUpperCase()}`}</Text>
          {props.previousMarkingTime ? (
            <Text style={styles.previous}>{`Previously marked ${props.previousMarkingTime}`}</Text>
          ) : null}
          <PrimaryButton
            fullWidth
            label="Confirm Present"
            onPress={props.onConfirm}
            testID="confirm-present-button"
          />
          <SecondaryButton
            fullWidth
            label="Cancel"
            onPress={props.onCancel}
            testID="cancel-verification-button"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing["2xl"],
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  handle: {
    width: spacing["3xl"],
    height: spacing.half,
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: radii.pill,
  },
  eyebrow: { ...typography.technicalLabel, color: colors.accent },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  copy: { flex: 1, gap: spacing.half },
  name: { ...typography.headingMedium, color: colors.textPrimary },
  meta: { ...typography.body, color: colors.textSecondary },
  answers: {
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  answer: {
    gap: spacing.half,
    padding: spacing.sm,
    borderBottomColor: colors.gridLine,
    borderBottomWidth: layout.borderWidth,
  },
  answerLabel: { ...typography.technicalLabel, color: colors.textSecondary },
  answerValue: { ...typography.bodyMedium, color: colors.textPrimary },
  status: { ...typography.technicalLabel, color: colors.textPrimary },
  previous: { ...typography.caption, color: colors.textSecondary },
});
