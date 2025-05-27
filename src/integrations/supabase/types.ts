export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      client_collaborators: {
        Row: {
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_collaborators_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_client_collaborators_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_client_collaborators_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_linkedin_id: string | null
          company_linkedin_url: string | null
          company_name: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          company_linkedin_id?: string | null
          company_linkedin_url?: string | null
          company_name: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          company_linkedin_id?: string | null
          company_linkedin_url?: string | null
          company_name?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_providers: {
        Row: {
          company_linkedin_id: string | null
          company_linkedin_url: string | null
          company_name: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          company_linkedin_id?: string | null
          company_linkedin_url?: string | null
          company_name: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          company_linkedin_id?: string | null
          company_linkedin_url?: string | null
          company_name?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "linkedin_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_connections: {
        Row: {
          account_id: string | null
          account_type: string | null
          connected_at: string | null
          connection_status: string
          created_at: string
          error_message: string | null
          id: string
          last_update: string | null
          linkedin_profile_url: string | null
          status: string | null
          unipile_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_type?: string | null
          connected_at?: string | null
          connection_status?: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_update?: string | null
          linkedin_profile_url?: string | null
          status?: string | null
          unipile_account_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_type?: string | null
          connected_at?: string | null
          connection_status?: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_update?: string | null
          linkedin_profile_url?: string | null
          status?: string | null
          unipile_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_posts: {
        Row: {
          apify_dataset_id: string
          approach_message: string | null
          approach_message_error: string | null
          approach_message_generated: boolean | null
          approach_message_generated_at: string | null
          author_headline: string | null
          author_name: string | null
          author_profile_id: string | null
          author_profile_url: string
          author_type: string
          created_at: string | null
          id: string
          is_client_lead: boolean | null
          last_contact_at: string | null
          linkedin_message_sent_at: string | null
          matched_client_id: string | null
          matched_client_name: string | null
          openai_step1_postes: string | null
          openai_step1_recrute_poste: string | null
          openai_step1_response: Json | null
          openai_step2_langue: string | null
          openai_step2_localisation: string | null
          openai_step2_raison: string | null
          openai_step2_reponse: string | null
          openai_step2_response: Json | null
          openai_step3_categorie: string | null
          openai_step3_justification: string | null
          openai_step3_postes_selectionnes: string[] | null
          openai_step3_response: Json | null
          phone_contact_at: string | null
          phone_contact_status: string | null
          phone_number: string | null
          phone_retrieved_at: string | null
          posted_at_iso: string | null
          posted_at_timestamp: number | null
          processing_status: string | null
          raw_data: Json
          text: string
          title: string | null
          unipile_company: string | null
          unipile_company_linkedin_id: string | null
          unipile_position: string | null
          unipile_profile_scraped: boolean | null
          unipile_profile_scraped_at: string | null
          unipile_response: Json | null
          updated_at: string | null
          url: string
          urn: string
        }
        Insert: {
          apify_dataset_id: string
          approach_message?: string | null
          approach_message_error?: string | null
          approach_message_generated?: boolean | null
          approach_message_generated_at?: string | null
          author_headline?: string | null
          author_name?: string | null
          author_profile_id?: string | null
          author_profile_url: string
          author_type: string
          created_at?: string | null
          id?: string
          is_client_lead?: boolean | null
          last_contact_at?: string | null
          linkedin_message_sent_at?: string | null
          matched_client_id?: string | null
          matched_client_name?: string | null
          openai_step1_postes?: string | null
          openai_step1_recrute_poste?: string | null
          openai_step1_response?: Json | null
          openai_step2_langue?: string | null
          openai_step2_localisation?: string | null
          openai_step2_raison?: string | null
          openai_step2_reponse?: string | null
          openai_step2_response?: Json | null
          openai_step3_categorie?: string | null
          openai_step3_justification?: string | null
          openai_step3_postes_selectionnes?: string[] | null
          openai_step3_response?: Json | null
          phone_contact_at?: string | null
          phone_contact_status?: string | null
          phone_number?: string | null
          phone_retrieved_at?: string | null
          posted_at_iso?: string | null
          posted_at_timestamp?: number | null
          processing_status?: string | null
          raw_data: Json
          text: string
          title?: string | null
          unipile_company?: string | null
          unipile_company_linkedin_id?: string | null
          unipile_position?: string | null
          unipile_profile_scraped?: boolean | null
          unipile_profile_scraped_at?: string | null
          unipile_response?: Json | null
          updated_at?: string | null
          url: string
          urn: string
        }
        Update: {
          apify_dataset_id?: string
          approach_message?: string | null
          approach_message_error?: string | null
          approach_message_generated?: boolean | null
          approach_message_generated_at?: string | null
          author_headline?: string | null
          author_name?: string | null
          author_profile_id?: string | null
          author_profile_url?: string
          author_type?: string
          created_at?: string | null
          id?: string
          is_client_lead?: boolean | null
          last_contact_at?: string | null
          linkedin_message_sent_at?: string | null
          matched_client_id?: string | null
          matched_client_name?: string | null
          openai_step1_postes?: string | null
          openai_step1_recrute_poste?: string | null
          openai_step1_response?: Json | null
          openai_step2_langue?: string | null
          openai_step2_localisation?: string | null
          openai_step2_raison?: string | null
          openai_step2_reponse?: string | null
          openai_step2_response?: Json | null
          openai_step3_categorie?: string | null
          openai_step3_justification?: string | null
          openai_step3_postes_selectionnes?: string[] | null
          openai_step3_response?: Json | null
          phone_contact_at?: string | null
          phone_contact_status?: string | null
          phone_number?: string | null
          phone_retrieved_at?: string | null
          posted_at_iso?: string | null
          posted_at_timestamp?: number | null
          processing_status?: string | null
          raw_data?: Json
          text?: string
          title?: string | null
          unipile_company?: string | null
          unipile_company_linkedin_id?: string | null
          unipile_position?: string | null
          unipile_profile_scraped?: boolean | null
          unipile_profile_scraped_at?: string | null
          unipile_response?: Json | null
          updated_at?: string | null
          url?: string
          urn?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          created_at: string
          id: string
          linkedin_messages_sent: number
          negative_calls: number
          positive_calls: number
          stat_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linkedin_messages_sent?: number
          negative_calls?: number
          positive_calls?: number
          stat_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linkedin_messages_sent?: number
          negative_calls?: number
          positive_calls?: number
          stat_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_linkedin_messages: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      increment_negative_calls: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      increment_positive_calls: {
        Args: { user_uuid: string }
        Returns: undefined
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
