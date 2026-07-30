export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type EventRole = "member" | "super_organiser";
export type GroupRole = "member" | "co_organiser" | "organiser" | "super_organiser";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          profile_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          profile_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          profile_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string;
          status: "active" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_by: string;
          status?: "active" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          status?: "active" | "archived";
          updated_at?: string;
        };
        Relationships: [];
      };
      event_members: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          role: EventRole;
          status: "active" | "inactive";
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          role?: EventRole;
          status?: "active" | "inactive";
          created_at?: string;
        };
        Update: {
          role?: EventRole;
          status?: "active" | "inactive";
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          description: string | null;
          created_by: string;
          status: "active" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          description?: string | null;
          created_by: string;
          status?: "active" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          status?: "active" | "archived";
          updated_at?: string;
        };
        Relationships: [];
      };
      group_memberships: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: GroupRole;
          status: "pending" | "active" | "rejected" | "inactive";
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: GroupRole;
          status?: "pending" | "active" | "rejected" | "inactive";
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: GroupRole;
          status?: "pending" | "active" | "rejected" | "inactive";
          approved_by?: string | null;
          approved_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_event: {
        Args: { event_name: string; event_description?: string | null };
        Returns: string;
      };
      create_group: {
        Args: { parent_event_id: string; group_name: string; group_description?: string | null };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
