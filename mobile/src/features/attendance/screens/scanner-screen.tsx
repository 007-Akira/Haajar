import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type CameraMountError,
} from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { AppState, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  EmptyState,
  LoadingSkeleton,
  MemberVerificationSheet,
  PrimaryButton,
  ScannerOverlay,
  ScanResultOverlay,
  SecondaryButton,
  type ScanResultTone,
} from "@/components";
import { useGroup } from "@/features/groups/hooks/use-group";
import { useResolveMembershipQr } from "@/features/qr/hooks/use-resolve-membership-qr";
import type { MembershipQrResolution } from "@/features/qr/types/qr-models";
import { appErrorCodes, isAppError } from "@/lib/errors";
import { colors, layout, spacing, typography } from "@/theme";

import { createEphemeralSecretStore } from "../config/ephemeral-secret";
import {
  createScannerGate,
  getResolutionResultCopy,
  type ScannerPhase,
} from "../config/scanner-state";
import { useMarkQrAttendance } from "../hooks/use-mark-qr-attendance";
import { useRollCallDashboard } from "../hooks/use-roll-call-dashboard";

type ValidResolution = Extract<MembershipQrResolution, { status: "valid" }>;

interface ResultState {
  tone: ScanResultTone;
  title: string;
  message: string;
  memberName?: string;
}

