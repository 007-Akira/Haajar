import type { GroupMembershipRole } from "../types/group";

export type AssignableGroupRole = "member" | "co_organiser" | "organiser";

export interface RoleManagementContext {
  actorRole: GroupMembershipRole | null;
  actorStatus: string | null;
  actorUserId: string | null;
  actorIsEventSuperOrganiser: boolean;
  groupStatus: string;
  eventStatus: string | null;
  targetRole: GroupMembershipRole;
  targetStatus: string;
  targetUserId: string;
}

export interface RoleManagementPolicy {
  visible: boolean;
  allowedRoles: AssignableGroupRole[];
  blockedReason: string | null;
}

export function canSubmitRoleChange(
  policy: RoleManagementPolicy,
  currentRole: GroupMembershipRole,
  selectedRole: AssignableGroupRole | null,
  submitting: boolean
): boolean {
  return (
    !submitting &&
    !policy.blockedReason &&
    selectedRole !== null &&
    selectedRole !== currentRole &&
    policy.allowedRoles.includes(selectedRole)
  );
}

export function getRoleManagementPolicy(context: RoleManagementContext): RoleManagementPolicy {
  const actorCanManage =
    context.actorStatus === "active" &&
    (context.actorIsEventSuperOrganiser ||
      context.actorRole === "organiser" ||
      context.actorRole === "super_organiser");

  if (!actorCanManage) return { visible: false, allowedRoles: [], blockedReason: null };
  if (context.groupStatus !== "active" || context.eventStatus === "archived") {
    return {
      visible: true,
      allowedRoles: [],
      blockedReason: "Roles cannot be changed while this group or trip is archived.",
    };
  }
  if (context.targetStatus !== "active") {
    return {
      visible: true,
      allowedRoles: [],
      blockedReason: "Only active group memberships can be changed.",
    };
  }
  if (context.actorUserId === context.targetUserId) {
    return {
      visible: true,
      allowedRoles: [],
      blockedReason: "You cannot change your own group role.",
    };
  }
  if (
    !context.actorIsEventSuperOrganiser &&
    (context.targetRole === "organiser" || context.targetRole === "super_organiser")
  ) {
    return {
      visible: true,
      allowedRoles: [],
      blockedReason: "Only a super organiser can change this member’s role.",
    };
  }

  const allowedRoles: AssignableGroupRole[] = ["member", "co_organiser"];
  if (context.actorIsEventSuperOrganiser || context.actorRole === "super_organiser") {
    allowedRoles.push("organiser");
  }
  return { visible: true, allowedRoles, blockedReason: null };
}

export function groupRoleLabel(role: AssignableGroupRole | GroupMembershipRole): string {
  if (role === "co_organiser") return "Co-organiser";
  if (role === "super_organiser") return "Super organiser";
  return role === "organiser" ? "Organiser" : "Member";
}
