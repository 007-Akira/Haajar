import { appErrorCodes, isAppError } from "@/lib/errors";

export type GroupNameScope = "category" | "operational";

export function validateGroupName(value: string): string | undefined {
  return value.trim() ? undefined : "Enter a group name.";
}

export function groupDuplicateNameMessage(scope: GroupNameScope): string {
  return scope === "category"
    ? "A category with this name already exists in this trip."
    : "A group with this name already exists in this category.";
}

export function groupNameMutationError(error: unknown, scope: GroupNameScope): string | undefined {
  return isAppError(error) && error.code === appErrorCodes.conflict
    ? groupDuplicateNameMessage(scope)
    : undefined;
}
