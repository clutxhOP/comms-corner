export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_channels: {
        Row: {
          allowed_roles: Database["public"]["Enums"]["user_role"][]
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["user_role"][]
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          allowed_roles?: Database["public"]["Enums"]["user_role"][]
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          sender_name: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          sender_name?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          sender_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company: string | null
          created_at: string
          created_by: string | null
          email: string
          id: string
          last_lead_sent_at: string | null
          name: string
          phone: string | null
          total_leads_sent: number
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          last_lead_sent_at?: string | null
          name: string
          phone?: string | null
          total_leads_sent?: number
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          last_lead_sent_at?: string | null
          name?: string
          phone?: string | null
          total_leads_sent?: number
          updated_at?: string
        }
        Relationships: []
      }
      personal_access_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          token_hash?: string
          token_prefix?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          mentions: string[] | null
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actioned_at: string | null
          actioned_by: string | null
          assigned_to: string[] | null
          created_at: string
          created_by: string | null
          details: Json
          disapproval_reason: string | null
          id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          actioned_at?: string | null
          actioned_by?: string | null
          assigned_to?: string[] | null
          created_at?: string
          created_by?: string | null
          details?: Json
          disapproval_reason?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          actioned_at?: string | null
          actioned_by?: string | null
          assigned_to?: string[] | null
          created_at?: string
          created_by?: string | null
          details?: Json
          disapproval_reason?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          error_message: string | null
          executed_at: string
          id: string
          request_payload: Json
          request_url: string
          response_body: string | null
          response_status: number | null
          success: boolean
          trigger_action: string
          webhook_id: string | null
          webhook_name: string
        }
        Insert: {
          error_message?: string | null
          executed_at?: string
          id?: string
          request_payload?: Json
          request_url: string
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          trigger_action: string
          webhook_id?: string | null
          webhook_name: string
        }
        Update: {
          error_message?: string | null
          executed_at?: string
          id?: string
          request_payload?: Json
          request_url?: string
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          trigger_action?: string
          webhook_id?: string | null
          webhook_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          name: string
          trigger_action: string[]
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          trigger_action: string[]
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          trigger_action?: string[]
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      personal_access_tokens_safe: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string | null
          last_used_at: string | null
          name: string | null
          revoked_at: string | null
          token_prefix: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          last_used_at?: string | null
          name?: string | null
          revoked_at?: string | null
          token_prefix?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          last_used_at?: string | null
          name?: string | null
          revoked_at?: string | null
          token_prefix?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles_display: {
        Row: {
          full_name: string | null
          user_id: string | null
        }
        Insert: {
          full_name?: string | null
          user_id?: string | null
        }
        Update: {
          full_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      task_status: "pending" | "done" | "approved" | "disapproved"
      task_type:
        | "lead-approval"
        | "lead-alert"
        | "lead-outreach"
        | "other"
        | "error-alert"
      user_role: "admin" | "dev" | "ops"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      task_status: ["pending", "done", "approved", "disapproved"],
      task_type: [
        "lead-approval",
        "lead-alert",
        "lead-outreach",
        "other",
        "error-alert",
      ],
      user_role: ["admin", "dev", "ops"],
    },
  },
} as const
