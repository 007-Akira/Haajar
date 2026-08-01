import assert from "node:assert/strict";
import test from "node:test";

import { mapJoinRequestReview } from "../src/features/join-requests/types/join-request-models";
import {
  mapQrCredentialResult,
  redactQrToken,
  redactedQrToken,
} from "../src/features/qr/types/qr-models";
import {
  type RegistrationQuestion,
  validateRegistrationAnswers,
} from "../src/features/registration/types/registration-models";
import { queryKeys } from "../src/lib/query/query-keys";

(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;

const questions: RegistrationQuestion[] = [
  {
    id: "name",
    label: "Name",
    questionType: "short_text",
    isRequired: true,
    position: 0,
    options: [],
  },
  {
    id: "batch",
    label: "Batch",
    questionType: "dropdown",
    isRequired: true,
    position: 1,
    options: [
      { id: "a", label: "2027", value: "2027", position: 0 },
      { id: "b", label: "2028", value: "2028", position: 1 },
    ],
  },
  {
    id: "consent",
    label: "Consent",
    questionType: "yes_no",
    isRequired: false,
    position: 2,
    options: [],
  },
];

test("validates dynamic registration answers without weakening server validation", () => {
  const valid = validateRegistrationAnswers(questions, [
    { questionId: "name", answer: "Mathews" },
    { questionId: "batch", answer: "2027" },
    { questionId: "consent", answer: true },
  ]);
  const invalid = validateRegistrationAnswers(questions, [
    { questionId: "name", answer: "" },
    { questionId: "batch", answer: "2030" },
    { questionId: "unknown", answer: "value" },
  ]);

  assert.equal(valid.valid, true);
  assert.equal(invalid.valid, false);
  assert.deepEqual(
    new Set(invalid.issues.map((issue) => issue.questionId)),
    new Set(["name", "batch", "unknown"])
  );
});

test("scopes sensitive query keys by authenticated user", () => {
  assert.notDeepEqual(
    queryKeys.registration.form("group-1", "user-a"),
    queryKeys.registration.form("group-1", "user-b")
  );
  assert.notDeepEqual(
    queryKeys.joinRequests.pending("group-1", "manager-a"),
    queryKeys.joinRequests.pending("group-1", "manager-b")
  );
  assert.notDeepEqual(
    queryKeys.qr.membership("membership-1", "user-a"),
    queryKeys.qr.membership("membership-1", "user-b")
  );
});

test("maps secured RPC results to application models", () => {
  const review = mapJoinRequestReview({
    join_request_id: "request-1",
    group_membership_id: "membership-1",
    qr_credential_id: "credential-1",
    qr_token: "one-time-secret",
    qr_version: 2,
  });
  const qr = mapQrCredentialResult({
    qr_credential_id: "credential-1",
    qr_token: "one-time-secret",
    qr_version: 2,
  });

  assert.equal(review.groupMembershipId, "membership-1");
  assert.equal(review.qrToken, "one-time-secret");
  assert.deepEqual(qr, {
    credentialId: "credential-1",
    token: "one-time-secret",
    version: 2,
  });
});

test("maps lifecycle database errors to safe messages", async () => {
  const { appErrorCodes, mapSupabaseError, userSafeErrorMessages } =
    await import("../src/lib/errors/index");
  const immutable = mapSupabaseError(
    { code: "55000", message: "Published form internal database detail" },
    "test.registration.immutable"
  );
  const missing = mapSupabaseError(
    { code: "P0002", message: "private row identifier" },
    "test.registration.missing"
  );

  assert.equal(immutable.code, appErrorCodes.conflict);
  assert.equal(immutable.message, userSafeErrorMessages.CONFLICT);
  assert.equal(immutable.message.includes("internal database detail"), false);
  assert.equal(missing.code, appErrorCodes.notFound);
  assert.equal(missing.message, userSafeErrorMessages.NOT_FOUND);
});

test("redacts QR tokens recursively without logging registration payloads", () => {
  const redacted = redactQrToken({
    qr_token: "secret-a",
    nested: { qrToken: "secret-b", token: "secret-c", safe: "visible" },
  });
  const serialized = JSON.stringify(redacted);

  assert.equal(serialized.includes("secret-a"), false);
  assert.equal(serialized.includes("secret-b"), false);
  assert.equal(serialized.includes("secret-c"), false);
  assert.equal(redacted.qr_token, redactedQrToken);
  assert.equal(redacted.nested.safe, "visible");
});
