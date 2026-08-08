import { AppError, appErrorCodes, throwSupabaseError, userSafeErrorMessages } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

export interface CreateEventParameters {
  name: string;
  description?: string;
}

export async function createEvent({ name, description }: CreateEventParameters): Promise<string> {
  const normalizedName = name.trim();
  const normalizedDescription = description?.trim();

  if (!normalizedName) {
    throw new AppError({
      code: appErrorCodes.validation,
      message: userSafeErrorMessages[appErrorCodes.validation],
    });
  }

  const args = normalizedDescription
    ? { event_name: normalizedName, event_description: normalizedDescription }
    : { event_name: normalizedName };
  const { data, error } = await getSupabaseClient().rpc("create_event", args);

  if (error) throwSupabaseError(error, "createEvent");
  return data;
}

export type LifecycleResult =
  | "archived"
  | "deleted"
  | "can_delete"
  | "requires_archive"
  | "active_attendance"
  | "pending_sync"
  | "has_history"
  | "has_children"
  | "unauthorised"
  | "not_found";

export async function updateEvent(input: { eventId: string; name: string; description?: string }) {
  const name = input.name.trim();
  if (!name)
    throw new AppError({
      code: appErrorCodes.validation,
      message: userSafeErrorMessages[appErrorCodes.validation],
    });
  const { error } = await getSupabaseClient().rpc("update_event", {
    target_event_id: input.eventId,
    event_name: name,
    event_description: input.description?.trim() ?? "",
  });
  if (error) throwSupabaseError(error, "updateEvent");
}

export async function archiveEvent(eventId: string): Promise<LifecycleResult> {
  const { data, error } = await getSupabaseClient().rpc("archive_event", {
    target_event_id: eventId,
  });
  if (error) throwSupabaseError(error, "archiveEvent");
  return data as LifecycleResult;
}

export async function getEventDeleteEligibility(eventId: string): Promise<LifecycleResult> {
  const { data, error } = await getSupabaseClient().rpc("get_event_delete_eligibility", {
    target_event_id: eventId,
  });
  if (error) throwSupabaseError(error, "getEventDeleteEligibility");
  return data as LifecycleResult;
}

export async function deleteEvent(eventId: string): Promise<LifecycleResult> {
  const { data, error } = await getSupabaseClient().rpc("delete_event", {
    target_event_id: eventId,
  });
  if (error) throwSupabaseError(error, "deleteEvent");
  return data as LifecycleResult;
}
