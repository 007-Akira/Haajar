import type { RollCallDashboard, RollCallDashboardMember } from "../types/attendance-contracts";

export type AttendanceDashboardFilter = "all" | "present" | "remaining";
export type AttendanceDashboardState = "active" | "archived" | "closed" | "empty" | "unauthorised";

export function getAttendanceDashboardState(
  dashboard: RollCallDashboard,
  groupStatus?: string | null,
  eventStatus?: string | null
): AttendanceDashboardState {
  if (groupStatus === "archived" || eventStatus === "archived") return "archived";
  if (
    !dashboard.permissions.canScan &&
    !dashboard.permissions.canMarkManually &&
    !dashboard.permissions.canClose
  ) {
    return "unauthorised";
  }
  if (dashboard.rollCall.status === "closed") return "closed";
  if ((dashboard.counts?.totalRoster ?? 0) === 0) return "empty";
  return "active";
}

export function getVisibleDashboardMembers(
  dashboard: RollCallDashboard,
  filter: AttendanceDashboardFilter,
  search: string
): RollCallDashboardMember[] {
  const members =
    filter === "present"
      ? dashboard.presentMembers
      : filter === "remaining"
        ? dashboard.remainingMembers
        : [...dashboard.presentMembers, ...dashboard.remainingMembers];
  const query = search.trim().toLocaleLowerCase();
  if (!query) return members;
  return members.filter((member) =>
    [member.displayName, member.phone ?? ""].some((value) =>
      value.toLocaleLowerCase().includes(query)
    )
  );
}

export function getRollCallCreatorName(dashboard: RollCallDashboard): string {
  const creator = [...dashboard.presentMembers, ...dashboard.remainingMembers].find(
    (member) => member.userId === dashboard.rollCall.createdBy
  );
  return creator?.displayName ?? "Organiser";
}

export function getDashboardActionVisibility(dashboard: RollCallDashboard) {
  const active = dashboard.rollCall.status === "active";
  return {
    canScan: active && dashboard.permissions.canScan,
    canMarkManually: active && dashboard.permissions.canMarkManually,
    canClose: active && dashboard.permissions.canClose,
  } as const;
}
