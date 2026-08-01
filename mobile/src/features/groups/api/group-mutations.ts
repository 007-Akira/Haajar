import { AppError, appErrorCodes, throwSupabaseError, userSafeErrorMessages } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

export interface CreateGroupParameters {
  eventId: string;
  name: string;
  description?: string;
}

export async function createGroup({
  eventId,
  name,
  description,
}: CreateGroupParameters): Promise<string> {
  const normalizedName = name.trim();
  const normalizedDescription = description?.trim();

  if (!eventId || !normalizedName) {
    throw new AppError({
      code: appErrorCodes.validation,
      message: userSafeErrorMessages[appErrorCodes.validation],
    });
  }

  const args = normalizedDescription
    ? {
        parent_event_id: eventId,
        group_name: normalizedName,
        group_description: normalizedDescription,
      }
    : { parent_event_id: eventId, group_name: normalizedName };
  const { data, error } = await getSupabaseClient().rpc("create_group", args);

  if (error) throwSupabaseError(error, "createGroup");
  return data;
}
