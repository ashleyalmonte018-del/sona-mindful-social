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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      circle_messages: {
        Row: { id: string; sender_id: string; recipient_id: string; body: string; created_at: string }
        Insert: { id?: string; sender_id: string; recipient_id: string; body: string; created_at?: string }
        Update: { id?: string; sender_id?: string; recipient_id?: string; body?: string; created_at?: string }
        Relationships: []
      }
      match_sessions: {
        Row: { id: string; game: string; host_id: string; guest_id: string | null; state: Json; status: string; created_at: string; updated_at: string }
        Insert: { id?: string; game: string; host_id: string; guest_id?: string | null; state?: Json; status?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; game?: string; host_id?: string; guest_id?: string | null; state?: Json; status?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      match_moves: {
        Row: { id: string; match_id: string; player_id: string; move: Json; created_at: string }
        Insert: { id?: string; match_id: string; player_id: string; move: Json; created_at?: string }
        Update: { id?: string; match_id?: string; player_id?: string; move?: Json; created_at?: string }
        Relationships: []
      }
      circle_tier_members: {
        Row: {
          created_at: string
          id: string
          member_id: string
          owner_id: string
          tier: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          owner_id: string
          tier: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          owner_id?: string
          tier?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          approved_at: string | null
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          id: string
          kind: string
          original: string | null
          rating: number | null
          reframe: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          original?: string | null
          rating?: number | null
          reframe?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          original?: string | null
          rating?: number | null
          reframe?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mood_checkins: {
        Row: {
          created_at: string
          id: string
          mood: string
          note: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood: string
          note?: string | null
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mood?: string
          note?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accent_color: string
          age_mode: string
          avatar_path: string | null
          banner_path: string | null
          bio: string | null
          care_profile: string[]
          created_at: string
          display_name: string
          doodle: string | null
          handle: string | null
          id: string
          is_public: boolean
          parent_passcode_hash: string | null
          private_hides: string
          settings: Json
          sona: Json
          updated_at: string
        }
        Insert: {
          accent_color?: string
          age_mode?: string
          avatar_path?: string | null
          banner_path?: string | null
          bio?: string | null
          care_profile?: string[]
          created_at?: string
          display_name?: string
          doodle?: string | null
          handle?: string | null
          id: string
          is_public?: boolean
          parent_passcode_hash?: string | null
          private_hides?: string
          settings?: Json
          sona?: Json
          updated_at?: string
        }
        Update: {
          accent_color?: string
          age_mode?: string
          avatar_path?: string | null
          banner_path?: string | null
          bio?: string | null
          care_profile?: string[]
          created_at?: string
          display_name?: string
          doodle?: string | null
          handle?: string | null
          id?: string
          is_public?: boolean
          parent_passcode_hash?: string | null
          private_hides?: string
          settings?: Json
          sona?: Json
          updated_at?: string
        }
        Relationships: []
      }
      usage_days: {
        Row: {
          category_seconds: Json
          day: string
          hidden_count: number
          id: string
          seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_seconds?: Json
          day: string
          hidden_count?: number
          id?: string
          seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_seconds?: Json
          day?: string
          hidden_count?: number
          id?: string
          seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_posts: {
        Row: {
          audience: string
          body: string
          category: string
          created_at: string
          disclosure_note: string | null
          disclosures: Json
          id: string
          image_path: string | null
          is_shareable: boolean
          circle_tiers: string[]
          reshared_from: string | null
          shared_by: string | null
          labels: Json
          media_type: string
          topics: string[]
          user_id: string
        }
        Insert: {
          audience?: string
          body?: string
          category?: string
          created_at?: string
          disclosure_note?: string | null
          disclosures?: Json
          id?: string
          image_path?: string | null
          is_shareable?: boolean
          circle_tiers?: string[]
          reshared_from?: string | null
          shared_by?: string | null
          labels?: Json
          media_type?: string
          topics?: string[]
          user_id: string
        }
        Update: {
          audience?: string
          body?: string
          category?: string
          created_at?: string
          disclosure_note?: string | null
          disclosures?: Json
          id?: string
          image_path?: string | null
          is_shareable?: boolean
          circle_tiers?: string[]
          reshared_from?: string | null
          shared_by?: string | null
          labels?: Json
          media_type?: string
          topics?: string[]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      can_view_post: { Args: { _post: Json; _viewer: string }; Returns: boolean }
      can_view_gallery: {
        Args: { _owner: string; _viewer: string }
        Returns: boolean
      }
      circle_sonas: {
        Args: never
        Returns: {
          accent_color: string
          allows_play: boolean
          artist: string
          avatar_path: string
          display_name: string
          handle: string
          id: string
          mood: string
          quiet: boolean
          sona: Json
          song: string
        }[]
      }
      is_approved_follower: {
        Args: { _owner: string; _viewer: string }
        Returns: boolean
      }
      is_public_profile: { Args: { _uid: string }; Returns: boolean }
      join_match: { Args: { _match: string }; Returns: { id: string; game: string; host_id: string; guest_id: string | null; state: Json; status: string; created_at: string; updated_at: string } }
      people_cards: {
        Args: { _ids: string[] }
        Returns: {
          accent_color: string
          avatar_path: string
          display_name: string
          handle: string
          id: string
        }[]
      }
      profile_card: { Args: { _id: string }; Returns: Json }
      share_post: { Args: { _post: string }; Returns: string }
      public_feed_posts: {
        Args: { _limit?: number }
        Returns: {
          audience: string
          body: string
          category: string
          created_at: string
          disclosure_note: string | null
          disclosures: Json
          id: string
          image_path: string | null
          is_shareable: boolean
          labels: Json
          media_type: string
          topics: string[]
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "user_posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reaches_public_feed: {
        Args: { _owner: string; _viewer: string }
        Returns: boolean
      }
      search_profiles: {
        Args: { _q: string }
        Returns: {
          avatar_path: string
          display_name: string
          handle: string
          id: string
          is_public: boolean
        }[]
      }
      followers_list: {
  Args: { _owner: string }
  Returns: {
    id: string
    display_name: string
    handle: string
    avatar_path: string | null
  }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
