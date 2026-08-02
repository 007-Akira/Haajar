export interface TechnicalErrorContext {
  operation: string;
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

export function logTechnicalError(context: TechnicalErrorContext): void {
  if (__DEV__) {
    console.error("[Haajar data error]", redactTechnicalErrorContext(context));
  }
}

export function redactTechnicalErrorContext(context: TechnicalErrorContext): TechnicalErrorContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      typeof value === "string" ? redact(value) : value,
    ])
  ) as unknown as TechnicalErrorContext;
}

function redact(value: string): string {
  return value
    .replace(/hjr:[1-9][0-9]{0,8}:[a-f0-9]{64}/gi, "[REDACTED_QR]")
    .replace(/\b[a-f0-9]{64}\b/gi, "[REDACTED_SECRET]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]")
    .replace(/(\/join\/)[a-f0-9]{24,}/gi, "$1[REDACTED_INVITATION]");
}
