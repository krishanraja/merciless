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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_global_budget: {
        Row: {
          bucket: string
          count: number
          day: string
          updated_at: string
        }
        Insert: {
          bucket: string
          count?: number
          day?: string
          updated_at?: string
        }
        Update: {
          bucket?: string
          count?: number
          day?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_readings: {
        Row: {
          active_transits: Json | null
          brutal_headline: string | null
          created_at: string | null
          id: string
          intensity_level: number | null
          is_free_tier: boolean | null
          planet_focus: string | null
          reading_date: string
          reading_text: string
          shareable_card_data: Json | null
          stoic_actions: Json | null
          user_id: string | null
        }
        Insert: {
          active_transits?: Json | null
          brutal_headline?: string | null
          created_at?: string | null
          id?: string
          intensity_level?: number | null
          is_free_tier?: boolean | null
          planet_focus?: string | null
          reading_date?: string
          reading_text: string
          shareable_card_data?: Json | null
          stoic_actions?: Json | null
          user_id?: string | null
        }
        Update: {
          active_transits?: Json | null
          brutal_headline?: string | null
          created_at?: string | null
          id?: string
          intensity_level?: number | null
          is_free_tier?: boolean | null
          planet_focus?: string | null
          reading_date?: string
          reading_text?: string
          shareable_card_data?: Json | null
          stoic_actions?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      demo_global_budget: {
        Row: {
          count: number
          day: string
          updated_at: string
        }
        Insert: {
          count?: number
          day: string
          updated_at?: string
        }
        Update: {
          count?: number
          day?: string
          updated_at?: string
        }
        Relationships: []
      }
      demo_rate_limit: {
        Row: {
          count: number
          fingerprint: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          fingerprint: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          fingerprint?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      fleet_offer: {
        Row: {
          id: number
          overrides: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          overrides?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          overrides?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_signals: {
        Row: {
          birth_date: string | null
          consented_at: string
          email: string
          id: string
          last_contacted_at: string | null
          mcl_cid: string | null
          source: string
          sun_sign: string | null
          unsubscribe_token: string
          unsubscribed: boolean
        }
        Insert: {
          birth_date?: string | null
          consented_at?: string
          email: string
          id?: string
          last_contacted_at?: string | null
          mcl_cid?: string | null
          source?: string
          sun_sign?: string | null
          unsubscribe_token?: string
          unsubscribed?: boolean
        }
        Update: {
          birth_date?: string | null
          consented_at?: string
          email?: string
          id?: string
          last_contacted_at?: string | null
          mcl_cid?: string | null
          source?: string
          sun_sign?: string | null
          unsubscribe_token?: string
          unsubscribed?: boolean
        }
        Relationships: []
      }
      natal_charts: {
        Row: {
          ascendant: string | null
          aspects: Json
          calculated_at: string | null
          houses: Json
          id: string
          midheaven: string | null
          moon_sign: string | null
          planets: Json
          rising_sign: string | null
          sun_sign: string | null
          user_id: string | null
        }
        Insert: {
          ascendant?: string | null
          aspects: Json
          calculated_at?: string | null
          houses: Json
          id?: string
          midheaven?: string | null
          moon_sign?: string | null
          planets: Json
          rising_sign?: string | null
          sun_sign?: string | null
          user_id?: string | null
        }
        Update: {
          ascendant?: string | null
          aspects?: Json
          calculated_at?: string | null
          houses?: Json
          id?: string
          midheaven?: string | null
          moon_sign?: string | null
          planets?: Json
          rising_sign?: string | null
          sun_sign?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          email_enabled: boolean
          push_enabled: boolean
          transit_alerts: boolean
          unsubscribed: boolean
          updated_at: string
          user_id: string
          utc_offset_minutes: number
        }
        Insert: {
          email_enabled?: boolean
          push_enabled?: boolean
          transit_alerts?: boolean
          unsubscribed?: boolean
          updated_at?: string
          user_id: string
          utc_offset_minutes?: number
        }
        Update: {
          email_enabled?: boolean
          push_enabled?: boolean
          transit_alerts?: boolean
          unsubscribed?: boolean
          updated_at?: string
          user_id?: string
          utc_offset_minutes?: number
        }
        Relationships: []
      }
      oracle_conversations: {
        Row: {
          created_at: string | null
          id: string
          messages: Json
          session_title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json
          session_title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json
          session_title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_verdicts: {
        Row: {
          created_at: string
          excerpt: string | null
          headline: string
          kind: string
          moon_sign: string | null
          rising_sign: string | null
          slug: string
          sun_sign: string | null
        }
        Insert: {
          created_at?: string
          excerpt?: string | null
          headline: string
          kind?: string
          moon_sign?: string | null
          rising_sign?: string | null
          slug: string
          sun_sign?: string | null
        }
        Update: {
          created_at?: string
          excerpt?: string | null
          headline?: string
          kind?: string
          moon_sign?: string | null
          rising_sign?: string | null
          slug?: string
          sun_sign?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stripe_processed_events: {
        Row: {
          event_id: string
          processed_at: string
          type: string | null
        }
        Insert: {
          event_id: string
          processed_at?: string
          type?: string | null
        }
        Update: {
          event_id?: string
          processed_at?: string
          type?: string | null
        }
        Relationships: []
      }
      user_birth_data: {
        Row: {
          birth_date: string
          birth_location: string
          birth_time: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          timezone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          birth_date: string
          birth_location: string
          birth_time?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string
          birth_location?: string
          birth_time?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      api_global_budget_bump: { Args: { p_bucket: string }; Returns: number }
      demo_global_budget_bump: { Args: never; Returns: number }
      demo_rate_limit_bump: {
        Args: { p_fingerprint: string; p_window_seconds?: number }
        Returns: number
      }
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
