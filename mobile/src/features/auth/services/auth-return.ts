export const DEFAULT_POST_AUTH_ROUTE = "/(tabs)";

const maximumReturnRouteLength = 2048;
const unsafeCharacters = /[\\\u0000-\u001f\u007f]/;
const authTransitRoutes = new Set(["/auth/callback", "/profile-setup", "/sign-in"]);

function hasUnsafePath(value: string): boolean {
  const pathname = value.split(/[?#]/, 1)[0];
  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.includes("//") ||
    pathname.includes(":") ||
    authTransitRoutes.has(pathname) ||
    unsafeCharacters.test(value) ||
    /\s/.test(value)
  ) {
    return true;
  }

  return pathname.split("/").some((segment) => segment === "." || segment === "..");
}

export function sanitizeInternalReturnTo(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumReturnRouteLength ||
    value.trim() !== value ||
    hasUnsafePath(value)
  ) {
    return null;
  }

  let decoded = value;
  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (hasUnsafePath(next)) return null;
      if (next === decoded) break;
      decoded = next;
    } catch {
      return null;
    }
  }

  return value;
}

export function safeAuthReturnTo(value: unknown): string {
  return sanitizeInternalReturnTo(value) ?? DEFAULT_POST_AUTH_ROUTE;
}

export type PostAuthRoute =
  { kind: "destination"; href: string } | { kind: "profile-setup"; returnTo: string };

export function resolvePostAuthRoute(profileCompleted: boolean, returnTo: unknown): PostAuthRoute {
  const safeReturnTo = safeAuthReturnTo(returnTo);
  return profileCompleted
    ? { kind: "destination", href: safeReturnTo }
    : { kind: "profile-setup", returnTo: safeReturnTo };
}

export function safeOAuthCallbackError(): string {
  return "Google sign-in could not be completed. Please try again.";
}

export function createSingleUseAction<T>(action: (value: T) => void): (value: T) => boolean {
  let used = false;
  return (value: T): boolean => {
    if (used) return false;
    used = true;
    action(value);
    return true;
  };
}
