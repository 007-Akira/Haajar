import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

import { createClientOperationId } from "@/features/attendance/config/client-operation-id";
import { getSupabaseClient } from "@/lib/supabase";
import { colors } from "@/theme";
import {
  classifyTokenFailure,
  resolveEasProjectId,
  safePushRegistrationMessage,
  toPushPermissionState,
  type PushPermissionState,
  type PushRegistrationStage,
} from "../config/push-registration-contract";

export {
  resolveEasProjectId,
  safePushRegistrationMessage,
  toPushPermissionState,
  type PushPermissionState,
  type PushRegistrationStage,
} from "../config/push-registration-contract";

const appInstanceKey = "haajar.push.app-instance-id";

export class PushRegistrationError extends Error {
  constructor(
    readonly stage: PushRegistrationStage,
    readonly permissionState: PushPermissionState,
    options?: { cause?: unknown }
  ) {
    super(safePushRegistrationMessage(stage), options);
    this.name = "PushRegistrationError";
  }
}

function diagnose(stage: string): void {
  if (__DEV__) console.info("[Haajar push registration]", { stage });
}

export function getEasProjectId(): string | null {
  return resolveEasProjectId(
    Constants.easConfig?.projectId,
    Constants.expoConfig?.extra?.eas?.projectId
  );
}

export async function configureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("attendance", {
    name: "Attendance",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: colors.accent,
  });
}

export async function getPushPermissionState(): Promise<PushPermissionState> {
  if (!Device.isDevice) return "unavailable";
  const permission = await Notifications.getPermissionsAsync();
  return toPushPermissionState(permission);
}

export async function requestAndRegisterPushDevice(): Promise<PushPermissionState> {
  diagnose("device_capability");
  if (!Device.isDevice) {
    diagnose("unsupported_device");
    throw new PushRegistrationError("unsupported_device", "unavailable");
  }
  try {
    await configureAndroidNotificationChannel();
  } catch (cause) {
    diagnose("configuration_error");
    throw new PushRegistrationError("configuration_error", "not_requested", { cause });
  }
  diagnose("existing_permission");
  const current = await Notifications.getPermissionsAsync();
  diagnose(current.granted ? "permission_granted" : "request_permission");
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    diagnose("permission_denied");
    throw new PushRegistrationError("permission_denied", "denied");
  }
  await registerCurrentExpoPushToken();
  diagnose("registered");
  return "enabled";
}

export async function registerCurrentExpoPushToken(): Promise<void> {
  if (!Device.isDevice) throw new PushRegistrationError("unsupported_device", "unavailable");
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) throw new PushRegistrationError("permission_denied", "denied");
  diagnose("project_id_resolution");
  const projectId = getEasProjectId();
  if (!projectId) {
    diagnose("missing_project_id");
    throw new PushRegistrationError("missing_project_id", "enabled");
  }
  diagnose("expo_token_generation");
  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (cause) {
    const stage = classifyTokenFailure(cause);
    diagnose(stage);
    throw new PushRegistrationError(stage, "enabled", { cause });
  }
  diagnose("backend_registration");
  const appInstanceId = await getOrCreateAppInstanceId();
  let error: unknown;
  try {
    ({ error } = await getSupabaseClient().rpc("register_push_device", {
      push_token: token,
      device_platform: Platform.OS === "ios" ? "ios" : "android",
      target_app_instance_id: appInstanceId,
    }));
  } catch (cause) {
    diagnose("network_failure");
    throw new PushRegistrationError("network_failure", "enabled", { cause });
  }
  if (error) {
    const message =
      typeof error === "object" && error && "message" in error ? String(error.message) : "";
    const stage = /network|fetch|timeout/i.test(message)
      ? "network_failure"
      : "backend_registration_failure";
    diagnose(stage);
    throw new PushRegistrationError(stage, "enabled", { cause: error });
  }
}

export async function revokeCurrentPushDevice(): Promise<void> {
  const appInstanceId = await SecureStore.getItemAsync(appInstanceKey);
  if (!appInstanceId) return;
  const { error } = await getSupabaseClient().rpc("revoke_push_device", {
    target_app_instance_id: appInstanceId,
  });
  if (error)
    throw new PushRegistrationError("backend_registration_failure", "enabled", { cause: error });
  await SecureStore.deleteItemAsync(appInstanceKey);
}

async function getOrCreateAppInstanceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(appInstanceKey);
  if (existing) return existing;
  const created = createClientOperationId();
  await SecureStore.setItemAsync(appInstanceKey, created);
  return created;
}
