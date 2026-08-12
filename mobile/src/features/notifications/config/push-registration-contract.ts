export type PushPermissionState = "enabled" | "denied" | "not_requested" | "unavailable";
export type PushRegistrationStage =
  | "unsupported_device"
  | "permission_denied"
  | "missing_project_id"
  | "expo_token_failure"
  | "backend_registration_failure"
  | "network_failure"
  | "configuration_error"
  | "unknown";

export function resolveEasProjectId(easProjectId: unknown, extraProjectId: unknown): string | null {
  const projectId = easProjectId ?? extraProjectId;
  return typeof projectId === "string" && projectId.trim() ? projectId.trim() : null;
}

export function toPushPermissionState(permission: {
  granted: boolean;
  status: "granted" | "denied" | "undetermined";
}): PushPermissionState {
  if (permission.granted) return "enabled";
  return permission.status === "undetermined" ? "not_requested" : "denied";
}

export function classifyTokenFailure(error: unknown): PushRegistrationStage {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (/network|fetch|timeout|offline/.test(message)) return "network_failure";
  if (/firebase|fcm|google-services|default firebaseapp/.test(message))
    return "configuration_error";
  return "expo_token_failure";
}

export function safePushRegistrationMessage(stage: PushRegistrationStage): string {
  if (stage === "permission_denied") return "Notifications are disabled for Haajar.";
  if (stage === "unsupported_device") return "Push notifications require a physical device.";
  if (stage === "backend_registration_failure" || stage === "network_failure") {
    return "Notifications are allowed, but this device could not be registered. Try again.";
  }
  if (stage === "missing_project_id" || stage === "configuration_error") {
    return "Notifications are unavailable in this build. Install the latest Haajar update.";
  }
  return "Notifications are allowed, but this device could not be registered. Try again.";
}
