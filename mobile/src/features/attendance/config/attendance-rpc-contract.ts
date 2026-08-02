import type {
  CreateRollCallParameters,
  MarkManualAttendanceParameters,
  MarkQrAttendanceParameters,
} from "../types/attendance-contracts";

export function toCreateRollCallRpcArgs(parameters: CreateRollCallParameters) {
  const note = parameters.note?.trim();
  return note
    ? {
        target_group_id: parameters.groupId,
        roll_call_title: parameters.title.trim(),
        roll_call_note: note,
      }
    : {
        target_group_id: parameters.groupId,
        roll_call_title: parameters.title.trim(),
      };
}

export function toQrAttendanceRpcArgs(parameters: MarkQrAttendanceParameters) {
  return {
    target_roll_call_id: parameters.rollCallId,
    presented_token: parameters.presentedToken,
    marking_method: "qr" as const,
    client_operation_id: parameters.clientOperationId,
  };
}

export function toManualAttendanceRpcArgs(parameters: MarkManualAttendanceParameters) {
  return {
    target_roll_call_id: parameters.rollCallId,
    target_membership_id: parameters.membershipId,
    client_operation_id: parameters.clientOperationId,
  };
}
