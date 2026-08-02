import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

import { createClientOperationId } from "@/features/attendance/config/client-operation-id";
import { AppError, appErrorCodes, throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";
import { colors } from "@/theme";

const appInstanceKey = "haajar.push.app-instance-id";

export type PushPermissionState = "enabled" | "denied" | "not_requested" | "unavailable";

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
  if (permission.granted) return "enabled";
  return permission.canAskAgain ? "not_requested" : "denied";
}

export async function requestAndRegisterPushDevice(): Promise<PushPermissionState> {
  if (!Device.isDevice) return "unavailable";
  await configureAndroidNotificationChannel();
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return permission.canAskAgain ? "not_requested" : "denied";
  await registerCurrentExpoPushToken();
  return "enabled";
}

export async function registerCurrentExpoPushToken(): Promise<void> {
  if (!Device.isDevice) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== "string" || !projectId) {
    throw new AppError({
      code: appErrorCodes.validation,
      message: "Push notifications require an EAS project ID in this build.",
    });
  }
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const appInstanceId = await getOrCreateAppInstanceId();
  const { error } = await getSupabaseClient().rpc("register_push_device", {
    push_token: token,
    device_platform: Platform.OS === "ios" ? "ios" : "android",
    target_app_instance_id: appInstanceId,
  });
  if (error) throwSupabaseError(error, "registerPushDevice");
}

export async function revokeCurrentPushDevice(): Promise<void> {
  const appInstanceId = await SecureStore.getItemAsync(appInstanceKey);
  if (!appInstanceId) return;
  const { error } = await getSupabaseClient().rpc("revoke_push_device", {
    target_app_instance_id: appInstanceId,
  });
  if (error) throwSupabaseError(error, "revokePushDevice");
  await SecureStore.deleteItemAsync(appInstanceKey);
}

async function getOrCreateAppInstanceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(appInstanceKey);
  if (existing) return existing;
  const created = createClientOperationId();
  await SecureStore.setItemAsync(appInstanceKey, created);
  return created;
}
