export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      attendance_records: {
        Row: {
          attendance_unit_id: string;
          client_operation_id: string;
          created_at: string;
          event_id: string;
          id: string;
          marked_at: string;
          marked_by: string;
          marking_method: string;
          roster_entry_id: string;
          session_id: string;
          user_id: string;
        };
        Insert: {
          attendance_unit_id: string;
          client_operation_id: string;
          created_at?: string;
          event_id: string;
          id?: string;
          marked_at?: string;
          marked_by: string;
          marking_method: string;
          roster_entry_id: string;
          session_id: string;
          user_id: string;
        };
        Update: {
          attendance_unit_id?: string;
          client_operation_id?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          marked_at?: string;
          marked_by?: string;
          marking_method?: string;
          roster_entry_id?: string;
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_records_attendance_unit_id_fkey";
            columns: ["attendance_unit_id"];
            isOneToOne: false;
            referencedRelation: "attendance_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_marked_by_fkey";
            columns: ["marked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_roster_entry_id_attendance_unit_id_sess_fkey";
            columns: ["roster_entry_id", "attendance_unit_id", "session_id", "event_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "attendance_unit_roster";
            referencedColumns: ["id", "attendance_unit_id", "session_id", "event_id", "user_id"];
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "attendance_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_sessions: {
        Row: {
          category_group_id: string | null;
          closed_at: string | null;
          closed_by: string | null;
          created_at: string;
          event_id: string;
          id: string;
          note: string | null;
          scope_type: string;
          started_at: string;
          started_by: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          category_group_id?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          note?: string | null;
          scope_type: string;
          started_at?: string;
          started_by: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          category_group_id?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          note?: string | null;
          scope_type?: string;
          started_at?: string;
          started_by?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_session_category_event_fk";
            columns: ["category_group_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id", "event_id"];
          },
          {
            foreignKeyName: "attendance_sessions_category_group_id_fkey";
            columns: ["category_group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_sessions_closed_by_fkey";
            columns: ["closed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_sessions_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_sessions_started_by_fkey";
            columns: ["started_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_unit_operators: {
        Row: {
          assigned_by: string;
          attendance_unit_id: string;
          can_mark_manually: boolean;
          can_scan: boolean;
          created_at: string;
          user_id: string;
        };
        Insert: {
          assigned_by: string;
          attendance_unit_id: string;
          can_mark_manually?: boolean;
          can_scan?: boolean;
          created_at?: string;
          user_id: string;
        };
        Update: {
          assigned_by?: string;
          attendance_unit_id?: string;
          can_mark_manually?: boolean;
          can_scan?: boolean;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_unit_operators_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_unit_operators_attendance_unit_id_fkey";
            columns: ["attendance_unit_id"];
            isOneToOne: false;
            referencedRelation: "attendance_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_unit_operators_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_unit_roster: {
        Row: {
          attendance_unit_id: string;
          created_at: string;
          display_name_snapshot: string;
          event_id: string;
          event_member_id: string;
          group_id: string | null;
          group_membership_id: string | null;
          id: string;
          phone_snapshot: string | null;
          role_snapshot: string;
          session_id: string;
          source_group_name_snapshot: string | null;
          user_id: string;
        };
        Insert: {
          attendance_unit_id: string;
          created_at?: string;
          display_name_snapshot: string;
          event_id: string;
          event_member_id: string;
          group_id?: string | null;
          group_membership_id?: string | null;
          id?: string;
          phone_snapshot?: string | null;
          role_snapshot: string;
          session_id: string;
          source_group_name_snapshot?: string | null;
          user_id: string;
        };
        Update: {
          attendance_unit_id?: string;
          created_at?: string;
          display_name_snapshot?: string;
          event_id?: string;
          event_member_id?: string;
          group_id?: string | null;
          group_membership_id?: string | null;
          id?: string;
          phone_snapshot?: string | null;
          role_snapshot?: string;
          session_id?: string;
          source_group_name_snapshot?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_roster_event_member_fk";
            columns: ["event_member_id", "event_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "event_members";
            referencedColumns: ["id", "event_id", "user_id"];
          },
          {
            foreignKeyName: "attendance_roster_group_membership_fk";
            columns: ["group_membership_id", "group_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "group_memberships";
            referencedColumns: ["id", "group_id", "user_id"];
          },
          {
            foreignKeyName: "attendance_roster_unit_scope_fk";
            columns: ["attendance_unit_id", "session_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "attendance_units";
            referencedColumns: ["id", "session_id", "event_id"];
          },
          {
            foreignKeyName: "attendance_unit_roster_attendance_unit_id_fkey";
            columns: ["attendance_unit_id"];
            isOneToOne: false;
            referencedRelation: "attendance_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_unit_roster_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_unit_roster_event_member_id_fkey";
            columns: ["event_member_id"];
            isOneToOne: false;
            referencedRelation: "event_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_unit_roster_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_unit_roster_group_membership_id_fkey";
            columns: ["group_membership_id"];
            isOneToOne: false;
            referencedRelation: "group_memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_unit_roster_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "attendance_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_unit_roster_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_units: {
        Row: {
          closed_at: string | null;
          created_at: string;
          event_id: string;
          group_id: string | null;
          id: string;
          session_id: string;
          started_at: string;
          status: string;
          unit_type: string;
          updated_at: string;
        };
        Insert: {
          closed_at?: string | null;
          created_at?: string;
          event_id: string;
          group_id?: string | null;
          id?: string;
          session_id: string;
          started_at?: string;
          status?: string;
          unit_type: string;
          updated_at?: string;
        };
        Update: {
          closed_at?: string | null;
          created_at?: string;
          event_id?: string;
          group_id?: string | null;
          id?: string;
          session_id?: string;
          started_at?: string;
          status?: string;
          unit_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_unit_group_event_fk";
            columns: ["group_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id", "event_id"];
          },
          {
            foreignKeyName: "attendance_units_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_units_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_units_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "attendance_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          event_id: string | null;
          group_id: string | null;
          id: string;
          metadata: Json;
          new_data: Json | null;
          old_data: Json | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          event_id?: string | null;
          group_id?: string | null;
          id?: string;
          metadata?: Json;
          new_data?: Json | null;
          old_data?: Json | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          event_id?: string | null;
          group_id?: string | null;
          id?: string;
          metadata?: Json;
          new_data?: Json | null;
          old_data?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      event_members: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          role: string;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          role?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          role?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      group_invitations: {
        Row: {
          created_at: string;
          created_by: string;
          group_id: string;
          id: string;
          revoked_at: string | null;
          status: string;
          token_hash: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          group_id: string;
          id?: string;
          revoked_at?: string | null;
          status?: string;
          token_hash: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          group_id?: string;
          id?: string;
          revoked_at?: string | null;
          status?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_invitations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_invitations_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_memberships: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          category_group_id: string | null;
          created_at: string;
          group_id: string;
          id: string;
          role: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          category_group_id?: string | null;
          created_at?: string;
          group_id: string;
          id?: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          category_group_id?: string | null;
          created_at?: string;
          group_id?: string;
          id?: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_memberships_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_memberships_category_group_id_fkey";
            columns: ["category_group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_memberships_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          event_id: string;
          group_kind: string;
          id: string;
          name: string;
          parent_group_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          event_id: string;
          group_kind?: string;
          id?: string;
          name: string;
          parent_group_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          event_id?: string;
          group_kind?: string;
          id?: string;
          name?: string;
          parent_group_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "groups_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "groups_parent_group_id_fkey";
            columns: ["parent_group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      join_requests: {
        Row: {
          group_id: string;
          id: string;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          submitted_at: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_at?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "join_requests_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "join_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "join_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_deliveries: {
        Row: {
          attempt_count: number;
          created_at: string;
          device_id: string;
          id: string;
          job_id: string;
          last_attempted_at: string | null;
          last_error_code: string | null;
          provider_ticket_id: string | null;
          sent_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempt_count?: number;
          created_at?: string;
          device_id: string;
          id?: string;
          job_id: string;
          last_attempted_at?: string | null;
          last_error_code?: string | null;
          provider_ticket_id?: string | null;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempt_count?: number;
          created_at?: string;
          device_id?: string;
          id?: string;
          job_id?: string;
          last_attempted_at?: string | null;
          last_error_code?: string | null;
          provider_ticket_id?: string | null;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "push_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_deliveries_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "notification_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_deliveries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_jobs: {
        Row: {
          body: string;
          created_at: string;
          dedupe_key: string;
          entity_id: string;
          event_id: string;
          group_id: string | null;
          id: string;
          notification_type: string;
          processed_at: string | null;
          route: string;
          status: string;
          title: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          dedupe_key: string;
          entity_id: string;
          event_id: string;
          group_id?: string | null;
          id?: string;
          notification_type: string;
          processed_at?: string | null;
          route: string;
          status?: string;
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          dedupe_key?: string;
          entity_id?: string;
          event_id?: string;
          group_id?: string | null;
          id?: string;
          notification_type?: string;
          processed_at?: string | null;
          route?: string;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_jobs_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_jobs_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          created_at: string;
          join_request_updates: boolean;
          roll_call_started: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          join_request_updates?: boolean;
          roll_call_started?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          join_request_updates?: boolean;
          roll_call_started?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          profile_completed: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          profile_completed?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          profile_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_devices: {
        Row: {
          app_instance_id: string;
          created_at: string;
          id: string;
          last_registered_at: string;
          platform: string;
          revoked_at: string | null;
          status: string;
          token_ciphertext: string;
          token_hash: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          app_instance_id: string;
          created_at?: string;
          id?: string;
          last_registered_at?: string;
          platform: string;
          revoked_at?: string | null;
          status?: string;
          token_ciphertext: string;
          token_hash: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          app_instance_id?: string;
          created_at?: string;
          id?: string;
          last_registered_at?: string;
          platform?: string;
          revoked_at?: string | null;
          status?: string;
          token_ciphertext?: string;
          token_hash?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_devices_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      qr_credentials: {
        Row: {
          group_membership_id: string;
          id: string;
          issued_at: string;
          revoked_at: string | null;
          status: string;
          token_ciphertext: string | null;
          token_hash: string;
          version: number;
        };
        Insert: {
          group_membership_id: string;
          id?: string;
          issued_at?: string;
          revoked_at?: string | null;
          status?: string;
          token_ciphertext?: string | null;
          token_hash: string;
          version?: number;
        };
        Update: {
          group_membership_id?: string;
          id?: string;
          issued_at?: string;
          revoked_at?: string | null;
          status?: string;
          token_ciphertext?: string | null;
          token_hash?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "qr_credentials_group_membership_id_fkey";
            columns: ["group_membership_id"];
            isOneToOne: false;
            referencedRelation: "group_memberships";
            referencedColumns: ["id"];
          },
        ];
      };
      registration_answers: {
        Row: {
          answer_json: Json;
          corrected_at: string | null;
          corrected_by: string | null;
          created_at: string;
          id: string;
          join_request_id: string;
          question_id: string;
          updated_at: string;
        };
        Insert: {
          answer_json: Json;
          corrected_at?: string | null;
          corrected_by?: string | null;
          created_at?: string;
          id?: string;
          join_request_id: string;
          question_id: string;
          updated_at?: string;
        };
        Update: {
          answer_json?: Json;
          corrected_at?: string | null;
          corrected_by?: string | null;
          created_at?: string;
          id?: string;
          join_request_id?: string;
          question_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registration_answers_corrected_by_fkey";
            columns: ["corrected_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registration_answers_join_request_id_fkey";
            columns: ["join_request_id"];
            isOneToOne: false;
            referencedRelation: "join_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registration_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "registration_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      registration_forms: {
        Row: {
          created_at: string;
          created_by: string;
          group_id: string;
          id: string;
          published_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          group_id: string;
          id?: string;
          published_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          group_id?: string;
          id?: string;
          published_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registration_forms_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registration_forms_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: true;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      registration_options: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          position: number;
          question_id: string;
          value: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          position: number;
          question_id: string;
          value: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          position?: number;
          question_id?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registration_options_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "registration_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      registration_questions: {
        Row: {
          created_at: string;
          form_id: string;
          id: string;
          is_required: boolean;
          label: string;
          position: number;
          question_type: string;
        };
        Insert: {
          created_at?: string;
          form_id: string;
          id?: string;
          is_required?: boolean;
          label: string;
          position: number;
          question_type: string;
        };
        Update: {
          created_at?: string;
          form_id?: string;
          id?: string;
          is_required?: boolean;
          label?: string;
          position?: number;
          question_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registration_questions_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "registration_forms";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_view_attendance_session: {
        Args: { target_session_id: string; target_user_id?: string };
        Returns: boolean;
      };
      change_group_membership_role: {
        Args: { new_role: string; target_membership_id: string };
        Returns: {
          group_membership_id: string;
          qr_credential_id: string;
          qr_token: string;
          qr_version: number;
        }[];
      };
      claim_push_deliveries: {
        Args: { batch_size?: number };
        Returns: {
          delivery_id: string;
          expo_push_token: string;
          notification_body: string;
          notification_route: string;
          notification_title: string;
        }[];
      };
      close_roll_call: {
        Args: { target_roll_call_id: string };
        Returns: {
          closed_at: string;
          present_count: number;
          remaining_count: number;
          roll_call_id: string;
          total_roster: number;
        }[];
      };
      complete_push_delivery: {
        Args: {
          delivery_status: string;
          error_code?: string;
          provider_ticket?: string;
          target_delivery_id: string;
        };
        Returns: undefined;
      };
      correct_registration_answer: {
        Args: { corrected_answer: Json; target_answer_id: string };
        Returns: string;
      };
      create_category_attendance_session: {
        Args: {
          session_note?: string;
          session_title: string;
          target_category_group_id: string;
        };
        Returns: string;
      };
      create_category_group: {
        Args: {
          group_description?: string;
          group_name: string;
          target_event_id: string;
        };
        Returns: string;
      };
      create_event: {
        Args: { event_description?: string; event_name: string };
        Returns: string;
      };
      create_general_attendance_session: {
        Args: {
          selected_operators?: Json;
          session_note?: string;
          session_title: string;
          target_event_id: string;
        };
        Returns: string;
      };
      create_group: {
        Args: {
          group_description?: string;
          group_name: string;
          parent_event_id: string;
        };
        Returns: string;
      };
      create_group_invitation: {
        Args: { target_group_id: string };
        Returns: {
          invitation_id: string;
          invitation_token: string;
        }[];
      };
      create_operational_group: {
        Args: {
          group_description?: string;
          group_name: string;
          target_category_group_id: string;
        };
        Returns: string;
      };
      create_registration_form: {
        Args: { target_group_id: string };
        Returns: string;
      };
      create_roll_call: {
        Args: {
          roll_call_note?: string;
          roll_call_title: string;
          target_group_id: string;
        };
        Returns: string;
      };
      get_active_roll_call: {
        Args: { target_group_id: string };
        Returns: {
          attendance_unit_id: string;
          caller_can_manage: boolean;
          caller_can_scan: boolean;
          created_by: string;
          event_id: string;
          group_id: string;
          present_count: number;
          remaining_count: number;
          roll_call_id: string;
          scope_type: string;
          session_id: string;
          started_at: string;
          status: string;
          title: string;
          total_roster: number;
        }[];
      };
      get_event_member_details: {
        Args: { target_event_id: string; target_user_id: string };
        Returns: Json;
      };
      get_join_request_status: {
        Args: { target_request_id: string };
        Returns: Json;
      };
      get_membership_qr: {
        Args: { target_membership_id: string };
        Returns: {
          qr_credential_id: string;
          qr_token: string;
          qr_version: number;
        }[];
      };
      get_offline_roll_call_bundle: {
        Args: { target_roll_call_id: string };
        Returns: Json;
      };
      get_roll_call_dashboard: {
        Args: { target_roll_call_id: string };
        Returns: Json;
      };
      get_roll_call_history: {
        Args: { target_group_id: string };
        Returns: {
          closed_at: string;
          created_by: string;
          created_by_name: string;
          event_id: string;
          group_id: string;
          present_count: number;
          remaining_count: number;
          roll_call_id: string;
          started_at: string;
          status: string;
          title: string;
          total_roster: number;
        }[];
      };
      is_active_event_member: {
        Args: { target_event_id: string; target_user_id?: string };
        Returns: boolean;
      };
      is_active_group_member: {
        Args: { target_group_id: string; target_user_id?: string };
        Returns: boolean;
      };
      is_attendance_unit_operator: {
        Args: { target_unit_id: string; target_user_id?: string };
        Returns: boolean;
      };
      is_event_super_organiser: {
        Args: { target_event_id: string; target_user_id?: string };
        Returns: boolean;
      };
      is_group_manager: {
        Args: { target_group_id: string; target_user_id?: string };
        Returns: boolean;
      };
      issue_membership_qr: {
        Args: { target_membership_id: string };
        Returns: {
          qr_credential_id: string;
          qr_token: string;
          qr_version: number;
        }[];
      };
      list_event_member_directory: {
        Args: { target_event_id: string };
        Returns: {
          active_internal_group_count: number;
          event_role: string;
          full_name: string;
          membership_id: string;
          phone: string;
          user_id: string;
        }[];
      };
      list_group_join_requests: {
        Args: { request_status?: string; target_group_id: string };
        Returns: Json;
      };
      list_my_group_overview: { Args: never; Returns: Json };
      mark_attendance_manual: {
        Args: {
          client_operation_id: string;
          target_membership_id: string;
          target_roll_call_id: string;
        };
        Returns: {
          attendance_record_id: string;
          marked_at: string;
          marking_method: string;
          member_user_id: string;
          membership_id: string;
          result_status: string;
        }[];
      };
      mark_attendance_present: {
        Args: {
          client_operation_id: string;
          marking_method: string;
          presented_token: string;
          target_roll_call_id: string;
        };
        Returns: {
          attendance_record_id: string;
          marked_at: string;
          member_user_id: string;
          membership_id: string;
          resolved_marking_method: string;
          result_status: string;
        }[];
      };
      publish_registration_form: {
        Args: { target_form_id: string };
        Returns: string;
      };
      regenerate_membership_qr: {
        Args: { target_membership_id: string };
        Returns: {
          qr_credential_id: string;
          qr_token: string;
          qr_version: number;
        }[];
      };
      register_push_device: {
        Args: {
          device_platform: string;
          push_token: string;
          target_app_instance_id: string;
        };
        Returns: string;
      };
      resolve_group_invitation: {
        Args: { invitation_token: string };
        Returns: Json;
      };
      resolve_membership_qr: {
        Args: { expected_group_id: string; presented_token: string };
        Returns: {
          credential_status: string;
          credential_version: number;
          display_name: string;
          group_id: string;
          group_name: string;
          member_role: string;
          member_user_id: string;
          membership_id: string;
          membership_status: string;
          phone: string;
          resolution_status: string;
        }[];
      };
      review_join_request: {
        Args: {
          decision: string;
          rejection_reason?: string;
          target_request_id: string;
        };
        Returns: {
          group_membership_id: string;
          join_request_id: string;
          qr_credential_id: string;
          qr_token: string;
          qr_version: number;
        }[];
      };
      revoke_push_device: {
        Args: { target_app_instance_id: string };
        Returns: boolean;
      };
      save_registration_form_draft: {
        Args: { questions: Json; target_form_id: string };
        Returns: string;
      };
      set_general_attendance_operator: {
        Args: {
          allow_manual: boolean;
          allow_scan: boolean;
          target_session_id: string;
          target_user_id: string;
        };
        Returns: boolean;
      };
      shares_active_group: {
        Args: { other_user_id: string; target_user_id?: string };
        Returns: boolean;
      };
      submit_join_request: {
        Args: { answers?: Json; target_group_id: string };
        Returns: string;
      };
      sync_offline_attendance: {
        Args: {
          client_operation_id: string;
          local_marked_at: string;
          target_membership_id: string;
          target_roll_call_id: string;
        };
        Returns: {
          attendance_record_id: string;
          marked_at: string;
          marking_method: string;
          member_user_id: string;
          membership_id: string;
          result_status: string;
        }[];
      };
      transfer_operational_group_membership: {
        Args: {
          source_membership_id: string;
          target_operational_group_id: string;
        };
        Returns: {
          group_membership_id: string;
          qr_version: number;
          source_group_id: string;
          target_group_id: string;
        }[];
      };
      validate_registration_answer: {
        Args: { answer_value: Json; target_question_id: string };
        Returns: boolean;
      };
      write_haajar_audit: {
        Args: {
          target_action: string;
          target_actor_id: string;
          target_entity_id: string;
          target_entity_type: string;
          target_event_id: string;
          target_group_id: string;
          target_metadata?: Json;
          target_new_data?: Json;
          target_old_data?: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
