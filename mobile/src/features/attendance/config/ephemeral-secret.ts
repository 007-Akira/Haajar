export interface EphemeralSecretStore {
  set(value: string): void;
  take(): string | null;
  clear(): void;
  hasValue(): boolean;
}

export function createEphemeralSecretStore(): EphemeralSecretStore {
  let value: string | null = null;
  return {
    set(nextValue: string): void {
      value = nextValue;
    },
    take(): string | null {
      const current = value;
      value = null;
      return current;
    },
    clear(): void {
      value = null;
    },
    hasValue(): boolean {
      return value !== null;
    },
  };
}
