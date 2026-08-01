export interface TechnicalErrorContext {
  operation: string;
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

export function logTechnicalError(context: TechnicalErrorContext): void {
  if (__DEV__) {
    console.error("[Haajar data error]", context);
  }
}
