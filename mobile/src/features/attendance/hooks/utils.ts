import { AppError, appErrorCodes } from "@/lib/errors";

export function duplicateMutationError(): AppError {
  return new AppError({
    code: appErrorCodes.conflict,
    message: "That attendance action is already in progress.",
  });
}