export function ScannerScreen(): JSX.Element {
  const router = useRouter();
  const { eventId, groupId, rollCallId } = useLocalSearchParams<{
    eventId: string;
    groupId: string;
    rollCallId: string;
  }>();
  const groupQuery = useGroup(groupId);
  const dashboardQuery = useRollCallDashboard(rollCallId);
  const resolver = useResolveMembershipQr();
  const attendanceMutation = useMarkQrAttendance();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<ScannerPhase>("ready");
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [verification, setVerification] = useState<ValidResolution | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [gate] = useState(createScannerGate);
  const [tokenStore] = useState(createEphemeralSecretStore);
  const mountedRef = useRef(true);
  const appActiveRef = useRef(AppState.currentState === "active");
  const operationRef = useRef(0);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearResultTimer(): void {
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = null;
  }

  function resumeScanner(): void {
    clearResultTimer();
    tokenStore.clear();
    setVerification(null);
    setResult(null);
    setPhase("ready");
    if (appActiveRef.current) gate.resume();
  }

  function showResult(nextResult: ResultState, autoResume = false): void {
    tokenStore.clear();
    setVerification(null);
    setResult(nextResult);
    setPhase("result");
    gate.pause();
    if (autoResume) {
      clearResultTimer();
      resultTimerRef.current = setTimeout(() => {
        if (mountedRef.current && appActiveRef.current) resumeScanner();
      }, 1400);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener("change", (state) => {
      appActiveRef.current = state === "active";
      setAppActive(state === "active");
      if (state !== "active") {
        operationRef.current += 1;
        clearResultTimer();
        tokenStore.clear();
        gate.pause();
        setVerification(null);
        setResult(null);
        setPhase("ready");
      } else {
        gate.resume();
      }
    });
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      subscription.remove();
      clearResultTimer();
      tokenStore.clear();
      gate.clear();
    };
  }, [gate, tokenStore]);

  const dashboard = dashboardQuery.data;
  const group = groupQuery.data;
  const canScan =
    dashboard?.permissions.canScan === true &&
    dashboard.rollCall.status === "active" &&
    dashboard.rollCall.eventId === eventId;
  const scanningEnabled =
    permission?.granted === true && !cameraUnavailable && appActive && phase === "ready" && canScan;

  async function handleBarcodeScanned(scan: BarcodeScanningResult): Promise<void> {
    if (!scanningEnabled || !gate.tryAcquire()) return;
    const operation = ++operationRef.current;
    setPhase("resolving");
    tokenStore.set(scan.data);
    try {
      const resolution = await resolver.resolveMembershipQr({
        expectedGroupId: groupId,
        presentedToken: scan.data,
      });
      if (!mountedRef.current || !appActiveRef.current || operation !== operationRef.current) {
        tokenStore.clear();
        return;
      }
      if (resolution.status !== "valid") {
        showResult(getResolutionResultCopy(resolution.status));
        return;
      }
      setVerification(resolution);
      setPhase("verifying");
    } catch (error) {
      tokenStore.clear();
      if (!mountedRef.current || !appActiveRef.current || operation !== operationRef.current)
        return;
      showResult(
        isAppError(error) && error.code === appErrorCodes.network
          ? {
              tone: "error",
              title: "Network unavailable",
              message: "The ticket could not be verified. Check your connection and retry.",
            }
          : {
              tone: "error",
              title: "Verification failed",
              message: "The ticket could not be verified safely. Please retry.",
            }
      );
    }
  }

  async function confirmPresent(): Promise<void> {
    if (!verification || phase !== "verifying") return;
    const presentedToken = tokenStore.take();
    if (!presentedToken) {
      showResult({
        tone: "error",
        title: "Scan expired",
        message: "Scan the member ticket again before confirming attendance.",
      });
      return;
    }
    setPhase("marking");
    const operation = ++operationRef.current;
    try {
      const marked = await attendanceMutation.markQrAttendance({
        groupId,
        presentedToken,
        rollCallId,
      });
      if (!mountedRef.current || !appActiveRef.current || operation !== operationRef.current)
        return;
      if (marked.outcome === "marked") {
        showResult(
          {
            tone: "success",
            title: "Marked present",
            memberName: verification.displayName,
            message: marked.markedAt
              ? `Recorded at ${formatTime(marked.markedAt)}.`
              : "Attendance recorded successfully.",
          },
          true
        );
      } else if (marked.outcome === "already_marked") {
        showResult({
          tone: "warning",
          title: "Already marked present",
          memberName: verification.displayName,
          message: marked.markedAt
            ? `Previously recorded at ${formatTime(marked.markedAt)}.`
            : "This member is already present.",
        });
      } else {
        showResult(attendanceOutcomeCopy(marked.outcome));
      }
    } catch (error) {
      if (!mountedRef.current || !appActiveRef.current || operation !== operationRef.current)
        return;
      showResult(
        isAppError(error) && error.code === appErrorCodes.network
          ? {
              tone: "error",
              title: "Network unavailable",
              message: "Attendance was not marked. Check your connection and retry the scan.",
            }
          : {
              tone: "error",
              title: "Attendance not marked",
              message: "The attendance update was rejected safely. Scan the ticket again.",
            }
      );
    }
  }

  if (groupQuery.isPending || dashboardQuery.isPending || permission === null) {
    return (
      <ScannerState>
        <LoadingSkeleton lines={5} testID="scanner-loading" />
      </ScannerState>
    );
  }
  if (groupQuery.isError || dashboardQuery.isError || !group || !dashboard) {
    return (
      <ScannerState>
        <EmptyState
          actionLabel="Retry"
          description="The active roll call could not be loaded."
          onActionPress={() => void Promise.all([groupQuery.refetch(), dashboardQuery.refetch()])}
          testID="scanner-load-error"
          title="Scanner unavailable"
        />
      </ScannerState>
    );
  }
  if (!canScan || group.status === "archived" || group.eventStatus === "archived") {
    return (
      <ScannerState>
        <EmptyState
          description="You do not have active scanner permission for this roll call."
          testID="scanner-unauthorised"
          title="Scanner access required"
        />
      </ScannerState>
    );
  }
  if (!permission.granted) {
    return (
      <ScannerState>
        <EmptyState
          description="Camera access is required to scan Haajar membership tickets."
          testID="camera-permission-denied"
          title="Allow camera access"
        />
        {permission.canAskAgain ? (
          <PrimaryButton
            fullWidth
            label="Allow Camera"
            onPress={() => void requestPermission()}
            testID="request-camera-permission"
          />
        ) : (
          <PrimaryButton
            fullWidth
            label="Open Android Settings"
            onPress={() => void Linking.openSettings()}
            testID="open-camera-settings"
          />
        )}
        <SecondaryButton fullWidth label="Cancel" onPress={() => router.back()} />
      </ScannerState>
    );
  }
  if (cameraUnavailable) {
    return (
      <ScannerState>
        <EmptyState
          actionLabel="Try Again"
          description="Android could not start the camera. Close other camera apps and retry."
          onActionPress={() => setCameraUnavailable(false)}
          testID="camera-unavailable"
          title="Camera unavailable"
        />
      </ScannerState>
    );
  }

  const existingAttendance = [...dashboard.presentMembers, ...dashboard.remainingMembers].find(
    (member) => member.membershipId === verification?.membershipId
  );

  return (
    <SafeAreaView style={styles.screen} testID="attendance-qr-scanner">
      <CameraView
        active={appActive}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        enableTorch={flashEnabled}
        facing="back"
        onBarcodeScanned={scanningEnabled ? (scan) => void handleBarcodeScanned(scan) : undefined}
        onMountError={(_error: CameraMountError) => setCameraUnavailable(true)}
        style={StyleSheet.absoluteFill}
        testID="attendance-camera-preview"
      />
      <ScannerOverlay
        flashEnabled={flashEnabled}
        groupName={group.name}
        onToggleFlash={() => setFlashEnabled((value) => !value)}
        paused={!scanningEnabled}
        rollCallName={dashboard.rollCall.title}
        testID="scanner-overlay"
      />
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
        <Text style={styles.headerLabel}>
          {phase === "resolving" ? "VERIFYING TICKET" : "SCAN TICKETS"}
        </Text>
      </View>

      <MemberVerificationSheet
        attendanceStatus={existingAttendance?.status ?? "unmarked"}
        confirmLoading={phase === "marking"}
        groupName={verification?.groupName ?? group.name}
        memberName={verification?.displayName ?? "Member"}
        onCancel={resumeScanner}
        onConfirm={() => void confirmPresent()}
        phone={verification?.phone}
        previousMarkingTime={
          existingAttendance?.markedAt ? formatTime(existingAttendance.markedAt) : undefined
        }
        role={
          verification?.role === "super_organiser"
            ? "super organiser"
            : verification?.role === "co_organiser"
              ? "co-organiser"
              : (verification?.role ?? "member")
        }
        testID="member-verification-sheet"
        visible={verification !== null}
      />
      <ScanResultOverlay
        memberName={result?.memberName}
        message={result?.message ?? ""}
        onDismiss={result ? resumeScanner : undefined}
        testID="scan-result-overlay"
        title={result?.title ?? ""}
        tone={result?.tone ?? "success"}
        visible={result !== null}
      />
    </SafeAreaView>
  );
}

function ScannerState({ children }: { children: JSX.Element | JSX.Element[] }): JSX.Element {
  return <SafeAreaView style={styles.state}>{children}</SafeAreaView>;
}

function attendanceOutcomeCopy(outcome: string): ResultState {
  const copy: Record<string, ResultState> = {
    wrong_group: getResolutionResultCopy("wrong_group"),
    invalid_qr: getResolutionResultCopy("invalid"),
    revoked: getResolutionResultCopy("revoked"),
    inactive_membership: getResolutionResultCopy("inactive_membership"),
    archived: getResolutionResultCopy("archived"),
    unauthorised: getResolutionResultCopy("unauthorised"),
    closed_roll_call: {
      tone: "warning",
      title: "Roll call closed",
      message: "Attendance marking has stopped for this roll call.",
    },
  };
  return (
    copy[outcome] ?? {
      tone: "error",
      title: "Attendance not marked",
      message: "The update could not be completed safely.",
    }
  );
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceElevated },
  state: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  header: {
    position: "absolute",
    top: spacing.md,
    right: spacing.lg,
    left: spacing.lg,
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
