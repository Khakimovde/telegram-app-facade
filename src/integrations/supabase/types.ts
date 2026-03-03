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
      ad_watch_log: {
        Row: {
          id: string
          slot_key: string
          type: string
          user_id: string
          watched_at: string
        }
        Insert: {
          id?: string
          slot_key: string
          type: string
          user_id: string
          watched_at?: string
        }
        Update: {
          id?: string
          slot_key?: string
          type?: string
          user_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_watch_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      auction_entries: {
        Row: {
          created_at: string
          hour_key: string
          id: string
          tickets: number
          user_id: string
        }
        Insert: {
          created_at?: string
          hour_key: string
          id?: string
          tickets: number
          user_id: string
        }
        Update: {
          created_at?: string
          hour_key?: string
          id?: string
          tickets?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_results: {
        Row: {
          created_at: string
          hour_key: string
          id: string
          prize: number
          tickets_used: number
          user_id: string
          won: boolean
        }
        Insert: {
          created_at?: string
          hour_key: string
          id?: string
          prize?: number
          tickets_used: number
          user_id: string
          won?: boolean
        }
        Update: {
          created_at?: string
          hour_key?: string
          id?: string
          prize?: number
          tickets_used?: number
          user_id?: string
          won?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "auction_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_tasks: {
        Row: {
          id: string
          is_active: boolean
          name: string
          reward: number
          username: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          reward?: number
          username: string
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          reward?: number
          username?: string
        }
        Relationships: []
      }
      team_game_players: {
        Row: {
          ads_watched: number
          created_at: string
          id: string
          prize: number
          round_id: string
          team: string
          user_id: string
        }
        Insert: {
          ads_watched?: number
          created_at?: string
          id?: string
          prize?: number
          round_id: string
          team: string
          user_id: string
        }
        Update: {
          ads_watched?: number
          created_at?: string
          id?: string
          prize?: number
          round_id?: string
          team?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_game_players_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "team_game_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      team_game_rounds: {
        Row: {
          blue_ads: number
          blue_prize: number
          ended_at: string | null
          id: string
          red_ads: number
          red_prize: number
          started_at: string
          status: string
          winning_team: string | null
        }
        Insert: {
          blue_ads?: number
          blue_prize?: number
          ended_at?: string | null
          id?: string
          red_ads?: number
          red_prize?: number
          started_at?: string
          status?: string
          winning_team?: string | null
        }
        Update: {
          blue_ads?: number
          blue_prize?: number
          ended_at?: string | null
          id?: string
          red_ads?: number
          red_prize?: number
          started_at?: string
          status?: string
          winning_team?: string | null
        }
        Relationships: []
      }
      user_channel_completions: {
        Row: {
          channel_task_id: string
          completed_at: string
          id: string
          user_id: string
        }
        Insert: {
          channel_task_id: string
          completed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          channel_task_id?: string
          completed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_channel_completions_channel_task_id_fkey"
            columns: ["channel_task_id"]
            isOneToOne: false
            referencedRelation: "channel_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_channel_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ads_watched_total: number
          auction_wins: number
          balance: number
          bonus_balance: number
          created_at: string
          id: string
          is_admin: boolean
          level: number
          name: string
          photo_url: string | null
          referral_count: number
          referral_earnings: number
          referred_by: string | null
          tickets: number
          username: string
        }
        Insert: {
          ads_watched_total?: number
          auction_wins?: number
          balance?: number
          bonus_balance?: number
          created_at?: string
          id: string
          is_admin?: boolean
          level?: number
          name?: string
          photo_url?: string | null
          referral_count?: number
          referral_earnings?: number
          referred_by?: string | null
          tickets?: number
          username?: string
        }
        Update: {
          ads_watched_total?: number
          auction_wins?: number
          balance?: number
          bonus_balance?: number
          created_at?: string
          id?: string
          is_admin?: boolean
          level?: number
          name?: string
          photo_url?: string | null
          referral_count?: number
          referral_earnings?: number
          referred_by?: string | null
          tickets?: number
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      withdraw_requests: {
        Row: {
          card: string
          created_at: string
          id: string
          reason: string | null
          som: number
          status: string
          tanga: number
          user_id: string
        }
        Insert: {
          card: string
          created_at?: string
          id?: string
          reason?: string | null
          som: number
          status?: string
          tanga: number
          user_id: string
        }
        Update: {
          card?: string
          created_at?: string
          id?: string
          reason?: string | null
          som?: number
          status?: string
          tanga?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdraw_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      increment_referral: { Args: { referrer_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
