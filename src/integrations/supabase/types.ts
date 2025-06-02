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
      activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          id: string
          lead_id: string
          outcome: string | null
          performed_at: string
          performed_by_user_id: string
          performed_by_user_name: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          id?: string
          lead_id: string
          outcome?: string | null
          performed_at?: string
          performed_by_user_id: string
          performed_by_user_name?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          id?: string
          lead_id?: string
          outcome?: string | null
          performed_at?: string
          performed_by_user_id?: string
          performed_by_user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_activities_lead_id"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_activities_user"
            columns: ["performed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions_log: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          posts_affected: number | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          posts_affected?: number | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          posts_affected?: number | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      apify_webhook_stats: {
        Row: {
          after_deduplication: number
          after_person_filter: number
          after_repost_filter: number
          after_required_fields_filter: number
          completed_at: string | null
          created_at: string
          dataset_id: string
          id: string
          processing_errors: number
          started_at: string
          stored_raw: number
          successfully_inserted: number
          total_received: number
        }
        Insert: {
          after_deduplication?: number
          after_person_filter?: number
          after_repost_filter?: number
          after_required_fields_filter?: number
          completed_at?: string | null
          created_at?: string
          dataset_id: string
          id?: string
          processing_errors?: number
          started_at: string
          stored_raw?: number
          successfully_inserted?: number
          total_received?: number
        }
        Update: {
          after_deduplication?: number
          after_person_filter?: number
          after_repost_filter?: number
          after_required_fields_filter?: number
          completed_at?: string | null
          created_at?: string
          dataset_id?: string
          id?: string
          processing_errors?: number
          started_at?: string
          stored_raw?: number
          successfully_inserted?: number
          total_received?: number
        }
        Relationships: []
      }
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
      client_job_offers: {
        Row: {
          apify_dataset_id: string
          assigned_at: string | null
          assigned_to_user_id: string | null
          company_name: string | null
          created_at: string
          description: string | null
          id: string
          job_type: string | null
          location: string | null
          matched_client_id: string | null
          matched_client_name: string | null
          posted_at: string | null
          raw_data: Json
          salary: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          apify_dataset_id: string
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_type?: string | null
          location?: string | null
          matched_client_id?: string | null
          matched_client_name?: string | null
          posted_at?: string | null
          raw_data: Json
          salary?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          apify_dataset_id?: string
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_type?: string | null
          location?: string | null
          matched_client_id?: string | null
          matched_client_name?: string | null
          posted_at?: string | null
          raw_data?: Json
          salary?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_job_offers_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_job_offers_matched_client_id_fkey"
            columns: ["matched_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          tier: string | null
          tracking_enabled: boolean
          updated_at: string
        }
        Insert: {
          company_linkedin_id?: string | null
          company_linkedin_url?: string | null
          company_name: string
          created_at?: string
          id?: string
          tier?: string | null
          tracking_enabled?: boolean
          updated_at?: string
        }
        Update: {
          company_linkedin_id?: string | null
          company_linkedin_url?: string | null
          company_name?: string
          created_at?: string
          id?: string
          tier?: string | null
          tracking_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          company_size: string | null
          created_at: string
          description: string | null
          follower_count: number | null
          headquarters: string | null
          id: string
          industry: string | null
          last_updated_at: string
          linkedin_id: string
          name: string | null
          unipile_data: Json | null
          website: string | null
        }
        Insert: {
          company_size?: string | null
          created_at?: string
          description?: string | null
          follower_count?: number | null
          headquarters?: string | null
          id?: string
          industry?: string | null
          last_updated_at?: string
          linkedin_id: string
          name?: string | null
          unipile_data?: Json | null
          website?: string | null
        }
        Update: {
          company_size?: string | null
          created_at?: string
          description?: string | null
          follower_count?: number | null
          headquarters?: string | null
          id?: string
          industry?: string | null
          last_updated_at?: string
          linkedin_id?: string
          name?: string | null
          unipile_data?: Json | null
          website?: string | null
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
            foreignKeyName: "fk_lead_assignments_assigned_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lead_assignments_lead_id"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
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
      leads: {
        Row: {
          approach_message: string | null
          approach_message_generated: boolean | null
          approach_message_generated_at: string | null
          author_headline: string | null
          author_name: string | null
          author_profile_id: string
          author_profile_url: string | null
          company_id: string | null
          company_linkedin_id: string | null
          company_name: string | null
          company_position: string | null
          created_at: string
          id: string
          is_client_lead: boolean | null
          last_contact_at: string | null
          last_updated_at: string | null
          latest_post_date: string | null
          latest_post_url: string | null
          latest_post_urn: string | null
          linkedin_message_sent_at: string | null
          matched_client_id: string | null
          matched_client_name: string | null
          openai_step2_localisation: string | null
          openai_step3_categorie: string | null
          openai_step3_justification: string | null
          openai_step3_postes_selectionnes: string[] | null
          phone_contact_at: string | null
          phone_contact_by_user_id: string | null
          phone_contact_by_user_name: string | null
          phone_contact_status: string | null
          phone_number: string | null
          phone_retrieved_at: string | null
          posted_at_iso: string | null
          posted_at_timestamp: number | null
          processing_status: string | null
          text: string | null
          title: string | null
          unipile_company: string | null
          unipile_company_linkedin_id: string | null
          unipile_position: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          approach_message?: string | null
          approach_message_generated?: boolean | null
          approach_message_generated_at?: string | null
          author_headline?: string | null
          author_name?: string | null
          author_profile_id: string
          author_profile_url?: string | null
          company_id?: string | null
          company_linkedin_id?: string | null
          company_name?: string | null
          company_position?: string | null
          created_at?: string
          id?: string
          is_client_lead?: boolean | null
          last_contact_at?: string | null
          last_updated_at?: string | null
          latest_post_date?: string | null
          latest_post_url?: string | null
          latest_post_urn?: string | null
          linkedin_message_sent_at?: string | null
          matched_client_id?: string | null
          matched_client_name?: string | null
          openai_step2_localisation?: string | null
          openai_step3_categorie?: string | null
          openai_step3_justification?: string | null
          openai_step3_postes_selectionnes?: string[] | null
          phone_contact_at?: string | null
          phone_contact_by_user_id?: string | null
          phone_contact_by_user_name?: string | null
          phone_contact_status?: string | null
          phone_number?: string | null
          phone_retrieved_at?: string | null
          posted_at_iso?: string | null
          posted_at_timestamp?: number | null
          processing_status?: string | null
          text?: string | null
          title?: string | null
          unipile_company?: string | null
          unipile_company_linkedin_id?: string | null
          unipile_position?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          approach_message?: string | null
          approach_message_generated?: boolean | null
          approach_message_generated_at?: string | null
          author_headline?: string | null
          author_name?: string | null
          author_profile_id?: string
          author_profile_url?: string | null
          company_id?: string | null
          company_linkedin_id?: string | null
          company_name?: string | null
          company_position?: string | null
          created_at?: string
          id?: string
          is_client_lead?: boolean | null
          last_contact_at?: string | null
          last_updated_at?: string | null
          latest_post_date?: string | null
          latest_post_url?: string | null
          latest_post_urn?: string | null
          linkedin_message_sent_at?: string | null
          matched_client_id?: string | null
          matched_client_name?: string | null
          openai_step2_localisation?: string | null
          openai_step3_categorie?: string | null
          openai_step3_justification?: string | null
          openai_step3_postes_selectionnes?: string[] | null
          phone_contact_at?: string | null
          phone_contact_by_user_id?: string | null
          phone_contact_by_user_name?: string | null
          phone_contact_status?: string | null
          phone_number?: string | null
          phone_retrieved_at?: string | null
          posted_at_iso?: string | null
          posted_at_timestamp?: number | null
          processing_status?: string | null
          text?: string | null
          title?: string | null
          unipile_company?: string | null
          unipile_company_linkedin_id?: string | null
          unipile_position?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_matched_client_id_fkey"
            columns: ["matched_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          first_name: string | null
          id: string
          last_name: string | null
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
          first_name?: string | null
          id?: string
          last_name?: string | null
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
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_update?: string | null
          linkedin_profile_url?: string | null
          status?: string | null
          unipile_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_messages: {
        Row: {
          account_used: string | null
          created_at: string
          id: string
          lead_id: string
          message_content: string
          message_type: string
          network_distance: string | null
          provider_id: string | null
          sender_full_name: string | null
          sender_id: string | null
          sent_at: string
          sent_by_user_id: string
          unipile_response: Json | null
          updated_at: string
        }
        Insert: {
          account_used?: string | null
          created_at?: string
          id?: string
          lead_id: string
          message_content: string
          message_type: string
          network_distance?: string | null
          provider_id?: string | null
          sender_full_name?: string | null
          sender_id?: string | null
          sent_at?: string
          sent_by_user_id: string
          unipile_response?: Json | null
          updated_at?: string
        }
        Update: {
          account_used?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          message_content?: string
          message_type?: string
          network_distance?: string | null
          provider_id?: string | null
          sender_full_name?: string | null
          sender_id?: string | null
          sent_at?: string
          sent_by_user_id?: string
          unipile_response?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_linkedin_messages_lead_id"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_linkedin_messages_sent_by_user_id"
            columns: ["sent_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "linkedin_posts"
            referencedColumns: ["id"]
          },
        ]
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
          last_retry_at: string | null
          last_updated_at: string | null
          lead_id: string | null
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
          phone_contact_by_user_id: string | null
          phone_contact_by_user_name: string | null
          phone_contact_status: string | null
          phone_number: string | null
          phone_retrieved_at: string | null
          posted_at_iso: string | null
          posted_at_timestamp: number | null
          processing_status: string | null
          raw_data: Json
          retry_count: number | null
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
          last_retry_at?: string | null
          last_updated_at?: string | null
          lead_id?: string | null
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
          phone_contact_by_user_id?: string | null
          phone_contact_by_user_name?: string | null
          phone_contact_status?: string | null
          phone_number?: string | null
          phone_retrieved_at?: string | null
          posted_at_iso?: string | null
          posted_at_timestamp?: number | null
          processing_status?: string | null
          raw_data: Json
          retry_count?: number | null
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
          last_retry_at?: string | null
          last_updated_at?: string | null
          lead_id?: string | null
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
          phone_contact_by_user_id?: string | null
          phone_contact_by_user_name?: string | null
          phone_contact_status?: string | null
          phone_number?: string | null
          phone_retrieved_at?: string | null
          posted_at_iso?: string | null
          posted_at_timestamp?: number | null
          processing_status?: string | null
          raw_data?: Json
          retry_count?: number | null
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
        Relationships: [
          {
            foreignKeyName: "linkedin_posts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_posts_phone_contact_by_user_id_fkey"
            columns: ["phone_contact_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_posts_raw: {
        Row: {
          apify_dataset_id: string
          author_headline: string | null
          author_name: string | null
          author_profile_id: string | null
          author_profile_url: string | null
          author_type: string | null
          created_at: string
          id: string
          is_repost: boolean | null
          posted_at_iso: string | null
          posted_at_timestamp: number | null
          raw_data: Json
          text: string | null
          title: string | null
          updated_at: string
          url: string
          urn: string
        }
        Insert: {
          apify_dataset_id: string
          author_headline?: string | null
          author_name?: string | null
          author_profile_id?: string | null
          author_profile_url?: string | null
          author_type?: string | null
          created_at?: string
          id?: string
          is_repost?: boolean | null
          posted_at_iso?: string | null
          posted_at_timestamp?: number | null
          raw_data: Json
          text?: string | null
          title?: string | null
          updated_at?: string
          url: string
          urn: string
        }
        Update: {
          apify_dataset_id?: string
          author_headline?: string | null
          author_name?: string | null
          author_profile_id?: string | null
          author_profile_url?: string | null
          author_type?: string | null
          created_at?: string
          id?: string
          is_repost?: boolean | null
          posted_at_iso?: string | null
          posted_at_timestamp?: number | null
          raw_data?: Json
          text?: string | null
          title?: string | null
          updated_at?: string
          url?: string
          urn?: string
        }
        Relationships: []
      }
      mistargeted_posts: {
        Row: {
          author_name: string | null
          author_profile_url: string | null
          created_at: string
          id: string
          lead_id: string
          reason: string | null
          reported_by_user_id: string
          reported_by_user_name: string | null
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          author_profile_url?: string | null
          created_at?: string
          id?: string
          lead_id: string
          reason?: string | null
          reported_by_user_id: string
          reported_by_user_name?: string | null
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          author_profile_url?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          reason?: string | null
          reported_by_user_id?: string
          reported_by_user_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistargeted_posts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      openai_prompts: {
        Row: {
          created_at: string
          id: string
          prompt: string
          step: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          step: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          step?: number
          updated_at?: string
        }
        Relationships: []
      }
      processing_metrics_hourly: {
        Row: {
          avg_processing_time_minutes: number | null
          created_at: string
          duplicate_rate: number
          error_rate: number
          hour_timestamp: string
          id: string
          median_processing_time_minutes: number | null
          message_pending: number
          posts_completed: number
          posts_failed: number
          posts_in_processing: number
          recorded_at: string
          step1_conversion_rate: number
          step1_passed: number
          step1_pending: number
          step1_total: number
          step2_conversion_rate: number
          step2_passed: number
          step2_pending: number
          step2_total: number
          step3_conversion_rate: number
          step3_passed: number
          step3_pending: number
          step3_total: number
          total_posts_processed: number
          unipile_pending: number
        }
        Insert: {
          avg_processing_time_minutes?: number | null
          created_at?: string
          duplicate_rate?: number
          error_rate?: number
          hour_timestamp: string
          id?: string
          median_processing_time_minutes?: number | null
          message_pending?: number
          posts_completed?: number
          posts_failed?: number
          posts_in_processing?: number
          recorded_at?: string
          step1_conversion_rate?: number
          step1_passed?: number
          step1_pending?: number
          step1_total?: number
          step2_conversion_rate?: number
          step2_passed?: number
          step2_pending?: number
          step2_total?: number
          step3_conversion_rate?: number
          step3_passed?: number
          step3_pending?: number
          step3_total?: number
          total_posts_processed?: number
          unipile_pending?: number
        }
        Update: {
          avg_processing_time_minutes?: number | null
          created_at?: string
          duplicate_rate?: number
          error_rate?: number
          hour_timestamp?: string
          id?: string
          median_processing_time_minutes?: number | null
          message_pending?: number
          posts_completed?: number
          posts_failed?: number
          posts_in_processing?: number
          recorded_at?: string
          step1_conversion_rate?: number
          step1_passed?: number
          step1_pending?: number
          step1_total?: number
          step2_conversion_rate?: number
          step2_passed?: number
          step2_pending?: number
          step2_total?: number
          step3_conversion_rate?: number
          step3_passed?: number
          step3_pending?: number
          step3_total?: number
          total_posts_processed?: number
          unipile_pending?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          unipile_account_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          unipile_account_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          unipile_account_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          creator_user_id: string
          due_date: string | null
          id: string
          lead_id: string
          message: string
          read: boolean
          target_user_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_user_id: string
          due_date?: string | null
          id?: string
          lead_id: string
          message: string
          read?: boolean
          target_user_id: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_user_id?: string
          due_date?: string | null
          id?: string
          lead_id?: string
          message?: string
          read?: boolean
          target_user_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reminders_lead_id"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reminders_target_user"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      collect_processing_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_hourly_processing_breakdown: {
        Args: { target_date: string }
        Returns: {
          hour_timestamp: string
          total_posts: number
          raw_posts: number
          filtered_posts: number
          completed_posts: number
          failed_posts: number
          pending_posts: number
        }[]
      }
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
