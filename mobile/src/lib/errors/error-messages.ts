import { appErrorCodes, type AppErrorCode } from "./app-error";

export const userSafeErrorMessages: Record<AppErrorCode, string> = {
  [appErrorCodes.authenticationRequired]: "Sign in to continue.",
  [appErrorCodes.permissionDenied]: "You do not have permission to do that.",
  [appErrorCodes.notFound]: "The requested information could not be found.",
  [appErrorCodes.conflict]: "That information already exists or has changed.",
  [appErrorCodes.validation]: "Check the information you entered and try again.",
  [appErrorCodes.network]: "Check your connection and try again.",
  [appErrorCodes.database]: "Haajar could not load that information right now.",
  [appErrorCodes.unknown]: "Something went wrong. Please try again.",
};
