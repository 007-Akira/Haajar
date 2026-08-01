import type { Tables } from "@/types/database.types";

export { getSupabaseClient } from "./client";
export { getSupabaseEnvironment, SupabaseEnvironmentError } from "./env";
export type { Database, Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type Profile = Tables<"profiles">;
