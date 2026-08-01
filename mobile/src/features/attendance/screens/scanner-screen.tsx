import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  MemberVerificationSheet,
  ScannerOverlay,
  ScanResultOverlay,
  SecondaryButton,
  type ScanResultTone,
  type SyncState,
} from "@/components";
import { colors, layout, spacing, typography } from "@/theme";

import { getMockRollCall, mockVerificationMember } from "../data/mock-roll-calls";
import { getMockAttendanceGroupContext } from "../data/mock-attendance-group-context";

interface ResultState {
  tone: ScanResultTone;
  title: string;
  message: string;
  syncState?: SyncState;
  autoDismiss?: boolean;
}

const specialResults: Record<string, ResultState> = {
  "already-marked": {
    tone: "warning",
    title: "Already marked present",
    message: "Mathews was previously marked at 8:16 AM.",
  },
  "wrong-group": {
    tone: "error",
    title: "Wrong group QR",
    message: "This membership QR belongs to a different group.",
  },
  revoked: {
    tone: "error",
    title: "Revoked QR",
    message: "This membership credential is no longer valid.",
  },
  invalid: {
    tone: "error",
    title: "Invalid QR",
    message: "The scanned code is not a valid Haajar membership QR.",
  },
  "outdated-roster": {
    tone: "warning",
    title: "Outdated roster",
    message: "Refresh the offline roster before confirming this member.",
  },
  "sync-failed": {
    tone: "error",
    title: "Sync failed",
    message: "Attendance could not be synced. The local mock record is retained.",
    syncState: "failed",
  },
};

export function ScannerScreen(): JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventId: string;
    groupId: string;
    rollCallId: string;
    state?: string;
  }>();
  const group = getMockAttendanceGroupContext(params.eventId, params.groupId);
  const rollCall = getMockRollCall(params.groupId, params.rollCallId);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [verificationVisible, setVerificationVisible] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);

  function handleMockScan(): void {
    const special = params.state ? specialResults[params.state] : undefined;
    if (special) {
      setResult(special);
      return;
    }
    setVerificationVisible(true);
  }

  function handleConfirm(): void {
    setVerificationVisible(false);
    const pending = params.state === "pending-sync";
    setResult({
      tone: "success",
      title: "Marked present",
      message: pending ? "Saved — Pending Sync" : "Synced",
      syncState: pending ? "pending" : "synced",
      autoDismiss: true,
    });
    setTimeout(() => setResult(null), 1250);
  }

  return (
    <SafeAreaView style={styles.screen} testID="scanner-screen">
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Close scanner"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.close}
          testID="close-scanner-button"
        >
          <Ionicons color={colors.textInverse} name="close" size={layout.iconSize} />
        </Pressable>
        <Text style={styles.headerLabel}>[ MOCK SCANNER ]</Text>
      </View>
      <ScannerOverlay
        flashEnabled={flashEnabled}
        groupName={group?.name ?? rollCall.groupName}
        online={params.state !== "pending-sync" && params.state !== "offline"}
        onToggleFlash={() => setFlashEnabled((value) => !value)}
        pendingSyncCount={params.state === "pending-sync" ? 1 : rollCall.pendingSyncCount}
        rollCallName={rollCall.name}
        testID="scanner-overlay"
      />
      <SecondaryButton
        fullWidth
        label="Mock Scan"
        onPress={handleMockScan}
        testID="mock-scan-button"
      />

      <MemberVerificationSheet
        attendanceStatus={mockVerificationMember.status}
        groupName={group?.name ?? mockVerificationMember.groupName}
        memberName={mockVerificationMember.name}
        onCancel={() => setVerificationVisible(false)}
        onConfirm={handleConfirm}
        phone={mockVerificationMember.phone}
        registrationAnswers={mockVerificationMember.registrationAnswers}
        role={mockVerificationMember.role}
        testID="member-verification-sheet"
        visible={verificationVisible}
      />
      <ScanResultOverlay
        memberName={result?.tone === "success" ? mockVerificationMember.name : undefined}
        message={result?.message ?? ""}
        onDismiss={result && !result.autoDismiss ? () => setResult(null) : undefined}
        syncState={result?.syncState}
        testID="scan-result-overlay"
        title={result?.title ?? ""}
        tone={result?.tone ?? "success"}
        visible={Boolean(result)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surfaceElevated,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  close: {
    width: layout.minimumTouchTarget,
    height: layout.minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: { ...typography.technicalLabel, color: colors.textInverse },
});
