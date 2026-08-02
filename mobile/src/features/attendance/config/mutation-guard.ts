export interface MutationGuard {
  tryStart(): boolean;
  finish(): void;
  readonly pending: boolean;
}

export function createMutationGuard(): MutationGuard {
  let pending = false;
  return {
    tryStart(): boolean {
      if (pending) return false;
      pending = true;
      return true;
    },
    finish(): void {
      pending = false;
    },
    get pending(): boolean {
      return pending;
    },
  };
}
