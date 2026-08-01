export const appErrorCodes = {
  authenticationRequired: "AUTHENTICATION_REQUIRED",
  permissionDenied: "PERMISSION_DENIED",
  notFound: "NOT_FOUND",
  conflict: "CONFLICT",
  validation: "VALIDATION_ERROR",
  network: "NETWORK_ERROR",
  database: "DATABASE_ERROR",
  unknown: "UNKNOWN_ERROR",
} as const;

export type AppErrorCode = (typeof appErrorCodes)[keyof typeof appErrorCodes];

export interface AppErrorOptions {
  code: AppErrorCode;
  message: string;
  retryable?: boolean;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly retryable: boolean;

  constructor({ code, message, retryable = false, cause }: AppErrorOptions) {
    super(message, { cause });
    this.name = "AppError";
    this.code = code;
    this.retryable = retryable;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
