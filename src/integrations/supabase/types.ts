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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          id: string
          threshold: number
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          threshold?: number
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          threshold?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_checks: {
        Row: {
          confidence: string | null
          created_at: string | null
          diff_vs_paid: number | null
          id: string
          observed_price: number | null
          trip_id: string | null
        }
        Insert: {
          confidence?: string | null
          created_at?: string | null
          diff_vs_paid?: number | null
          id?: string
          observed_price?: number | null
          trip_id?: string | null
        }
        Update: {
          confidence?: string | null
          created_at?: string | null
          diff_vs_paid?: number | null
          id?: string
          observed_price?: number | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_checks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      price_signals: {
        Row: {
          confidence: string | null
          created_at: string | null
          diff_vs_paid: number
          id: string
          observed_price: number
          trip_id: string | null
        }
        Insert: {
          confidence?: string | null
          created_at?: string | null
          diff_vs_paid: number
          id?: string
          observed_price: number
          trip_id?: string | null
        }
        Update: {
          confidence?: string | null
          created_at?: string | null
          diff_vs_paid?: number
          id?: string
          observed_price?: number
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_signals_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      reprices: {
        Row: {
          confirmed_credit: number | null
          created_at: string
          evidence_url: string | null
          id: string
          method: string
          preview_credit: number
          trip_id: string
        }
        Insert: {
          confirmed_credit?: number | null
          created_at?: string
          evidence_url?: string | null
          id?: string
          method: string
          preview_credit: number
          trip_id: string
        }
        Update: {
          confirmed_credit?: number | null
          created_at?: string
          evidence_url?: string | null
          id?: string
          method?: string
          preview_credit?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reprices_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_logs: {
        Row: {
          created_at: string
          data_snippet: string | null
          id: string
          message: string | null
          ms: number | null
          ok: boolean
          stage: string
          trace_id: string
          trip_id: string | null
        }
        Insert: {
          created_at?: string
          data_snippet?: string | null
          id?: string
          message?: string | null
          ms?: number | null
          ok?: boolean
          stage: string
          trace_id: string
          trip_id?: string | null
        }
        Update: {
          created_at?: string
          data_snippet?: string | null
          id?: string
          message?: string | null
          ms?: number | null
          ok?: boolean
          stage?: string
          trace_id?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_logs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          aircraft: string | null
          arrive_airport: string
          arrive_datetime: string
          arrive_gate: string | null
          arrive_terminal: string | null
          carrier: string
          created_at: string
          depart_airport: string
          depart_datetime: string
          depart_gate: string | null
          depart_terminal: string | null
          flight_number: string
          id: string
          is_change_of_plane: boolean | null
          layover_duration_minutes: number | null
          segment_index: number | null
          status: string | null
          trip_id: string
        }
        Insert: {
          aircraft?: string | null
          arrive_airport: string
          arrive_datetime: string
          arrive_gate?: string | null
          arrive_terminal?: string | null
          carrier: string
          created_at?: string
          depart_airport: string
          depart_datetime: string
          depart_gate?: string | null
          depart_terminal?: string | null
          flight_number: string
          id?: string
          is_change_of_plane?: boolean | null
          layover_duration_minutes?: number | null
          segment_index?: number | null
          status?: string | null
          trip_id: string
        }
        Update: {
          aircraft?: string | null
          arrive_airport?: string
          arrive_datetime?: string
          arrive_gate?: string | null
          arrive_terminal?: string | null
          carrier?: string
          created_at?: string
          depart_airport?: string
          depart_datetime?: string
          depart_gate?: string | null
          depart_terminal?: string | null
          flight_number?: string
          id?: string
          is_change_of_plane?: boolean | null
          layover_duration_minutes?: number | null
          segment_index?: number | null
          status?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          adults: number | null
          airline: string
          brand: string | null
          cabin: string | null
          confirmation_code: string
          created_at: string
          currency: string
          deleted_at: string | null
          depart_date: string | null
          departure_date: string | null
          destination_iata: string | null
          eticket_number: string | null
          fare_class: string | null
          first_name: string | null
          flight_numbers: string[] | null
          full_route: string | null
          id: string
          is_refundable: boolean | null
          last_checked_at: string | null
          last_confidence: string | null
          last_name: string
          last_public_currency: string | null
          last_public_price: number | null
          last_public_provider: string | null
          last_signal_at: string | null
          last_signal_price: number | null
          loyalty_status: string | null
          monitor_frequency_minutes: number | null
          monitor_threshold: number | null
          monitoring_enabled: boolean | null
          next_check_at: string | null
          notes: string | null
          origin_iata: string | null
          paid_total: number
          price_mode: string | null
          rbd: string | null
          return_date: string | null
          route_display: string | null
          status: string
          ticket_expiration: string | null
          ticket_number: string | null
          total_duration_minutes: number | null
          travel_dates_display: string | null
          trip_type: string | null
          user_id: string
        }
        Insert: {
          adults?: number | null
          airline: string
          brand?: string | null
          cabin?: string | null
          confirmation_code: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          depart_date?: string | null
          departure_date?: string | null
          destination_iata?: string | null
          eticket_number?: string | null
          fare_class?: string | null
          first_name?: string | null
          flight_numbers?: string[] | null
          full_route?: string | null
          id?: string
          is_refundable?: boolean | null
          last_checked_at?: string | null
          last_confidence?: string | null
          last_name: string
          last_public_currency?: string | null
          last_public_price?: number | null
          last_public_provider?: string | null
          last_signal_at?: string | null
          last_signal_price?: number | null
          loyalty_status?: string | null
          monitor_frequency_minutes?: number | null
          monitor_threshold?: number | null
          monitoring_enabled?: boolean | null
          next_check_at?: string | null
          notes?: string | null
          origin_iata?: string | null
          paid_total: number
          price_mode?: string | null
          rbd?: string | null
          return_date?: string | null
          route_display?: string | null
          status?: string
          ticket_expiration?: string | null
          ticket_number?: string | null
          total_duration_minutes?: number | null
          travel_dates_display?: string | null
          trip_type?: string | null
          user_id: string
        }
        Update: {
          adults?: number | null
          airline?: string
          brand?: string | null
          cabin?: string | null
          confirmation_code?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          depart_date?: string | null
          departure_date?: string | null
          destination_iata?: string | null
          eticket_number?: string | null
          fare_class?: string | null
          first_name?: string | null
          flight_numbers?: string[] | null
          full_route?: string | null
          id?: string
          is_refundable?: boolean | null
          last_checked_at?: string | null
          last_confidence?: string | null
          last_name?: string
          last_public_currency?: string | null
          last_public_price?: number | null
          last_public_provider?: string | null
          last_signal_at?: string | null
          last_signal_price?: number | null
          loyalty_status?: string | null
          monitor_frequency_minutes?: number | null
          monitor_threshold?: number | null
          monitoring_enabled?: boolean | null
          next_check_at?: string | null
          notes?: string | null
          origin_iata?: string | null
          paid_total?: number
          price_mode?: string | null
          rbd?: string | null
          return_date?: string | null
          route_display?: string | null
          status?: string
          ticket_expiration?: string | null
          ticket_number?: string | null
          total_duration_minutes?: number | null
          travel_dates_display?: string | null
          trip_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          digest_cadence: string | null
          email_alerts_enabled: boolean | null
          min_drop_threshold: number | null
          monitor_frequency_minutes: number | null
          monitor_mode: string | null
          timezone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          digest_cadence?: string | null
          email_alerts_enabled?: boolean | null
          min_drop_threshold?: number | null
          monitor_frequency_minutes?: number | null
          monitor_mode?: string | null
          timezone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          digest_cadence?: string | null
          email_alerts_enabled?: boolean | null
          min_drop_threshold?: number | null
          monitor_frequency_minutes?: number | null
          monitor_mode?: string | null
          timezone?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
