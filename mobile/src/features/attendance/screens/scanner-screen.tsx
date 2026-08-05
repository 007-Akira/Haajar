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
import { useNetInfo } from "@react-native-community/netinfo";
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
import { useEvent } from "@/features/events/hooks/use-event";
import { useSession } from "@/features/auth";
import { appErrorCodes, isAppError } from "@/lib/errors";
import { colors, layout, spacing, typography } from "@/theme";

import { createEphemeralSecretStore } from "../config/ephemeral-secret";
import {
  createScannerGate,
  getResolutionResultCopy,
  type ScannerPhase,
} from "../config/scanner-state";
import { useMarkAttendanceRosterPresent, useResolveAttendanceQr } from "../hooks/use-attendance-qr";
import type { AttendanceQrResolution } from "../types/attendance-contracts";
import { useRollCallDashboard } from "../hooks/use-roll-call-dashboard";
import {
  getCachedOfflineRoster,
  getOfflineRosterStatus,
} from "../offline/services/offline-roster-cache";
import {
  enqueueOfflineAttendance,
  getPendingSyncCount,
  resolveOfflineQr,
  syncPendingAttendance,
} from "../offline/services/offline-attendance-queue";

type ValidResolution = Extract<AttendanceQrResolution, { status: "valid" }>;
type ScannerVerification = ValidResolution & { membershipId?: string };

interface ResultState {
  tone: ScanResultTone;
  title: string;
  message: string;
  memberName?: string;
}

