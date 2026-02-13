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
      chat_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          message_id: string | null
          storage_path: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          message_id?: string | null
          storage_path: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string | null
          storage_path?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
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
          mentions: string[] | null
          reply_to: string | null
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
          mentions?: string[] | null
          reply_to?: string | null
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
          mentions?: string[] | null
          reply_to?: string | null
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
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_notifications: {
        Row: {
          channel_id: string | null
          created_at: string
          id: string
          message_id: string | null
          message_preview: string
          read_at: string | null
          sender_id: string
          sender_name: string
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          message_preview: string
          read_at?: string | null
          sender_id: string
          sender_name: string
          user_id: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          message_preview?: string
          read_at?: string | null
          sender_id?: string
          sender_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_notifications_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          category: string | null
          created_at: string | null
          feedback_status: string | null
          human_mode: boolean | null
          icp: string | null
          id: string
          info_confirmed: string | null
          lastleadsendat: string | null
          lastmessaged: string | null
          location: string | null
          name: string | null
          notes: string | null
          num_of_leads: number | null
          offering: string | null
          slack_groupid: string | null
          status: string | null
          sub_status: string | null
          tags: string | null
          updated_at: string | null
          usp: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          feedback_status?: string | null
          human_mode?: boolean | null
          icp?: string | null
          id?: string
          info_confirmed?: string | null
          lastleadsendat?: string | null
          lastmessaged?: string | null
          location?: string | null
          name?: string | null
          notes?: string | null
          num_of_leads?: number | null
          offering?: string | null
          slack_groupid?: string | null
          status?: string | null
          sub_status?: string | null
          tags?: string | null
          updated_at?: string | null
          usp?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          feedback_status?: string | null
          human_mode?: boolean | null
          icp?: string | null
          id?: string
          info_confirmed?: string | null
          lastleadsendat?: string | null
          lastmessaged?: string | null
          location?: string | null
          name?: string | null
          notes?: string | null
          num_of_leads?: number | null
          offering?: string | null
          slack_groupid?: string | null
          status?: string | null
          sub_status?: string | null
          tags?: string | null
          updated_at?: string | null
          usp?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      lead_assignments: {
        Row: {
          approval_status: string
          assigned_by: string
          business_id: string
          category: string
          client_id: string
          client_name: string | null
          client_whatsapp: string
          contact_info: string
          created_at: string
          icp: string | null
          id: string
          lead_id: string
          post_url: string
          reassigned_at: string | null
          reassigned_business_id: string | null
          reassigned_business_ids: Json | null
          reassigned_by: string | null
          reassigned_whatsapp: string | null
          reassignment_reason: string | null
          record_id: string | null
          requirement: string
          website: string | null
        }
        Insert: {
          approval_status: string
          assigned_by: string
          business_id: string
          category: string
          client_id: string
          client_name?: string | null
          client_whatsapp: string
          contact_info: string
          created_at?: string
          icp?: string | null
          id?: string
          lead_id: string
          post_url: string
          reassigned_at?: string | null
          reassigned_business_id?: string | null
          reassigned_business_ids?: Json | null
          reassigned_by?: string | null
          reassigned_whatsapp?: string | null
          reassignment_reason?: string | null
          record_id?: string | null
          requirement: string
          website?: string | null
        }
        Update: {
          approval_status?: string
          assigned_by?: string
          business_id?: string
          category?: string
          client_id?: string
          client_name?: string | null
          client_whatsapp?: string
          contact_info?: string
          created_at?: string
          icp?: string | null
          id?: string
          lead_id?: string
          post_url?: string
          reassigned_at?: string | null
          reassigned_business_id?: string | null
          reassigned_business_ids?: Json | null
          reassigned_by?: string | null
          reassigned_whatsapp?: string | null
          reassignment_reason?: string | null
          record_id?: string | null
          requirement?: string
          website?: string | null
        }
        Relationships: []
      }
      message_read_receipts: {
        Row: {
          channel_id: string | null
          id: string
          message_id: string | null
          read_at: string
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          id?: string
          message_id?: string | null
          read_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string | null
          id?: string
          message_id?: string | null
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          mention_notifications: boolean
          permission_status: string | null
          sound_enabled: boolean
          task_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mention_notifications?: boolean
          permission_status?: string | null
          sound_enabled?: boolean
          task_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mention_notifications?: boolean
          permission_status?: string | null
          sound_enabled?: boolean
          task_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_entries: {
        Row: {
          comment: string
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          date: string
          id: string
          link: string
          notes: string | null
          platform: string
        }
        Insert: {
          comment: string
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          date: string
          id?: string
          link: string
          notes?: string | null
          platform: string
        }
        Update: {
          comment?: string
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          date?: string
          id?: string
          link?: string
          notes?: string | null
          platform?: string
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
          closed_by_dev: string | null
          created_at: string
          created_by: string | null
          details: Json
          dev_close_response: Json | null
          disapproval_reason: string | null
          id: string
          ops_reason: string | null
          sent_to_ops: boolean | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          actioned_at?: string | null
          actioned_by?: string | null
          assigned_to?: string[] | null
          closed_by_dev?: string | null
          created_at?: string
          created_by?: string | null
          details?: Json
          dev_close_response?: Json | null
          disapproval_reason?: string | null
          id?: string
          ops_reason?: string | null
          sent_to_ops?: boolean | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          actioned_at?: string | null
          actioned_by?: string | null
          assigned_to?: string[] | null
          closed_by_dev?: string | null
          created_at?: string
          created_by?: string | null
          details?: Json
          dev_close_response?: Json | null
          disapproval_reason?: string | null
          id?: string
          ops_reason?: string | null
          sent_to_ops?: boolean | null
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
          team_name: string | null
          trigger_action: string
          user_id: string | null
          user_name: string | null
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
          team_name?: string | null
          trigger_action: string
          user_id?: string | null
          user_name?: string | null
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
          team_name?: string | null
          trigger_action?: string
          user_id?: string | null
          user_name?: string | null
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
        | "awaiting-business"
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
        "awaiting-business",
      ],
      user_role: ["admin", "dev", "ops"],
    },
  },
} as const
