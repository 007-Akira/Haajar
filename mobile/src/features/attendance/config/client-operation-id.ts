import { getRandomValues as getExpoRandomValues } from "expo-crypto";

export type RandomValuesProvider = (values: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>;

export function createClientOperationId(
  getRandomValues: RandomValuesProvider = (values) =>
    getExpoRandomValues(values) as Uint8Array<ArrayBuffer>
): string {
  const bytes = getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
