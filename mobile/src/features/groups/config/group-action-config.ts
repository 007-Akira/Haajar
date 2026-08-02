export type GroupDisplayRole = "member" | "co-organiser" | "organiser" | "super organiser";

export type GroupActionId =
  | "show-my-qr"
  | "view-members"
  | "attendance-history"
  | "scan-qr"
  | "active-roll-call"
  | "absentees"
  | "offline-roster"
  | "start-roll-call"
  | "manual-attendance"
  | "manage-members"
  | "registration-form"
  | "join-requests"
  | "share-invitation"
  | "assign-roles"
  | "export-attendance";

export interface GroupActionDefinition {
  id: GroupActionId;
  label: string;
}

export interface GroupActionSections {
  primary: GroupActionDefinition;
  priority: GroupActionDefinition[];
  more: GroupActionDefinition[];
  showsRollCallState: boolean;
}

const actions: Record<GroupActionId, GroupActionDefinition> = {
  "show-my-qr": { id: "show-my-qr", label: "Show My QR" },
  "view-members": { id: "view-members", label: "View Members" },
  "attendance-history": { id: "attendance-history", label: "Attendance History" },
  "scan-qr": { id: "scan-qr", label: "Scan QR" },
  "active-roll-call": { id: "active-roll-call", label: "Open Roll Call" },
  absentees: { id: "absentees", label: "View Absentees" },
  "offline-roster": { id: "offline-roster", label: "Offline Roster" },
  "start-roll-call": { id: "start-roll-call", label: "Start Roll Call" },
  "manual-attendance": { id: "manual-attendance", label: "Manual Attendance" },
  "manage-members": { id: "manage-members", label: "Manage Members" },
  "registration-form": { id: "registration-form", label: "Registration Form" },
  "join-requests": { id: "join-requests", label: "Join Requests" },
  "share-invitation": { id: "share-invitation", label: "Invite Members" },
  "assign-roles": { id: "assign-roles", label: "Assign Roles" },
  "export-attendance": { id: "export-attendance", label: "Export Attendance" },
};

interface RoleActionConfiguration {
  defaultPrimary: GroupActionId;
  activePrimary?: GroupActionId;
  priority: GroupActionId[];
  more: GroupActionId[];
  showsRollCallState: boolean;
}

const roleActionConfiguration: Record<GroupDisplayRole, RoleActionConfiguration> = {
  member: {
    defaultPrimary: "show-my-qr",
    priority: [],
    more: ["view-members", "attendance-history"],
    showsRollCallState: false,
  },
  "co-organiser": {
    defaultPrimary: "scan-qr",
    priority: [],
    more: ["absentees", "view-members", "attendance-history", "offline-roster"],
    showsRollCallState: true,
  },
  organiser: {
    defaultPrimary: "start-roll-call",
    activePrimary: "active-roll-call",
    priority: ["scan-qr", "manual-attendance"],
    more: [
      "absentees",
      "manage-members",
      "registration-form",
      "join-requests",
      "share-invitation",
      "assign-roles",
      "offline-roster",
      "attendance-history",
    ],
    showsRollCallState: true,
  },
  "super organiser": {
    defaultPrimary: "start-roll-call",
    activePrimary: "active-roll-call",
    priority: ["scan-qr", "manual-attendance"],
    more: [
      "absentees",
      "manage-members",
      "registration-form",
      "join-requests",
      "share-invitation",
      "assign-roles",
      "offline-roster",
      "attendance-history",
      "export-attendance",
    ],
    showsRollCallState: true,
  },
};

export function getGroupActionSections(
  role: GroupDisplayRole,
  hasActiveRollCall: boolean
): GroupActionSections {
  const configuration = roleActionConfiguration[role];
  const primaryId =
    hasActiveRollCall && configuration.activePrimary
      ? configuration.activePrimary
      : configuration.defaultPrimary;

  const moreIds =
    role === "co-organiser" && hasActiveRollCall
      ? ["active-roll-call", ...configuration.more]
      : configuration.more;

  return {
    primary: actions[primaryId],
    priority: configuration.priority.map((id) => actions[id]),
    more: moreIds.map((id) => actions[id as GroupActionId]),
    showsRollCallState: configuration.showsRollCallState,
  };
}

export function getGroupActionLabel(actionId: string): string | undefined {
  return actions[actionId as GroupActionId]?.label;
}
