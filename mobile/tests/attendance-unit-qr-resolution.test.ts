import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260802001600_attendance_unit_qr_resolution.sql",
    import.meta.url
  ),
  "utf8"
);
const bindingMigration = readFileSync(
  new URL("../../supabase/migrations/20260802001900_bind_qr_mark_to_roster.sql", import.meta.url),
  "utf8"
);

test("attendance QR resolution is scoped by scanner permission and attendance unit", () => {
  assert.match(migration, /attendance_unit_operators/);
  assert.match(migration, /operator\.can_scan/);
  assert.match(migration, /is_event_super_organiser/);
  assert.match(migration, /token_hash = encode\(extensions\.digest/);
  assert.match(migration, /credential_record\.status <> 'active'/);
  assert.match(migration, /membership_record\.status <> 'active'/);
  assert.match(migration, /unit_record\.unit_type = 'subgroup'/);
  assert.match(migration, /membership_record\.group_id <> unit_record\.group_id/);
  assert.match(migration, /user_id = membership_record\.user_id/);
});

test("resolver returns explicit safe outcomes without credential material", () => {
  for (const status of [
    "valid",
    "invalid_qr",
    "revoked",
    "wrong_group",
    "not_in_roster",
    "inactive_membership",
    "closed_unit",
    "archived",
    "unauthorised",
  ]) {
    assert.match(migration, new RegExp(`'${status}'`));
  }
  const returnContract = migration.match(/returns table \((.*?)\)\s*language/s)?.[1] ?? "";
  assert.doesNotMatch(returnContract, /token|hash|encrypted|email|audit/i);
  assert.doesNotMatch(migration, /jsonb_build_object\([^)]*presented_token/s);
});

test("marking re-resolves the credential and binds it to the selected roster row", () => {
  assert.match(bindingMigration, /resolve_attendance_qr/);
  assert.match(
    bindingMigration,
    /resolution\.roster_entry_id is distinct from mark_attendance_roster_present\.roster_entry_id/
  );
  assert.match(bindingMigration, /private\.record_unit_attendance/);
  assert.match(bindingMigration, /attendance\.qr_roster_substitution_rejected/);
  assert.match(
    bindingMigration,
    /drop function public\.mark_attendance_roster_present\(uuid, uuid, uuid\)/
  );
  assert.doesNotMatch(bindingMigration, /jsonb_build_object\([^)]*presented_token/s);
});

test("attendance QR RPCs use hardened grants and fixed search paths", () => {
  assert.match(migration, /security definer set search_path = ''/);
  assert.match(bindingMigration, /security definer set search_path = ''/);
  assert.match(migration, /revoke all on function public\.resolve_attendance_qr/);
  assert.match(bindingMigration, /to authenticated/);
});
