import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { AppError, appErrorCodes } from "../src/lib/errors/app-error";
import {
  mapAttendanceErrorOutcome,
  redactAttendanceValue,
  redactedAttendanceToken,
} from "../src/features/attendance/api/attendance-error-mapper";
import {
  mapAttendanceMutationResult,
  mapAttendanceResultCode,
} from "../src/features/attendance/api/attendance-mappers";
import {
  getAttendanceMarkCacheTargets,
  getCloseRollCallCacheTargets,
  getCreateRollCallCacheTargets,
} from "../src/features/attendance/config/attendance-cache";
import {
  toCreateRollCallRpcArgs,
  toManualAttendanceRpcArgs,
  toQrAttendanceRpcArgs,
} from "../src/features/attendance/config/attendance-rpc-contract";
import { createEphemeralSecretStore } from "../src/features/attendance/config/ephemeral-secret";
import { createMutationGuard } from "../src/features/attendance/config/mutation-guard";

(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;

const qrToken = "a".repeat(64);

test("attendance RPC argument mapping matches secured contracts", () => {
  assert.deepEqual(
    toCreateRollCallRpcArgs({ groupId: "group-1", title: "  Boarding  ", note: "  Gate 2  " }),
    {
      target_group_id: "group-1",
      roll_call_title: "Boarding",
      roll_call_note: "Gate 2",
    }
  );
  assert.deepEqual(
    toQrAttendanceRpcArgs({
      rollCallId: "roll-call-1",
      presentedToken: qrToken,
      clientOperationId: "operation-1",
    }),
    {
      target_roll_call_id: "roll-call-1",
      presented_token: qrToken,
      marking_method: "qr",
      client_operation_id: "operation-1",
    }
  );
  assert.deepEqual(
    toManualAttendanceRpcArgs({
      rollCallId: "roll-call-1",
      membershipId: "membership-1",
      clientOperationId: "operation-2",
    }),
    {
      target_roll_call_id: "roll-call-1",
      target_membership_id: "membership-1",
      client_operation_id: "operation-2",
    }
  );
});

test("backend attendance result codes map to canonical outcomes", () => {
  assert.equal(mapAttendanceResultCode("valid"), "valid");
  assert.equal(mapAttendanceResultCode("marked_present"), "marked");
  assert.equal(mapAttendanceResultCode("already_marked"), "already_marked");
  assert.equal(mapAttendanceResultCode("wrong_group"), "wrong_group");
  assert.equal(mapAttendanceResultCode("invalid"), "invalid_qr");
  assert.equal(mapAttendanceResultCode("revoked"), "revoked");
  assert.equal(mapAttendanceResultCode("inactive_membership"), "inactive_membership");
  assert.equal(mapAttendanceResultCode("closed"), "closed_roll_call");
  assert.equal(mapAttendanceResultCode("archived"), "archived");
  assert.equal(mapAttendanceResultCode("unauthorised"), "unauthorised");
});

test("already-marked and closed results remain non-mutating outcomes", () => {
  const baseRow = {
    attendance_record_id: null as unknown as string,
    marked_at: null as unknown as string,
    marking_method: "qr",
    member_user_id: null as unknown as string,
    membership_id: null as unknown as string,
    result_status: "already_marked",
  };
  assert.deepEqual(mapAttendanceMutationResult(baseRow), {
    outcome: "already_marked",
    attendanceRecordId: null,
    membershipId: null,
    memberUserId: null,
    markedAt: null,
    markingMethod: "qr",
    changed: false,
  });
  assert.equal(
    mapAttendanceMutationResult({ ...baseRow, result_status: "closed" }).outcome,
    "closed_roll_call"
  );
});

test("attendance cache invalidation is user scoped and targeted", () => {
  assert.deepEqual(getCreateRollCallCacheTargets("group-1", "actor-1"), [
    ["attendance", "active", "group-1", "actor-1"],
    ["attendance", "history", "group-1", "actor-1"],
    ["groups", "detail", "group-1", "actor-1"],
  ]);
  assert.deepEqual(
    getAttendanceMarkCacheTargets({
      groupId: "group-1",
      rollCallId: "roll-call-1",
      membershipId: "membership-1",
      changed: true,
      userId: "actor-1",
    }),
    [
      ["attendance", "dashboard", "roll-call-1", "actor-1"],
      ["attendance", "roll-call", "roll-call-1", "actor-1"],
      ["attendance", "history", "group-1", "actor-1"],
      ["attendance", "member", "roll-call-1", "membership-1", "actor-1"],
      ["groups", "detail", "group-1", "actor-1"],
    ]
  );
  assert.deepEqual(
    getCloseRollCallCacheTargets({
      groupId: "group-1",
      rollCallId: "roll-call-1",
      userId: "actor-1",
    }),
    [
      ["attendance", "active", "group-1", "actor-1"],
      ["attendance", "roll-call", "roll-call-1", "actor-1"],
      ["attendance", "dashboard", "roll-call-1", "actor-1"],
      ["attendance", "history", "group-1", "actor-1"],
      ["groups", "detail", "group-1", "actor-1"],
    ]
  );
});

test("mutation guard blocks duplicate submissions until completion", () => {
  const guard = createMutationGuard();
  assert.equal(guard.tryStart(), true);
  assert.equal(guard.tryStart(), false);
  assert.equal(guard.pending, true);
  guard.finish();
  assert.equal(guard.tryStart(), true);
});

test("QR secrets are ephemeral, redacted, and never placed in persistent storage", () => {
  const store = createEphemeralSecretStore();
  store.set(qrToken);
  assert.equal(store.hasValue(), true);
  assert.equal(store.take(), qrToken);
  assert.equal(store.hasValue(), false);
  store.set(qrToken);
  store.clear();
  assert.equal(store.hasValue(), false);

  const redacted = redactAttendanceValue({ presented_token: qrToken, message: `HJR:1:${qrToken}` });
  assert.equal(JSON.stringify(redacted).includes(qrToken), false);
  assert.equal(JSON.stringify(redacted).includes(redactedAttendanceToken), true);

  const hookSource = readFileSync(
    new URL("../src/features/attendance/hooks/use-mark-qr-attendance.ts", import.meta.url),
    "utf8"
  );
  const safeVariables = hookSource.match(/interface SafeQrMutationVariables \{([^}]*)\}/s)?.[1];
  assert.equal(
    /AsyncStorage|SecureStore|setItemAsync|console\.(log|warn|error)|analytics/i.test(hookSource),
    false
  );
  assert.equal(safeVariables?.includes("presentedToken"), false);
});

test("canonical error mapping handles unauthorised and network failures", () => {
  assert.equal(
    mapAttendanceErrorOutcome(
      new AppError({ code: appErrorCodes.permissionDenied, message: "safe" })
    ),
    "unauthorised"
  );
  assert.equal(
    mapAttendanceErrorOutcome(new AppError({ code: appErrorCodes.network, message: "safe" })),
    "network_error"
  );
});
