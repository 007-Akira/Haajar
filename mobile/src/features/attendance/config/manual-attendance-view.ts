import type { RollCallDashboard, RollCallDashboardMember } from "../types/attendance-contracts";

export type ManualAttendanceRoleFilter = "all" | "members" | "organisers";

export function getManualAttendanceMembers(
  dashboard: RollCallDashboard,
  search: string,
  roleFilter: ManualAttendanceRoleFilter
): RollCallDashboardMember[] {
  const query = search.trim().toLocaleLowerCase();
  return [...dashboard.remainingMembers, ...dashboard.presentMembers].filter((member) => {
    const roleMatches =
      roleFilter === "all" ||
      (roleFilter === "members" && member.role === "member") ||
      (roleFilter === "organisers" && member.role !== "member");
    const searchMatches =
      !query ||
      [member.displayName, member.phone ?? ""].some((value) =>
        value.toLocaleLowerCase().includes(query)
      );
    return roleMatches && searchMatches;
  });
}

export function canManageManualAttendance(dashboard: RollCallDashboard): boolean {
  return dashboard.rollCall.status === "active" && dashboard.permissions.canMarkManually;
}

export function getManualAttendanceTarget(
  dashboard: RollCallDashboard,
  member: RollCallDashboardMember
): { rollCallId: string; membershipId: string } {
  return {
    rollCallId: dashboard.rollCall.attendanceUnitId ?? dashboard.rollCall.id,
    membershipId: member.rosterEntryId ?? member.membershipId,
  };
}
