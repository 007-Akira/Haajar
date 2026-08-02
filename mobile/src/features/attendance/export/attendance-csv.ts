import type { AttendanceMarkingMethod, RollCallDashboard } from "../types/attendance-contracts";

export const attendanceCsvHeaders = [
  "Trip Name",
  "Group Name",
  "Source Subgroup",
  "Roll Call Date",
  "Member Name",
  "Phone",
  "Group Role",
  "Attendance Status",
  "Marked Time",
  "Marking Method",
] as const;

export type ExportRole = "member" | "co_organiser" | "organiser" | "super_organiser";

export function canExportAttendance(input: {
  rollCallStatus: string;
  membershipStatus: string | null;
  role: ExportRole | null;
  canViewFullHistory: boolean;
}): boolean {
  return (
    input.rollCallStatus === "closed" &&
    input.membershipStatus === "active" &&
    (input.role === "organiser" || input.role === "super_organiser") &&
    input.canViewFullHistory
  );
}

export function buildAttendanceCsv(input: {
  dashboard: RollCallDashboard;
  tripName: string;
  groupName: string;
}): string {
  if (input.dashboard.rollCall.status !== "closed") {
    throw new Error("Only closed roll calls can be exported.");
  }
  const rows = [...input.dashboard.presentMembers, ...input.dashboard.remainingMembers].map(
    (member) => [
      input.tripName,
      input.groupName,
      member.sourceGroupName ?? input.groupName,
      input.dashboard.rollCall.startedAt,
      member.displayName,
      member.phone ?? "",
      displayRole(member.role),
      member.status === "present" ? "Present" : "Absent",
      member.markedAt ?? "",
      displayMarkingMethod(member.markingMethod),
    ]
  );
  return `\uFEFF${[attendanceCsvHeaders, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}\r\n`;
}

export function createAttendanceExportFilename(groupName: string, startedAt: string): string {
  const slug = groupName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48);
  const date = /^\d{4}-\d{2}-\d{2}/.exec(startedAt)?.[0] ?? "roll-call";
  return `haajar-${slug || "attendance"}-${date}.csv`;
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function displayRole(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayMarkingMethod(value: AttendanceMarkingMethod | null): string {
  if (value === "qr") return "QR ticket";
  if (value === "manual") return "Manual";
  if (value === "offline_sync") return "Offline scan";
  return "";
}
