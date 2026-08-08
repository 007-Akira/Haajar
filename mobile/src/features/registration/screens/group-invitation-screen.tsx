import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import {
  EmptyState,
  LabeledDetailRow,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
} from "@/components";
import { useSession } from "@/features/auth";
import { useGroup } from "@/features/groups/hooks/use-group";
import { useGroupMembership } from "@/features/groups/hooks/use-group-membership";
import { SensitiveContentCover, useSensitiveScreenPrivacy } from "@/features/privacy";
import { colors, layout, palette, radii, shadows, spacing, typography } from "@/theme";

import { useEphemeralGroupInvitation } from "../hooks/use-ephemeral-group-invitation";
import {
  buildInvitationShareMessage,
  canCreateGroupInvitation,
} from "../types/group-invitation-models";

export function GroupInvitationScreen(): JSX.Element {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ eventId: string; groupId: string }>();
  const { user } = useSession();
  const groupQuery = useGroup(groupId);
  const membershipQuery = useGroupMembership(groupId);
  const invitationState = useEphemeralGroupInvitation(groupId, user?.id);
  const privacy = useSensitiveScreenPrivacy({
    protectionKey: "haajar-group-invitation",
    onBackground: invitationState.clear,
    onBlur: invitationState.clear,
  });
  const [activityMessage, setActivityMessage] = useState("");
  const backAction = {
    accessibilityLabel: "Go back to group details",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => {
      invitationState.clear();
      router.back();
    },
    testID: "group-invitation-back",
  };

  if (privacy.obscured) return <SensitiveContentCover />;

  if (groupQuery.isLoading || membershipQuery.isLoading || membershipQuery.sessionLoading) {
    return (
      <ScreenContainer scroll showGrid testID="group-invitation-loading">
        <PageHeader leadingAction={backAction} title="Invite Members" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  }

  if (groupQuery.isError || membershipQuery.isError) {
    return (
      <ScreenContainer showGrid testID="group-invitation-error">
        <PageHeader leadingAction={backAction} title="Invite Members" />
        <EmptyState
          actionLabel="Retry"
          description="The invitation tools could not be loaded. Check your connection and try again."
          onActionPress={() => {
            void groupQuery.refetch();
            void membershipQuery.refetch();
          }}
          title="Invitation unavailable"
        />
      </ScreenContainer>
    );
  }

  const group = groupQuery.data;
  const membership = membershipQuery.data;
  if (group?.status === "archived") {
    return (
      <ScreenContainer showGrid testID="group-invitation-archived">
        <PageHeader leadingAction={backAction} title="Invite Members" />
        <EmptyState
          actionLabel="Go Back"
          description="Archived groups cannot issue new invitations."
          onActionPress={() => router.back()}
          title="Group archived"
        />
      </ScreenContainer>
    );
  }

  if (!group || !canCreateGroupInvitation(membership?.role, membership?.status, group.status)) {
    return (
      <ScreenContainer showGrid testID="group-invitation-unauthorised">
        <PageHeader leadingAction={backAction} title="Invite Members" />
        <EmptyState
          actionLabel="Go Back"
          description="Only an active group organiser can generate invitations."
          onActionPress={() => router.back()}
          title="Permission unavailable"
        />
      </ScreenContainer>
    );
  }

  const groupName = group.name;
  const invitation = invitationState.invitation;
  async function copy(value: string, label: string): Promise<void> {
    await Clipboard.setStringAsync(value);
    setActivityMessage(`${label} copied.`);
  }

  async function share(): Promise<void> {
    if (!invitation) return;
    await Share.share({ message: buildInvitationShareMessage(groupName, invitation.deepLink) });
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      scroll
      showGrid
      testID="group-invitation-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={group.eventName ?? "Trip"}
        title="Invite Members"
      />
      <View style={styles.contextCard}>
        <LabeledDetailRow label="Group" value={group.name} />
        <LabeledDetailRow label="Trip" value={group.eventName ?? "Trip"} />
        <Text style={styles.help}>
          This group has one private invitation. The same code and QR can be shared whenever a new
          member needs to join.
        </Text>
      </View>

      {!invitation ? (
        <PrimaryButton
          accessibilityLabel="Show the group invitation"
          disabled={invitationState.isGenerating}
          fullWidth
          label="Show Group Invitation"
          loading={invitationState.isGenerating}
          onPress={() => void invitationState.generate()}
          testID="generate-group-invitation"
        />
      ) : (
        <View style={styles.generated} testID="generated-group-invitation">
          <Text style={styles.heading}>Invitation ready</Text>
          <View accessibilityLabel="Invitation QR code" style={styles.qrBox}>
            <QRCode
              backgroundColor={palette.white}
              color={palette.black}
              size={layout.qrPlaceholderSize}
              value={invitation.deepLink}
            />
          </View>
          <LabeledDetailRow label="Join code" value={invitation.invitationToken} />
          <LabeledDetailRow label="Deep link" value={invitation.deepLink} />
          <View style={styles.actions}>
            <SecondaryButton
              fullWidth
              label="Copy Code"
              onPress={() => void copy(invitation.invitationToken, "Join code")}
              testID="copy-invitation-code"
            />
            <SecondaryButton
              fullWidth
              label="Copy Link"
              onPress={() => void copy(invitation.deepLink, "Invitation link")}
              testID="copy-invitation-link"
            />
            <PrimaryButton
              fullWidth
              label="Share Invitation"
              onPress={() => void share()}
              testID="share-group-invitation"
            />
          </View>
        </View>
      )}
      {invitationState.errorMessage ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {invitationState.errorMessage}
        </Text>
      ) : null}
      {activityMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.activity}>
          {activityMessage}
        </Text>
      ) : null}
      <Text style={styles.security}>
        Invitation details are kept only while this screen is open. Screenshots and app-switcher
        previews are blocked.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing["2xl"] },
  contextCard: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: palette.white,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  generated: {
    gap: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
    ...shadows.hardSmall,
  },
  heading: { ...typography.headingMedium, color: colors.textPrimary },
  help: { ...typography.body, color: colors.textSecondary },
  qrBox: {
    alignSelf: "center",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  actions: { gap: spacing.sm },
  error: { ...typography.body, color: colors.danger },
  activity: { ...typography.body, color: colors.success },
  security: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
});
