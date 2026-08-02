export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
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
          id: string;
          name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          event_id: string;
          id?: string;
          name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          event_id?: string;
          id?: string;
          name?: string;
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
      change_group_membership_role: {
        Args: { new_role: string; target_membership_id: string };
        Returns: {
          group_membership_id: string;
          qr_credential_id: string;
          qr_token: string;
          qr_version: number;
        }[];
      };
      correct_registration_answer: {
        Args: { corrected_answer: Json; target_answer_id: string };
        Returns: string;
      };
      create_event: {
        Args: { event_description?: string; event_name: string };
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
      create_registration_form: {
        Args: { target_group_id: string };
        Returns: string;
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
      is_active_event_member: {
        Args: { target_event_id: string; target_user_id?: string };
        Returns: boolean;
      };
      is_active_group_member: {
        Args: { target_group_id: string; target_user_id?: string };
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
      save_registration_form_draft: {
        Args: { questions: Json; target_form_id: string };
        Returns: string;
      };
      shares_active_group: {
        Args: { other_user_id: string; target_user_id?: string };
        Returns: boolean;
      };
      submit_join_request: {
        Args: { answers?: Json; target_group_id: string };
        Returns: string;
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
