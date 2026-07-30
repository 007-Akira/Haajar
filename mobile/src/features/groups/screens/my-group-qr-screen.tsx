import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  PageHeader,
  PrimaryButton,
  QRMembershipCard,
  ScreenContainer,
  SecondaryButton,
  type QRValidity,
} from "@/components";
import { colors, layout, spacing, typography } from "@/theme";

import { getMockGroupDetails } from "../data/mock-group-details";

function resolveValidity(state?: string): QRValidity {
  if (state === "revoked" || state === "regenerated") {
    return state;
  }

  return "valid";
}

export function MyGroupQRScreen(): JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventId: string;
    groupId: string;
    state?: string;
  }>();
  const [activityMessage, setActivityMessage] = useState("");
  const group = getMockGroupDetails(params.eventId, params.groupId);
  const validity = resolveValidity(params.state);
  const isRevoked = validity === "revoked";

  if (!group) {
    return (
      <ScreenContainer showGrid testID="group-qr-error">
        <PageHeader
          leadingAction={{
            accessibilityLabel: "Go back",
            icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
            onPress: () => router.back(),
          }}
          title="My Group QR"
        />
        <EmptyState
          actionLabel="Go Back"
          description="This mock membership could not be found."
          onActionPress={() => router.back()}
          title="QR unavailable"
        />
      </ScreenContainer>
    );
  }

  const validityNote =
    validity === "regenerated"
      ? "This preview represents a newly regenerated group credential."
      : validity === "revoked"
        ? "This group credential has been revoked and cannot be used."
        : "This group credential is valid for roll call.";

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      scroll
      showGrid
      testID="my-group-qr-screen"
    >
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back to group details",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: () => router.back(),
          testID: "group-qr-back-button",
        }}
        subtitle={group.eventName}
        title="My Group QR"
      />

      <QRMembershipCard
        eventName={group.eventName}
        groupName={group.name}
        memberName={group.membership.memberName}
        membershipReference={group.membership.membershipReference}
        role={group.membership.role}
        testID="group-membership-qr-card"
        validity={validity}
      />

      <View style={styles.guidance}>
        <Text style={styles.guidanceText}>Show this QR to an organiser during roll call.</Text>
        <Text style={[styles.validityNote, isRevoked && styles.revokedNote]}>{validityNote}</Text>
        <Text style={styles.securityNote}>[ GROUP-SPECIFIC CREDENTIAL · RAW TOKEN HIDDEN ]</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          disabled={isRevoked}
          fullWidth
          label="Share QR"
          onPress={() => setActivityMessage("Mock Share QR action selected.")}
          testID="share-group-qr-button"
        />
        <SecondaryButton
          disabled={isRevoked}
          fullWidth
          label="Save QR"
          onPress={() => setActivityMessage("Mock Save QR action selected.")}
          testID="save-group-qr-button"
        />
      </View>

      {activityMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.activityMessage}>
          {activityMessage}
        </Text>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing["2xl"],
  },
  guidance: {
    alignItems: "center",
    gap: spacing.xs,
  },
  guidanceText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    textAlign: "center",
  },
  validityNote: {
    ...typography.caption,
    color: colors.success,
    textAlign: "center",
  },
  revokedNote: {
    color: colors.danger,
  },
  securityNote: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
    textAlign: "center",
  },
  actions: {
    gap: spacing.sm,
  },
  activityMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
