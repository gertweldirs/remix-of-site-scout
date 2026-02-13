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
      assets: {
        Row: {
          crawl_run_id: string
          hash: string
          id: string
          size: number
          type: string
          url: string
        }
        Insert: {
          crawl_run_id: string
          hash?: string
          id?: string
          size?: number
          type?: string
          url: string
        }
        Update: {
          crawl_run_id?: string
          hash?: string
          id?: string
          size?: number
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_crawl_run_id_fkey"
            columns: ["crawl_run_id"]
            isOneToOne: false
            referencedRelation: "crawl_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_runs: {
        Row: {
          ended_at: string | null
          errors_count: number
          id: string
          pages_scanned: number
          pages_total: number
          project_id: string
          started_at: string
          status: string
          warnings_count: number
        }
        Insert: {
          ended_at?: string | null
          errors_count?: number
          id?: string
          pages_scanned?: number
          pages_total?: number
          project_id: string
          started_at?: string
          status?: string
          warnings_count?: number
        }
        Update: {
          ended_at?: string | null
          errors_count?: number
          id?: string
          pages_scanned?: number
          pages_total?: number
          project_id?: string
          started_at?: string
          status?: string
          warnings_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "crawl_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          category: string
          crawl_run_id: string
          id: string
          location: string
          message: string
          severity: string
          title: string
          type: string
        }
        Insert: {
          category?: string
          crawl_run_id: string
          id?: string
          location?: string
          message?: string
          severity?: string
          title: string
          type?: string
        }
        Update: {
          category?: string
          crawl_run_id?: string
          id?: string
          location?: string
          message?: string
          severity?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_crawl_run_id_fkey"
            columns: ["crawl_run_id"]
            isOneToOne: false
            referencedRelation: "crawl_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          canonical: string | null
          content_type: string
          crawl_run_id: string
          id: string
          images_count: number
          links_count: number
          meta_description: string
          response_time: number
          scripts_count: number
          status_code: number
          stylesheets_count: number
          title: string
          url: string
        }
        Insert: {
          canonical?: string | null
          content_type?: string
          crawl_run_id: string
          id?: string
          images_count?: number
          links_count?: number
          meta_description?: string
          response_time?: number
          scripts_count?: number
          status_code?: number
          stylesheets_count?: number
          title?: string
          url: string
        }
        Update: {
          canonical?: string | null
          content_type?: string
          crawl_run_id?: string
          id?: string
          images_count?: number
          links_count?: number
          meta_description?: string
          response_time?: number
          scripts_count?: number
          status_code?: number
          stylesheets_count?: number
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_crawl_run_id_fkey"
            columns: ["crawl_run_id"]
            isOneToOne: false
            referencedRelation: "crawl_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          concurrency: number
          crawl_delay: number
          created_at: string
          exclude_patterns: string[]
          follow_redirects: boolean
          id: string
          include_patterns: string[]
          max_depth: number
          max_pages: number
          name: string
          respect_robots: boolean
          same_domain_only: boolean
          start_url: string
          status: string
          user_agent: string
          user_id: string
        }
        Insert: {
          concurrency?: number
          crawl_delay?: number
          created_at?: string
          exclude_patterns?: string[]
          follow_redirects?: boolean
          id?: string
          include_patterns?: string[]
          max_depth?: number
          max_pages?: number
          name: string
          respect_robots?: boolean
          same_domain_only?: boolean
          start_url: string
          status?: string
          user_agent?: string
          user_id: string
        }
        Update: {
          concurrency?: number
          crawl_delay?: number
          created_at?: string
          exclude_patterns?: string[]
          follow_redirects?: boolean
          id?: string
          include_patterns?: string[]
          max_depth?: number
          max_pages?: number
          name?: string
          respect_robots?: boolean
          same_domain_only?: boolean
          start_url?: string
          status?: string
          user_agent?: string
          user_id?: string
        }
        Relationships: []
      }
      search_index_entries: {
        Row: {
          col: number
          context: string
          crawl_run_id: string
          file: string
          id: string
          line: number
          match: string
        }
        Insert: {
          col?: number
          context?: string
          crawl_run_id: string
          file: string
          id?: string
          line?: number
          match?: string
        }
        Update: {
          col?: number
          context?: string
          crawl_run_id?: string
          file?: string
          id?: string
          line?: number
          match?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_index_entries_crawl_run_id_fkey"
            columns: ["crawl_run_id"]
            isOneToOne: false
            referencedRelation: "crawl_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_crawl_run_owner: { Args: { p_run_id: string }; Returns: boolean }
      is_project_owner: { Args: { p_project_id: string }; Returns: boolean }
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
