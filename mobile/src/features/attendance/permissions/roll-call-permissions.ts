import type { UserRole } from "@/components";

export interface RollCallPermissions {
  canCreate: boolean;
  canScan: boolean;
  canMarkManually: boolean;
  canClose: boolean;
  canViewAllStatuses: boolean;
  canOpenEventControls: boolean;
}

const permissionsByRole: Record<UserRole, RollCallPermissions> = {
  member: {
    canCreate: false,
    canScan: false,
    canMarkManually: false,
    canClose: false,
    canViewAllStatuses: false,
    canOpenEventControls: false,
  },
  "co-organiser": {
    canCreate: false,
    canScan: true,
    canMarkManually: false,
    canClose: false,
    canViewAllStatuses: true,
    canOpenEventControls: false,
  },
  organiser: {
    canCreate: true,
    canScan: true,
    canMarkManually: true,
    canClose: true,
    canViewAllStatuses: true,
    canOpenEventControls: false,
  },
  "super organiser": {
    canCreate: true,
    canScan: true,
    canMarkManually: true,
    canClose: true,
    canViewAllStatuses: true,
    canOpenEventControls: true,
  },
};

export function getRollCallPermissions(role: UserRole): RollCallPermissions {
  return permissionsByRole[role];
}
