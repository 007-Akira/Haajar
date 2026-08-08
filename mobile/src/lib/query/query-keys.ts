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
    members: (eventId: string, userId?: string) =>
      ["events", eventId, "members", userId ?? "anonymous"] as const,
    memberDetail: (eventId: string, memberId: string, userId: string) =>
      ["events", eventId, "members", memberId, userId] as const,
    groups: (eventId: string, userId?: string) =>
      ["events", eventId, "groups", userId ?? "anonymous"] as const,
  },
  groups: {
    all: ["groups"] as const,
    list: (userId: string) => ["groups", "list", userId] as const,
    detail: (groupId: string, userId?: string) =>
      ["groups", "detail", groupId, userId ?? "anonymous"] as const,
    members: (groupId: string, userId?: string) =>
      ["groups", groupId, "members", userId ?? "anonymous"] as const,
    memberDetail: (groupId: string, membershipId: string, userId: string) =>
      ["groups", groupId, "members", membershipId, userId] as const,
  },
  memberships: {
    all: ["memberships"] as const,
    currentEvent: (eventId: string, userId: string) =>
      ["memberships", "current", "event", eventId, userId] as const,
    currentGroup: (groupId: string, userId: string) =>
      ["memberships", "current", "group", groupId, userId] as const,
    affectedByApproval: (eventId: string, groupId: string, userId: string) =>
      ["memberships", "approval", eventId, groupId, userId] as const,
  },
  registration: {
    all: ["registration"] as const,
    form: (groupId: string, userId: string) => ["registration", "form", groupId, userId] as const,
    invitation: (tokenFingerprint: string, userId: string) =>
      ["registration", "invitation", tokenFingerprint, userId] as const,
  },
  joinRequests: {
    all: ["join-requests"] as const,
    status: (groupId: string, userId: string) =>
      ["join-requests", "status", groupId, userId] as const,
    detail: (requestId: string, userId: string) =>
      ["join-requests", "detail", requestId, userId] as const,
    pending: (groupId: string, userId: string) =>
      ["join-requests", "pending", groupId, userId] as const,
    list: (groupId: string, status: string, userId: string) =>
      ["join-requests", "list", groupId, status, userId] as const,
  },
  qr: {
    all: ["membership-qr"] as const,
    membership: (membershipId: string, userId: string) =>
      ["membership-qr", membershipId, userId] as const,
  },
  attendance: {
    all: ["attendance"] as const,
    activeByGroup: (groupId: string, userId: string) =>
      ["attendance", "active", groupId, userId] as const,
    activeGeneral: (eventId: string, userId: string) =>
      ["attendance", "active", "general", eventId, userId] as const,
    generalHistory: (eventId: string, userId: string) =>
      ["attendance", "history", "general", eventId, userId] as const,
    generalOperators: (sessionId: string, userId: string) =>
      ["attendance", "general", sessionId, "operators", userId] as const,
    rollCall: (rollCallId: string, userId: string) =>
      ["attendance", "roll-call", rollCallId, userId] as const,
    dashboard: (rollCallId: string, userId: string) =>
      ["attendance", "dashboard", rollCallId, userId] as const,
    history: (groupId: string, userId: string) =>
      ["attendance", "history", groupId, userId] as const,
    memberState: (rollCallId: string, membershipId: string, userId: string) =>
      ["attendance", "member", rollCallId, membershipId, userId] as const,
  },
} as const;
