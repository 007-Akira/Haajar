import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const transfer = read("../src/features/groups/screens/transfer-subgroup-screen.tsx");
const transferApi = read("../src/features/groups/api/group-mutations.ts");

test("subgroup transfer is restricted and uses only the atomic RPC", () => {
  assert.match(transfer, /role === "super_organiser"/);
  assert.match(transfer, /item\.parentGroupId === group\.data\?\.parentGroupId/);
  assert.match(transferApi, /rpc\("transfer_operational_group_membership"/);
  assert.doesNotMatch(transferApi, /from\("group_memberships"\).*\.(insert|update|delete)/s);
});

test("only active siblings are selectable and no replacement QR token is exposed", () => {
  assert.match(transfer, /item\.status === "active"/);
  assert.match(transfer, /item\.id !== groupId/);
  assert.doesNotMatch(transfer, /qr_token|token_hash|token_ciphertext/);
});
