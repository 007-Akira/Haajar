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
