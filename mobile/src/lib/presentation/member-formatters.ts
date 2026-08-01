import type { Json } from "@/types/database.types";

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toUpperCase();
}

export function formatAnswerValue(answer: Json): string {
  if (Array.isArray(answer)) return answer.map(String).join(", ");
  if (typeof answer === "boolean") return answer ? "Yes" : "No";
  if (answer === null || answer === "") return "Not answered";
  if (typeof answer === "object") return Object.values(answer).map(String).join(", ");
  return String(answer);
}
