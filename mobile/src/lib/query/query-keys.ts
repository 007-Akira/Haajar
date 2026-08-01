export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    session: () => ["auth", "session"] as const,
  },
  profile: {
    all: ["profile"] as const,
    detail: (userId: string) => ["profile", userId] as const,
  },
  events: {
    all: ["events"] as const,
    list: (userId: string) => ["events", "list", userId] as const,
    detail: (eventId: string, userId?: string) =>
      ["events", "detail", eventId, userId ?? "anonymous"] as const,
    members: (eventId: string) => ["events", eventId, "members"] as const,
    groups: (eventId: string, userId?: string) =>
      ["events", eventId, "groups", userId ?? "anonymous"] as const,
  },
  groups: {
    all: ["groups"] as const,
    list: (userId: string) => ["groups", "list", userId] as const,
    detail: (groupId: string) => ["groups", "detail", groupId] as const,
    members: (groupId: string) => ["groups", groupId, "members"] as const,
  },
  memberships: {
    all: ["memberships"] as const,
    currentEvent: (eventId: string, userId: string) =>
      ["memberships", "current", "event", eventId, userId] as const,
    currentGroup: (groupId: string, userId: string) =>
      ["memberships", "current", "group", groupId, userId] as const,
  },
} as const;
