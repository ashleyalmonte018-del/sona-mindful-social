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
        Row: {
          body: string
          created_at: string
          id: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          recipient_id?: string
          sender_id?: string
        }
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
      game_results: {
        Row: {
          created_at: string
          game: string
          id: string
          loser_id: string | null
          match_id: string | null
          player_a_id: string
          player_b_id: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          loser_id?: string | null
          match_id?: string | null
          player_a_id: string
          player_b_id: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          loser_id?: string | null
          match_id?: string | null
          player_a_id?: string
          player_b_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      match_sessions: {
        Row: {
          created_at: string
          game: string
          guest_id: string | null
          host_id: string
          id: string
          state: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          game: string
          guest_id?: string | null
          host_id: string
          id?: string
          state?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          game?: string
          guest_id?: string | null
          host_id?: string
          id?: string
          state?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          match_id: string | null
          read_at: string | null
          recipient_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind: string
          match_id?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          match_id?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
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
      post_shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          shared_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          shared_by: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "user_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      send_game_invite_notification: { Args: { _match_id: string }; Returns: boolean }
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
      followers_list: {
        Args: { _owner: string }
        Returns: {
          avatar_path: string
          display_name: string
          handle: string
          id: string
        }[]
      }
      is_approved_follower: {
        Args: { _owner: string; _viewer: string }
        Returns: boolean
      }
      is_public_profile: { Args: { _uid: string }; Returns: boolean }
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
      public_post_link: { Args: { _post: string }; Returns: boolean }
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
      share_post: { Args: { _post: string }; Returns: string }
      shared_feed_posts: {
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
      shared_post_card: { Args: { _post: string }; Returns: Json }
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
