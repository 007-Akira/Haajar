import { AppError, appErrorCodes, isAppError, type AppErrorCode } from "./app-error";
import { logTechnicalError } from "./development-logger";
import { userSafeErrorMessages } from "./error-messages";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
  status?: number;
}

const permissionCodes = new Set(["42501", "PGRST301"]);
const notFoundCodes = new Set(["PGRST116"]);
const conflictCodes = new Set(["23505"]);
const validationCodes = new Set(["22023", "23502", "23503", "23514", "22P02"]);

function asSupabaseError(error: unknown): SupabaseErrorLike {
  return typeof error === "object" && error !== null ? (error as SupabaseErrorLike) : {};
}

function resolveCode(error: SupabaseErrorLike): AppErrorCode {
  if (error.status === 401) return appErrorCodes.authenticationRequired;
  if (error.status === 403 || (error.code && permissionCodes.has(error.code))) {
    return appErrorCodes.permissionDenied;
  }
  if (error.status === 404 || (error.code && notFoundCodes.has(error.code))) {
    return appErrorCodes.notFound;
  }
  if (error.status === 409 || (error.code && conflictCodes.has(error.code))) {
    return appErrorCodes.conflict;
  }
  if (error.code && validationCodes.has(error.code)) return appErrorCodes.validation;

  const message = error.message?.toLowerCase() ?? "";
  if (message.includes("network") || message.includes("fetch")) return appErrorCodes.network;
  if (error.code?.startsWith("PGRST") || error.code) return appErrorCodes.database;
  return appErrorCodes.unknown;
}

export function mapSupabaseError(error: unknown, operation: string): AppError {
  if (isAppError(error)) return error;

  const technicalError = asSupabaseError(error);
  const code = resolveCode(technicalError);

  logTechnicalError({
    operation,
    code: technicalError.code,
    message: technicalError.message,
    details: technicalError.details,
    hint: technicalError.hint,
  });

  return new AppError({
    code,
    message: userSafeErrorMessages[code],
    retryable: code === appErrorCodes.network || code === appErrorCodes.database,
    cause: error,
  });
}

export function throwSupabaseError(error: unknown, operation: string): never {
  throw mapSupabaseError(error, operation);
}
