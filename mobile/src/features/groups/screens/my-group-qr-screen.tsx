import { useCallback, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";

import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  QRMembershipCard,
  ScreenContainer,
  SecondaryButton,
} from "@/components";
import { useSession } from "@/features/auth";
import { SensitiveContentCover, useSensitiveScreenPrivacy } from "@/features/privacy";
import { toGroupDisplayRole } from "@/features/events/permissions/event-permissions";
import { useMembershipQr } from "@/features/qr/hooks/use-membership-qr";
import { buildMembershipQrPayload } from "@/features/qr/types/qr-models";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, spacing, typography } from "@/theme";
import { queryKeys } from "@/lib/query";
import { useQueryClient } from "@tanstack/react-query";

import { useGroup } from "../hooks/use-group";
import { useGroupMembership } from "../hooks/use-group-membership";

export function MyGroupQRScreen(): JSX.Element {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ eventId: string; groupId: string }>();
  const { profile, user } = useSession();
  const queryClient = useQueryClient();
  const qrCaptureRef = useRef<View>(null);
  const transientImageRef = useRef<string | null>(null);
  const [activityMessage, setActivityMessage] = useState("");
  const [imageActionPending, setImageActionPending] = useState(false);
  const groupQuery = useGroup(groupId);
  const membershipQuery = useGroupMembership(groupId);
  const membership = membershipQuery.data;
  const hasActiveMembership = membership?.status === "active";
  const qrQuery = useMembershipQr(membership?.id, hasActiveMembership);
  const clearTransientImage = useCallback(() => {
    const uri = transientImageRef.current;
    transientImageRef.current = null;
    if (uri) void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
  }, []);
  const clearSensitiveState = useCallback(() => {
    clearTransientImage();
    if (membership?.id && user?.id) {
      queryClient.removeQueries({
        exact: true,
        queryKey: queryKeys.qr.membership(membership.id, user.id),
      });
    }
  }, [clearTransientImage, membership, queryClient, user]);
  const privacy = useSensitiveScreenPrivacy({
    protectionKey: "haajar-membership-qr",
    onBackground: clearSensitiveState,
    onBlur: clearSensitiveState,
  });
  const backAction = {
    accessibilityLabel: "Go back to group details",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "group-qr-back-button",
  };

  async function captureQrImage(): Promise<string> {
    if (!qrCaptureRef.current) throw new Error("QR image is not ready.");
    const uri = await captureRef(qrCaptureRef, { format: "png", quality: 1, result: "tmpfile" });
    transientImageRef.current = uri;
    return uri;
  }

  async function shareQr(): Promise<void> {
    if (imageActionPending) return;
    setImageActionPending(true);
    setActivityMessage("");
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setActivityMessage("Image sharing is not available on this device.");
        return;
      }
      const imageUri = await captureQrImage();
      await Sharing.shareAsync(imageUri, {
        dialogTitle: "Share Haajar group QR",
        mimeType: "image/png",
        UTI: "public.png",
      });
      setActivityMessage("QR image ready to share.");
    } catch {
      setActivityMessage("Could not share the QR image. Please try again.");
    } finally {
      clearTransientImage();
      setImageActionPending(false);
    }
  }

  async function saveQr(): Promise<void> {
    if (imageActionPending) return;
    setImageActionPending(true);
    setActivityMessage("");
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        setActivityMessage("Photo permission is required to save the QR image.");
        return;
      }
      const imageUri = await captureQrImage();
      await MediaLibrary.createAssetAsync(imageUri);
      setActivityMessage("QR image saved to your photos.");
    } catch {
      setActivityMessage("Could not save the QR image. Please try again.");
    } finally {
      clearTransientImage();
      setImageActionPending(false);
    }
  }

  if (
    groupQuery.isLoading ||
    membershipQuery.isLoading ||
    membershipQuery.sessionLoading ||
    (hasActiveMembership && qrQuery.isLoading)
  ) {
    return (
      <ScreenContainer scroll showGrid testID="group-qr-loading">
        <PageHeader leadingAction={backAction} title="My Group QR" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  }

  const failedQuery = [groupQuery, membershipQuery, qrQuery].find((query) => query.isError);
  if (failedQuery) {
    return (
      <ScreenContainer showGrid testID="group-qr-error">
        <PageHeader leadingAction={backAction} title="My Group QR" />
        <EmptyState
          actionLabel="Retry"
          description={
            isAppError(failedQuery.error)
              ? failedQuery.error.message
              : userSafeErrorMessages.UNKNOWN_ERROR
          }
          onActionPress={() => {
            void groupQuery.refetch();
            void membershipQuery.refetch();
            if (hasActiveMembership) void qrQuery.refetch();
          }}
          testID="group-qr-error-state"
          title="QR unavailable"
        />
      </ScreenContainer>
    );
  }

  if (!groupQuery.data || !membership || membership.status !== "active" || !qrQuery.data) {
    return (
      <ScreenContainer showGrid testID="group-qr-unavailable">
        <PageHeader leadingAction={backAction} title="My Group QR" />
        <EmptyState
          actionLabel="Go Back"
          description="An active membership in this group is required to use its QR credential."
          onActionPress={() => router.back()}
          testID="group-qr-no-membership-state"
          title="Active membership required"
        />
      </ScreenContainer>
    );
  }

  const qr = qrQuery.data;
  const payload = buildMembershipQrPayload(qr.version, qr.token);
  const memberName = profile?.full_name?.trim() || "Haajar member";

  if (privacy.obscured) return <SensitiveContentCover />;

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      scroll
      showGrid
      testID="my-group-qr-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={groupQuery.data.eventName ?? "Trip"}
        title="My Group QR"
      />

      <QRMembershipCard
        eventName={groupQuery.data.eventName ?? "Trip"}
        groupName={groupQuery.data.name}
        memberName={memberName}
        membershipReference={membership.id}
        payload={payload}
        qrCaptureRef={qrCaptureRef}
        role={toGroupDisplayRole(membership.role)}
        testID="group-membership-qr-card"
        validity="valid"
      />

      <View style={styles.guidance}>
        <Text style={styles.guidanceText}>Show this QR to an organiser during roll call.</Text>
        <Text style={styles.validityNote}>Active credential · Version {qr.version}</Text>
        <Text style={styles.securityNote}>[ GROUP-SPECIFIC CREDENTIAL · TOKEN HIDDEN ]</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          accessibilityLabel="Share group QR image"
          disabled={imageActionPending}
          fullWidth
          label="Share QR"
          loading={imageActionPending}
          onPress={() => void shareQr()}
          testID="share-group-qr-button"
        />
        <SecondaryButton
          accessibilityLabel="Save group QR image"
          disabled={imageActionPending}
          fullWidth
          label="Save QR"
          onPress={() => void saveQr()}
          testID="save-group-qr-button"
        />
      </View>

      {activityMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.activityMessage}>
          {activityMessage}
        </Text>
      ) : null}
      <Text style={styles.captureNote}>
        Screen capture is blocked while this credential is visible. Saving or sharing creates an
        explicit QR image that you control.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing["2xl"] },
  guidance: { alignItems: "center", gap: spacing.xs },
  guidanceText: { ...typography.bodyMedium, color: colors.textPrimary, textAlign: "center" },
  validityNote: { ...typography.caption, color: colors.success, textAlign: "center" },
  securityNote: { ...typography.technicalLabel, color: colors.textSecondary, textAlign: "center" },
  actions: { gap: spacing.sm },
  activityMessage: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
  captureNote: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
});
