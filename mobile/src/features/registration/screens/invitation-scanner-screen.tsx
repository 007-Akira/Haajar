import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type CameraMountError,
} from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { AppState, Linking, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState, PrimaryButton, ScannerOverlay, SecondaryButton } from "@/components";
import { createEphemeralSecretStore } from "@/features/attendance/config/ephemeral-secret";
import { createScannerGate } from "@/features/attendance/config/scanner-state";
import { classifyHaajarQrPayload } from "@/features/qr/types/haajar-qr-payload";
import { isAppError, appErrorCodes } from "@/lib/errors";
import { colors, spacing } from "@/theme";

import { resolveGroupInvitation } from "../api/registration-queries";

type ScannerError = "invalid" | "membership" | "inactive" | "network" | null;

export function InvitationScannerScreen(): JSX.Element {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scannerError, setScannerError] = useState<ScannerError>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [gate] = useState(createScannerGate);
  const [tokenStore] = useState(createEphemeralSecretStore);
  const mountedRef = useRef(true);
  const operationRef = useRef(0);

  const clearSensitiveState = useCallback(() => {
    operationRef.current += 1;
    tokenStore.clear();
    gate.pause();
    setProcessing(false);
  }, [gate, tokenStore]);

  const closeScanner = useCallback(() => {
    clearSensitiveState();
    if (router.canGoBack()) router.back();
    else router.replace("/join" as never);
  }, [clearSensitiveState, router]);

  function resumeScanner(): void {
    tokenStore.clear();
    setScannerError(null);
    setProcessing(false);
    if (AppState.currentState === "active") gate.resume();
  }

  useFocusEffect(
    useCallback(() => {
      gate.resume();
      return clearSensitiveState;
    }, [clearSensitiveState, gate])
  );

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      setAppActive(active);
      if (active) gate.resume();
      else clearSensitiveState();
    });
    return () => {
      mountedRef.current = false;
      subscription.remove();
      clearSensitiveState();
      gate.clear();
    };
  }, [clearSensitiveState, gate]);

  async function handleBarcodeScanned(scan: BarcodeScanningResult): Promise<void> {
    if (processing || !appActive || !gate.tryAcquire()) return;
    setProcessing(true);
    setScannerError(null);
    const payload = classifyHaajarQrPayload(scan.data);
    if (payload.type !== "invitation") {
      setScannerError(payload.type === "membership" ? "membership" : "invalid");
      setProcessing(false);
      return;
    }
    const operation = ++operationRef.current;
    tokenStore.set(payload.token);
    try {
      const invitation = await resolveGroupInvitation(payload.token);
      if (!mountedRef.current || operation !== operationRef.current) return;
      if (invitation.groupStatus !== "active") {
        tokenStore.clear();
        setScannerError("inactive");
        setProcessing(false);
        return;
      }
      const token = tokenStore.take();
      if (!token) return;
      router.replace(`/join/${token}` as never);
    } catch (error) {
      tokenStore.clear();
      if (!mountedRef.current || operation !== operationRef.current) return;
      setScannerError(
        isAppError(error) && error.code === appErrorCodes.network ? "network" : "inactive"
      );
      setProcessing(false);
    }
  }

  if (permission === null)
    return <SafeAreaView style={styles.state} testID="invitation-scanner-loading" />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.state} testID="invitation-camera-permission-denied">
        <EmptyState
          description="Camera access is required to scan a Haajar group invitation."
          title="Allow camera access"
        />
        {permission.canAskAgain ? (
          <PrimaryButton
            fullWidth
            label="Allow Camera"
            onPress={() => void requestPermission()}
            testID="request-invitation-camera-permission"
          />
        ) : (
          <PrimaryButton
            fullWidth
            label="Open Android Settings"
            onPress={() => void Linking.openSettings()}
            testID="open-invitation-camera-settings"
          />
        )}
        <SecondaryButton fullWidth label="Close Scanner" onPress={closeScanner} />
      </SafeAreaView>
    );
  }

  if (cameraUnavailable) {
    return (
      <SafeAreaView style={styles.state} testID="invitation-camera-unavailable">
        <EmptyState
          actionLabel="Try Again"
          description="Android could not start the camera. Close other camera apps and retry."
          onActionPress={() => setCameraUnavailable(false)}
          title="Camera unavailable"
        />
        <SecondaryButton fullWidth label="Close Scanner" onPress={closeScanner} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} testID="invitation-qr-scanner">
      <CameraView
        active={appActive}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        enableTorch={flashEnabled}
        facing="back"
        onBarcodeScanned={
          !processing && appActive ? (scan) => void handleBarcodeScanned(scan) : undefined
        }
        onMountError={(_error: CameraMountError) => setCameraUnavailable(true)}
        style={StyleSheet.absoluteFill}
        testID="invitation-camera-preview"
      />
      <ScannerOverlay
        flashEnabled={flashEnabled}
        groupName="JOIN GROUP"
        instruction="Align the organiser’s invitation QR inside the frame."
        onClose={closeScanner}
        onToggleFlash={() => setFlashEnabled((value) => !value)}
        paused={processing}
        readyLabel="READY FOR INVITATION"
        rollCallName="Invitation scanner"
        testID="invitation-scanner-overlay"
      />
      {scannerError ? (
        <SafeAreaView style={styles.error} testID={`invitation-scan-${scannerError}`}>
          <EmptyState
            actionLabel="Scan Again"
            description={scannerErrorMessage(scannerError)}
            onActionPress={resumeScanner}
            title={scannerError === "network" ? "Connection problem" : "Invitation not recognised"}
          />
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}

function scannerErrorMessage(error: Exclude<ScannerError, null>): string {
  if (error === "membership") return "This is a membership QR, not a group invitation.";
  if (error === "network")
    return "Couldn’t verify this invitation. Check your connection and try again.";
  if (error === "inactive") return "This invitation is no longer active.";
  return "This QR is not a Haajar invitation.";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.textPrimary },
  state: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  error: {
    position: "absolute",
    inset: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
});
