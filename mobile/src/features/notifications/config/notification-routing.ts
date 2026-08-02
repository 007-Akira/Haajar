import { sanitizeInternalReturnTo } from "@/features/auth/services/auth-return";

const uuid =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
const allowedNotificationRoutes = [
  new RegExp(`^/events/${uuid}/groups/${uuid}/roll-calls/${uuid}$`),
  new RegExp(`^/events/${uuid}/groups/${uuid}/join-requests$`),
];

export function sanitizeNotificationRoute(value: unknown): string | null {
  const internalRoute = sanitizeInternalReturnTo(value);
  if (!internalRoute) return null;
  return allowedNotificationRoutes.some((pattern) => pattern.test(internalRoute))
    ? internalRoute
    : null;
}