export function ScannerScreen(): JSX.Element {
  const router = useRouter();
  const { user } = useSession();
  const netInfo = useNetInfo();
  const params = useLocalSearchParams<{
    eventId: string;
    groupId?: string;
    rollCallId?: string;
    sessionId?: string;
  }>();
  const { eventId, groupId } = params;
  const rollCallId = params.rollCallId ?? params.sessionId ?? "";
  const groupQuery = useGroup(groupId);
  const eventQuery = useEvent(eventId);
  const dashboardQuery = useRollCallDashboard(rollCallId);
  const resolver = useResolveAttendanceQr();
  const rosterAttendanceMutation = useMarkAttendanceRosterPresent(rollCallId);
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<ScannerPhase>("ready");
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [verification, setVerification] = useState<ScannerVerification | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [verifiedOffline, setVerifiedOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [offlineReady, setOfflineReady] = useState(false);
  const [gate] = useState(createScannerGate);
  const [tokenStore] = useState(createEphemeralSecretStore);
  const mountedRef = useRef(true);
  const appActiveRef = useRef(AppState.currentState === "active");
  const operationRef = useRef(0);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function closeScanner(): void {
    operationRef.current += 1;
    clearResultTimer();
    tokenStore.clear();
    gate.pause();

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(
      (groupId
        ? `/events/${eventId}/groups/${groupId}/roll-calls/${rollCallId}`
        : `/events/${eventId}/attendance/general/${rollCallId}`) as never
    );
  }

  function clearResultTimer(): void {
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = null;
  }

  function resumeScanner(): void {
    clearResultTimer();
    tokenStore.clear();
    setVerification(null);
    setResult(null);
    setVerifiedOffline(false);
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
  const event = eventQuery.data;
  const general = dashboard?.rollCall.scopeType === "general";
  const attendanceUnitId = dashboard?.rollCall.attendanceUnitId;
  const canScan =
    dashboard?.permissions.canScan === true &&
    dashboard.rollCall.status === "active" &&
    dashboard.rollCall.eventId === eventId;
  const scanningEnabled =
    permission?.granted === true && !cameraUnavailable && appActive && phase === "ready" && canScan;

  useEffect(() => {
    if (!user || !rollCallId || general) return;
    void getPendingSyncCount(user.id, rollCallId).then(setPendingSyncCount);
    void getOfflineRosterStatus(user.id, rollCallId).then((value) =>
      setOfflineReady(value.state === "ready")
    );
    if (netInfo.isConnected) {
      void syncPendingAttendance(user.id, rollCallId).then(() =>
        getPendingSyncCount(user.id, rollCallId).then(setPendingSyncCount)
      );
    }
  }, [general, netInfo.isConnected, rollCallId, user]);

  async function resolveLocally(payload: string): Promise<boolean> {
    if (!user || !group || !groupId || general) return false;
    const local = await resolveOfflineQr({ userId: user.id, rollCallId, groupId, payload });
    tokenStore.clear();
    if (local.status !== "valid") {
      if (local.status === "stale_roster") setOfflineReady(false);
      showResult(
        local.status === "stale_roster"
          ? {
              tone: "warning",
              title: "Roster outdated",
              message: "Reconnect and download the current roster before scanning.",
            }
          : getResolutionResultCopy(local.status === "invalid" ? "invalid" : local.status)
      );
      return false;
    }
    const member = (await getCachedOfflineRoster(user.id, rollCallId)).find(
      (item) => item.membershipId === local.membershipId
    );
    if (!member) {
      showResult({
        tone: "error",
        title: "Roster unavailable",
        message: "This member is not available in the cached roster.",
      });
      return false;
    }
    setVerification({
      status: "valid",
      membershipId: member.membershipId,
      attendanceUnitId: dashboard?.rollCall.attendanceUnitId ?? rollCallId,
      rosterEntryId: member.membershipId,
      memberUserId: member.userId,
      displayName: member.displayName,
      phone: member.phone,
      role: member.role,
      sourceGroupId: groupId,
      sourceGroupName: group.name,
      alreadyMarked: false,
      markedAt: null,
    });
    setVerifiedOffline(true);
    setPhase("verifying");
    return true;
  }

  async function handleBarcodeScanned(scan: BarcodeScanningResult): Promise<void> {
    if (!scanningEnabled || !gate.tryAcquire()) return;
    const operation = ++operationRef.current;
    setPhase("resolving");
    tokenStore.set(scan.data);
    try {
      if (netInfo.isConnected === false) {
        if (general) {
          tokenStore.clear();
          showResult({
            tone: "error",
            title: "General scanning is online only",
            message: "Reconnect before scanning General attendance tickets.",
          });
          return;
        }
        await resolveLocally(scan.data);
        return;
      }
      if (!attendanceUnitId) throw new Error("Attendance unit unavailable");
      const resolution = await resolver.resolve({
        attendanceUnitId,
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
      if (!mountedRef.current || !appActiveRef.current || operation !== operationRef.current)
        return;
      if (!general && isAppError(error) && error.code === appErrorCodes.network) {
        await resolveLocally(scan.data);
        return;
      }
      tokenStore.clear();
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
    if (verifiedOffline) {
      if (!user) return;
      setPhase("marking");
      const queued = await enqueueOfflineAttendance({
        userId: user.id,
        rollCallId,
        groupId: groupId!,
        membershipId: verification.membershipId!,
      });
      setPendingSyncCount(await getPendingSyncCount(user.id, rollCallId));
      showResult(
        {
          tone: "warning",
          title: queued.inserted ? "Saved — Pending Sync" : "Already saved offline",
          memberName: verification.displayName,
          message: "Verified offline. Attendance will sync when the network returns.",
        },
        true
      );
      return;
    }
    setPhase("marking");
    const operation = ++operationRef.current;
    try {
      const presentedToken = tokenStore.take();
      if (!presentedToken) throw new Error("QR scan expired.");
      const marked = await rosterAttendanceMutation.mark({
        attendanceUnitId: verification.attendanceUnitId,
        rosterEntryId: verification.rosterEntryId,
        presentedToken,
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

  if (
    (!groupId ? eventQuery.isPending : groupQuery.isPending) ||
    dashboardQuery.isPending ||
    permission === null
  ) {
    return (
      <ScannerState>
        <LoadingSkeleton lines={5} testID="scanner-loading" />
      </ScannerState>
    );
  }
  if (
    (groupId ? groupQuery.isError || !group : eventQuery.isError || !event) ||
    dashboardQuery.isError ||
    !dashboard
  ) {
    return (
      <ScannerState>
        <EmptyState
          actionLabel="Retry"
          description="The active roll call could not be loaded."
          onActionPress={() =>
            void Promise.all([
              groupId ? groupQuery.refetch() : eventQuery.refetch(),
              dashboardQuery.refetch(),
            ])
          }
          testID="scanner-load-error"
          title="Scanner unavailable"
        />
      </ScannerState>
    );
  }
  if (
    !canScan ||
    (groupId
      ? group?.status === "archived" || group?.eventStatus === "archived"
      : event?.status === "archived")
  ) {
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
        <SecondaryButton fullWidth label="Cancel" onPress={closeScanner} />
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
    (member) =>
      member.rosterEntryId === verification?.rosterEntryId ||
      member.userId === verification?.memberUserId
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
        groupName={group?.name ?? event?.name ?? "General attendance"}
        onToggleFlash={() => setFlashEnabled((value) => !value)}
        paused={!scanningEnabled}
        rollCallName={dashboard.rollCall.title}
        testID="scanner-overlay"
      />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Close scanner"
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={closeScanner}
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          testID="close-scanner-button"
        >
          <Ionicons color={colors.textInverse} name="close" size={layout.iconSize} />
        </Pressable>
        <Text style={styles.headerLabel}>
          {phase === "resolving" ? "VERIFYING TICKET" : "SCAN TICKETS"}
        </Text>
      </View>
      <View style={styles.connectivity} testID="scanner-connectivity">
        <Text style={styles.connectivityText}>
          {general
            ? netInfo.isConnected === false
              ? "[ GENERAL REQUIRES ONLINE ]"
              : "[ GENERAL · ONLINE ]"
            : netInfo.isConnected === false
              ? offlineReady
                ? "[ OFFLINE READY ]"
                : "[ ROSTER OUTDATED ]"
              : "[ ONLINE ]"}
          {!general ? ` · ${pendingSyncCount} PENDING SYNC` : ""}
        </Text>
        {!general && pendingSyncCount > 0 && netInfo.isConnected ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry pending attendance synchronization"
            onPress={() =>
              user &&
              void syncPendingAttendance(user.id, rollCallId).then(() =>
                getPendingSyncCount(user.id, rollCallId).then(setPendingSyncCount)
              )
            }
            style={styles.retrySyncButton}
            testID="retry-offline-attendance-sync"
          >
            <Text style={styles.retrySync}>RETRY SYNC</Text>
          </Pressable>
        ) : null}
      </View>

      <MemberVerificationSheet
        attendanceStatus={existingAttendance?.status ?? "unmarked"}
        confirmLoading={phase === "marking"}
        groupName={
          verification?.sourceGroupName ??
          (general ? "General attendance" : (group?.name ?? "Group"))
        }
        memberName={verification?.displayName ?? "Member"}
        onCancel={resumeScanner}
        onConfirm={() => void confirmPresent()}
        phone={verification?.phone}
        previousMarkingTime={
          existingAttendance?.markedAt ? formatTime(existingAttendance.markedAt) : undefined
        }
        role={
          verification?.role === "super_organiser" || verification?.role === "super organiser"
            ? "super organiser"
            : verification?.role === "co_organiser" || verification?.role === "co-organiser"
              ? "co-organiser"
              : verification?.role === "organiser"
                ? "organiser"
                : "member"
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
  connectivity: {
    position: "absolute",
    top: spacing["3xl"],
    left: spacing.md,
    right: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  connectivityText: { ...typography.technicalLabel, color: colors.textInverse },
  retrySync: { ...typography.technicalLabel, color: colors.accent },
  retrySyncButton: {
    minHeight: layout.minimumTouchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
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
    zIndex: 10,
    elevation: 10,
  },
  close: {
    width: layout.minimumTouchTarget,
    height: layout.minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.textInverse,
    borderWidth: layout.borderWidth,
    borderRadius: layout.minimumTouchTarget / 2,
  },
  closePressed: { opacity: 0.7 },
  headerLabel: { ...typography.technicalLabel, color: colors.textInverse },
});
