export function safeAuthReturnTo(value: string | undefined): string {
  return value?.startsWith("/join/") ? value : "/(tabs)";
}
