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
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource: string | null
          resource_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          resource_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          resource_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          alert_email: string | null
          alert_enabled: boolean | null
          alert_threshold: number | null
          api_sync_cron_hour: string | null
          api_sync_cron_minute: string | null
          api_sync_default_frequency: string | null
          api_sync_enabled: boolean | null
          auto_play_audio: boolean | null
          chat_audio_enabled: boolean | null
          created_at: string | null
          daily_report_enabled: boolean | null
          doc_sync_alert_email: string | null
          doc_sync_time: string | null
          email_global_enabled: boolean | null
          gmail_api_configured: boolean | null
          gmail_notification_email: string | null
          id: string
          last_scheduled_scan: string | null
          last_scheduler_error: string | null
          last_security_scan: string | null
          ml_accuracy_alert_email: string | null
          ml_accuracy_alert_enabled: boolean | null
          ml_accuracy_last_alert: string | null
          ml_accuracy_threshold: number | null
          monthly_report_enabled: boolean | null
          security_alert_email: string | null
          security_alert_threshold: string | null
          security_scan_enabled: boolean | null
          sms_as_fallback: boolean | null
          sms_enabled: boolean | null
          twilio_sms_number: string | null
          updated_at: string | null
          vimeo_history_url: string | null
          weekly_report_enabled: boolean | null
          whatsapp_global_enabled: boolean | null
          whatsapp_target_phone: string | null
        }
        Insert: {
          alert_email?: string | null
          alert_enabled?: boolean | null
          alert_threshold?: number | null
          api_sync_cron_hour?: string | null
          api_sync_cron_minute?: string | null
          api_sync_default_frequency?: string | null
          api_sync_enabled?: boolean | null
          auto_play_audio?: boolean | null
          chat_audio_enabled?: boolean | null
          created_at?: string | null
          daily_report_enabled?: boolean | null
          doc_sync_alert_email?: string | null
          doc_sync_time?: string | null
          email_global_enabled?: boolean | null
          gmail_api_configured?: boolean | null
          gmail_notification_email?: string | null
          id?: string
          last_scheduled_scan?: string | null
          last_scheduler_error?: string | null
          last_security_scan?: string | null
          ml_accuracy_alert_email?: string | null
          ml_accuracy_alert_enabled?: boolean | null
          ml_accuracy_last_alert?: string | null
          ml_accuracy_threshold?: number | null
          monthly_report_enabled?: boolean | null
          security_alert_email?: string | null
          security_alert_threshold?: string | null
          security_scan_enabled?: boolean | null
          sms_as_fallback?: boolean | null
          sms_enabled?: boolean | null
          twilio_sms_number?: string | null
          updated_at?: string | null
          vimeo_history_url?: string | null
          weekly_report_enabled?: boolean | null
          whatsapp_global_enabled?: boolean | null
          whatsapp_target_phone?: string | null
        }
        Update: {
          alert_email?: string | null
          alert_enabled?: boolean | null
          alert_threshold?: number | null
          api_sync_cron_hour?: string | null
          api_sync_cron_minute?: string | null
          api_sync_default_frequency?: string | null
          api_sync_enabled?: boolean | null
          auto_play_audio?: boolean | null
          chat_audio_enabled?: boolean | null
          created_at?: string | null
          daily_report_enabled?: boolean | null
          doc_sync_alert_email?: string | null
          doc_sync_time?: string | null
          email_global_enabled?: boolean | null
          gmail_api_configured?: boolean | null
          gmail_notification_email?: string | null
          id?: string
          last_scheduled_scan?: string | null
          last_scheduler_error?: string | null
          last_security_scan?: string | null
          ml_accuracy_alert_email?: string | null
          ml_accuracy_alert_enabled?: boolean | null
          ml_accuracy_last_alert?: string | null
          ml_accuracy_threshold?: number | null
          monthly_report_enabled?: boolean | null
          security_alert_email?: string | null
          security_alert_threshold?: string | null
          security_scan_enabled?: boolean | null
          sms_as_fallback?: boolean | null
          sms_enabled?: boolean | null
          twilio_sms_number?: string | null
          updated_at?: string | null
          vimeo_history_url?: string | null
          weekly_report_enabled?: boolean | null
          whatsapp_global_enabled?: boolean | null
          whatsapp_target_phone?: string | null
        }
        Relationships: []
      }
      agent_phrases: {
        Row: {
          agent_id: string | null
          category: string | null
          context: string | null
          created_at: string | null
          id: string
          phrase: string | null
        }
        Insert: {
          agent_id?: string | null
          category?: string | null
          context?: string | null
          created_at?: string | null
          id?: string
          phrase?: string | null
        }
        Update: {
          agent_id?: string | null
          category?: string | null
          context?: string | null
          created_at?: string | null
          id?: string
          phrase?: string | null
        }
        Relationships: []
      }
      agent_pronunciations: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          language: string | null
          pronunciation: string | null
          word: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          pronunciation?: string | null
          word?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          pronunciation?: string | null
          word?: string | null
        }
        Relationships: []
      }
      agent_tag_profiles: {
        Row: {
          access_type: string | null
          agent_id: string | null
          created_at: string | null
          id: string
          include_children: boolean | null
          taxonomy_id: string | null
          weight: number | null
        }
        Insert: {
          access_type?: string | null
          agent_id?: string | null
          created_at?: string | null
          id?: string
          include_children?: boolean | null
          taxonomy_id?: string | null
          weight?: number | null
        }
        Update: {
          access_type?: string | null
          agent_id?: string | null
          created_at?: string | null
          id?: string
          include_children?: boolean | null
          taxonomy_id?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      api_audit_logs: {
        Row: {
          created_at: string | null
          endpoint: string | null
          id: string
          ip_address: string | null
          method: string | null
          request_body: Json | null
          response_status: number | null
          response_time_ms: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          id?: string
          ip_address?: string | null
          method?: string | null
          request_body?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          id?: string
          ip_address?: string | null
          method?: string | null
          request_body?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_cache: {
        Row: {
          data: Json
          endpoint: string
          expires_at: string | null
          fetched_at: string | null
          id: string
          is_valid: boolean | null
          municipality_code: string | null
          params: Json | null
          source: string
          state_code: string | null
        }
        Insert: {
          data: Json
          endpoint: string
          expires_at?: string | null
          fetched_at?: string | null
          id?: string
          is_valid?: boolean | null
          municipality_code?: string | null
          params?: Json | null
          source: string
          state_code?: string | null
        }
        Update: {
          data?: Json
          endpoint?: string
          expires_at?: string | null
          fetched_at?: string | null
          id?: string
          is_valid?: boolean | null
          municipality_code?: string | null
          params?: Json | null
          source?: string
          state_code?: string | null
        }
        Relationships: []
      }
      api_test_staging: {
        Row: {
          all_variables: Json | null
          base_url: string | null
          created_at: string | null
          description: string | null
          discovered_period_end: string | null
          discovered_period_start: string | null
          error_message: string | null
          http_status: number | null
          id: string
          implementation_params: Json | null
          is_functional: boolean | null
          last_raw_response: Json | null
          name: string | null
          provider: string | null
          selected_variables: Json | null
          status: string | null
          test_timestamp: string | null
          updated_at: string | null
        }
        Insert: {
          all_variables?: Json | null
          base_url?: string | null
          created_at?: string | null
          description?: string | null
          discovered_period_end?: string | null
          discovered_period_start?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          implementation_params?: Json | null
          is_functional?: boolean | null
          last_raw_response?: Json | null
          name?: string | null
          provider?: string | null
          selected_variables?: Json | null
          status?: string | null
          test_timestamp?: string | null
          updated_at?: string | null
        }
        Update: {
          all_variables?: Json | null
          base_url?: string | null
          created_at?: string | null
          description?: string | null
          discovered_period_end?: string | null
          discovered_period_start?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          implementation_params?: Json | null
          is_functional?: boolean | null
          last_raw_response?: Json | null
          name?: string | null
          provider?: string | null
          selected_variables?: Json | null
          status?: string | null
          test_timestamp?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          category: string | null
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      audio_contents: {
        Row: {
          audio_url: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          storage_path: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          storage_path?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          storage_path?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      auto_preload_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          resource_type: string | null
          resource_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          resource_type?: string | null
          resource_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          resource_type?: string | null
          resource_url?: string | null
        }
        Relationships: []
      }
      banned_devices: {
        Row: {
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          created_at: string | null
          device_fingerprint: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          is_permanent: boolean | null
          reason: string | null
          unbanned_at: string | null
          unbanned_by: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          violation_type: string | null
        }
        Insert: {
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          is_permanent?: boolean | null
          reason?: string | null
          unbanned_at?: string | null
          unbanned_by?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          violation_type?: string | null
        }
        Update: {
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          is_permanent?: boolean | null
          reason?: string | null
          unbanned_at?: string | null
          unbanned_by?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          violation_type?: string | null
        }
        Relationships: []
      }
      brazilian_ufs: {
        Row: {
          codigo: number | null
          created_at: string | null
          id: string
          nome: string | null
          regiao: string | null
          sigla: string | null
        }
        Insert: {
          codigo?: number | null
          created_at?: string | null
          id?: string
          nome?: string | null
          regiao?: string | null
          sigla?: string | null
        }
        Update: {
          codigo?: number | null
          created_at?: string | null
          id?: string
          nome?: string | null
          regiao?: string | null
          sigla?: string | null
        }
        Relationships: []
      }
      chat_agents: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          metadata: Json | null
          model: string | null
          name: string
          system_prompt: string | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          name: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          name?: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_analytics: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string | null
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_config: {
        Row: {
          config_key: string | null
          config_value: Json | null
          created_at: string | null
          description: string | null
          id: string
        }
        Insert: {
          config_key?: string | null
          config_value?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          config_key?: string | null
          config_value?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string | null
          id: string
          model_used: string | null
          role: string
          session_id: string
          tokens_used: number | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          model_used?: string | null
          role: string
          session_id: string
          tokens_used?: number | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          model_used?: string | null
          role?: string
          session_id?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_routing_rules: {
        Row: {
          condition: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          rule_name: string | null
          target_agent_id: string | null
        }
        Insert: {
          condition?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_name?: string | null
          target_agent_id?: string | null
        }
        Update: {
          condition?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_name?: string | null
          target_agent_id?: string | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          agent_slug: string | null
          channel: string | null
          device_fingerprint: string | null
          ended_at: string | null
          id: string
          metadata: Json | null
          municipality_code: string | null
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_slug?: string | null
          channel?: string | null
          device_fingerprint?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          municipality_code?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_slug?: string | null
          channel?: string | null
          device_fingerprint?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          municipality_code?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      communication_styles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          style_code: string
          style_name: string
          tone_parameters: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          style_code: string
          style_name: string
          tone_parameters?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          style_code?: string
          style_name?: string
          tone_parameters?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          replied_at: string | null
          replied_by: string | null
          sender_email: string | null
          sender_name: string | null
          sender_phone: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          replied_at?: string | null
          replied_by?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          replied_at?: string | null
          replied_by?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      context_detection_rules: {
        Row: {
          context_id: string | null
          created_at: string | null
          id: string
          rule_type: string
          rule_value: string
          weight: number | null
        }
        Insert: {
          context_id?: string | null
          created_at?: string | null
          id?: string
          rule_type: string
          rule_value: string
          weight?: number | null
        }
        Update: {
          context_id?: string | null
          created_at?: string | null
          id?: string
          rule_type?: string
          rule_value?: string
          weight?: number | null
        }
        Relationships: []
      }
      context_profiles: {
        Row: {
          adaptation_speed: string | null
          antiprompt: string | null
          auto_detect_region: boolean | null
          code: string
          color: string | null
          created_at: string | null
          default_region_code: string | null
          description: string | null
          detection_keywords: Json | null
          detection_priority: number | null
          id: string
          initial_cognitive_level: number | null
          is_active: boolean | null
          is_default: boolean | null
          maieutic_enabled: boolean | null
          match_count: number | null
          match_threshold: number | null
          max_cognitive_level: number | null
          min_cognitive_level: number | null
          name: string
          prompt_additions: string | null
          prompt_template: string | null
          taxonomy_codes: Json | null
          tone: string | null
          updated_at: string | null
        }
        Insert: {
          adaptation_speed?: string | null
          antiprompt?: string | null
          auto_detect_region?: boolean | null
          code: string
          color?: string | null
          created_at?: string | null
          default_region_code?: string | null
          description?: string | null
          detection_keywords?: Json | null
          detection_priority?: number | null
          id?: string
          initial_cognitive_level?: number | null
          is_active?: boolean | null
          is_default?: boolean | null
          maieutic_enabled?: boolean | null
          match_count?: number | null
          match_threshold?: number | null
          max_cognitive_level?: number | null
          min_cognitive_level?: number | null
          name: string
          prompt_additions?: string | null
          prompt_template?: string | null
          taxonomy_codes?: Json | null
          tone?: string | null
          updated_at?: string | null
        }
        Update: {
          adaptation_speed?: string | null
          antiprompt?: string | null
          auto_detect_region?: boolean | null
          code?: string
          color?: string | null
          created_at?: string | null
          default_region_code?: string | null
          description?: string | null
          detection_keywords?: Json | null
          detection_priority?: number | null
          id?: string
          initial_cognitive_level?: number | null
          is_active?: boolean | null
          is_default?: boolean | null
          maieutic_enabled?: boolean | null
          match_count?: number | null
          match_threshold?: number | null
          max_cognitive_level?: number | null
          min_cognitive_level?: number | null
          name?: string
          prompt_additions?: string | null
          prompt_template?: string | null
          taxonomy_codes?: Json | null
          tone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_history: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          model: string | null
          role: string | null
          session_id: string | null
          tokens: number | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          role?: string | null
          session_id?: string | null
          tokens?: number | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          role?: string | null
          session_id?: string | null
          tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          message_count: number | null
          model: string | null
          session_id: string | null
          title: string | null
          total_tokens: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          message_count?: number | null
          model?: string | null
          session_id?: string | null
          title?: string | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          message_count?: number | null
          model?: string | null
          session_id?: string | null
          title?: string | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      credits_usage: {
        Row: {
          created_at: string | null
          credits_used: number | null
          id: string
          metadata: Json | null
          model: string | null
          operation: string | null
          tokens_input: number | null
          tokens_output: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          credits_used?: number | null
          id?: string
          metadata?: Json | null
          model?: string | null
          operation?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          credits_used?: number | null
          id?: string
          metadata?: Json | null
          model?: string | null
          operation?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_visits: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          id: string
          ip_address: string | null
          page_url: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      debug_logs: {
        Row: {
          component: string | null
          created_at: string | null
          id: string
          log_type: string | null
          message: string | null
          metadata: Json | null
          severity: string | null
          stack_trace: string | null
        }
        Insert: {
          component?: string | null
          created_at?: string | null
          id?: string
          log_type?: string | null
          message?: string | null
          metadata?: Json | null
          severity?: string | null
          stack_trace?: string | null
        }
        Update: {
          component?: string | null
          created_at?: string | null
          id?: string
          log_type?: string | null
          message?: string | null
          metadata?: Json | null
          severity?: string | null
          stack_trace?: string | null
        }
        Relationships: []
      }
      deep_search_knowledge: {
        Row: {
          created_at: string | null
          id: string
          query: string | null
          relevance_score: number | null
          result: Json | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query?: string | null
          relevance_score?: number | null
          result?: Json | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string | null
          relevance_score?: number | null
          result?: Json | null
          source?: string | null
        }
        Relationships: []
      }
      deterministic_analysis: {
        Row: {
          analysis_type: string | null
          confidence: number | null
          created_at: string | null
          id: string
          input_text: string | null
          processing_time_ms: number | null
          result: Json | null
        }
        Insert: {
          analysis_type?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          input_text?: string | null
          processing_time_ms?: number | null
          result?: Json | null
        }
        Update: {
          analysis_type?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          input_text?: string | null
          processing_time_ms?: number | null
          result?: Json | null
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number | null
          content: string
          created_at: string | null
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          chunk_index?: number | null
          content: string
          created_at?: string | null
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number | null
          content?: string
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_onboarding_log: {
        Row: {
          created_at: string | null
          document_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          status: string | null
          step: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          step?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          step?: string | null
        }
        Relationships: []
      }
      document_routing_log: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string
          metadata: Json | null
          reason: string | null
          source_agent: string | null
          target_agent: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          source_agent?: string | null
          target_agent?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          source_agent?: string | null
          target_agent?: string | null
        }
        Relationships: []
      }
      document_tags: {
        Row: {
          confidence: number | null
          created_at: string | null
          document_id: string | null
          id: string
          tag_name: string | null
          tag_type: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          tag_name?: string | null
          tag_type?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          tag_name?: string | null
          tag_type?: string | null
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          changes_summary: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          document_id: string | null
          id: string
          version_number: number | null
        }
        Insert: {
          changes_summary?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          id?: string
          version_number?: number | null
        }
        Update: {
          changes_summary?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          id?: string
          version_number?: number | null
        }
        Relationships: []
      }
      documentation_sync_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          items_synced: number | null
          source: string | null
          sync_status: string | null
          target: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          items_synced?: number | null
          source?: string | null
          sync_status?: string | null
          target?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          items_synced?: number | null
          source?: string | null
          sync_status?: string | null
          target?: string | null
        }
        Relationships: []
      }
      documentation_versions: {
        Row: {
          changelog: string | null
          content: string | null
          created_at: string | null
          doc_key: string | null
          id: string
          published_by: string | null
          version: string | null
        }
        Insert: {
          changelog?: string | null
          content?: string | null
          created_at?: string | null
          doc_key?: string | null
          id?: string
          published_by?: string | null
          version?: string | null
        }
        Update: {
          changelog?: string | null
          content?: string | null
          created_at?: string | null
          doc_key?: string | null
          id?: string
          published_by?: string | null
          version?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          source: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      economic_indicators: {
        Row: {
          api_id: string | null
          category: string | null
          code: string
          created_at: string | null
          cron_schedule: string | null
          frequency: string | null
          id: string
          is_regional: boolean | null
          name: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          api_id?: string | null
          category?: string | null
          code: string
          created_at?: string | null
          cron_schedule?: string | null
          frequency?: string | null
          id?: string
          is_regional?: boolean | null
          name: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          api_id?: string | null
          category?: string | null
          code?: string
          created_at?: string | null
          cron_schedule?: string | null
          frequency?: string | null
          id?: string
          is_regional?: boolean | null
          name?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          subject: string | null
          variables: Json | null
          variables_used: string[] | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          subject?: string | null
          variables?: Json | null
          variables_used?: string[] | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string | null
          variables?: Json | null
          variables_used?: string[] | null
        }
        Relationships: []
      }
      entity_tags: {
        Row: {
          confidence: number | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          source: string | null
          tag_name: string | null
          tag_value: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          source?: string | null
          tag_name?: string | null
          tag_value?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          source?: string | null
          tag_name?: string | null
          tag_value?: string | null
        }
        Relationships: []
      }
      estados: {
        Row: {
          codigo_uf: number
          lat: number | null
          lng: number | null
          nome: string
          regiao: string | null
          uf: string
        }
        Insert: {
          codigo_uf: number
          lat?: number | null
          lng?: number | null
          nome: string
          regiao?: string | null
          uf: string
        }
        Update: {
          codigo_uf?: number
          lat?: number | null
          lng?: number | null
          nome?: string
          regiao?: string | null
          uf?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          environment: string | null
          flag_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          environment?: string | null
          flag_name: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          environment?: string | null
          flag_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      generated_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          model: string | null
          prompt: string | null
          size: string | null
          style: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          model?: string | null
          prompt?: string | null
          size?: string | null
          style?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          model?: string | null
          prompt?: string | null
          size?: string | null
          style?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      global_taxonomy: {
        Row: {
          auto_created: boolean | null
          code: string
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          keywords: Json | null
          level: number | null
          name: string
          parent_id: string | null
          status: string | null
          synonyms: Json | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          auto_created?: boolean | null
          code: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          keywords?: Json | null
          level?: number | null
          name: string
          parent_id?: string | null
          status?: string | null
          synonyms?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          auto_created?: boolean | null
          code?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          keywords?: Json | null
          level?: number | null
          name?: string
          parent_id?: string | null
          status?: string | null
          synonyms?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_parent"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "global_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      image_analytics: {
        Row: {
          analysis_type: string | null
          confidence: number | null
          created_at: string | null
          id: string
          image_id: string | null
          processing_time_ms: number | null
          result: Json | null
        }
        Insert: {
          analysis_type?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          image_id?: string | null
          processing_time_ms?: number | null
          result?: Json | null
        }
        Update: {
          analysis_type?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          image_id?: string | null
          processing_time_ms?: number | null
          result?: Json | null
        }
        Relationships: []
      }
      indicator_regional_values: {
        Row: {
          created_at: string | null
          id: string
          indicator_id: string | null
          reference_date: string
          uf_code: number
          value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          indicator_id?: string | null
          reference_date: string
          uf_code: number
          value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          indicator_id?: string | null
          reference_date?: string
          uf_code?: number
          value?: number | null
        }
        Relationships: []
      }
      indicator_stats_summary: {
        Row: {
          created_at: string | null
          id: string
          indicator_id: string | null
          indicator_name: string | null
          last_date: string | null
          last_value: number | null
          total_records: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          indicator_id?: string | null
          indicator_name?: string | null
          last_date?: string | null
          last_value?: number | null
          total_records?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          indicator_id?: string | null
          indicator_name?: string | null
          last_date?: string | null
          last_value?: number | null
          total_records?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      indicator_values: {
        Row: {
          created_at: string | null
          id: string
          indicator_id: string | null
          reference_date: string
          value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          indicator_id?: string | null
          reference_date: string
          value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          indicator_id?: string | null
          reference_date?: string
          value?: number | null
        }
        Relationships: []
      }
      indices_history: {
        Row: {
          id: string
          indices: Json
          municipality_code: string
          overall_score: number | null
          recorded_at: string | null
        }
        Insert: {
          id?: string
          indices: Json
          municipality_code: string
          overall_score?: number | null
          recorded_at?: string | null
        }
        Update: {
          id?: string
          indices?: Json
          municipality_code?: string
          overall_score?: number | null
          recorded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indices_history_municipality_code_fkey"
            columns: ["municipality_code"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["code"]
          },
        ]
      }
      integrity_check_log: {
        Row: {
          check_type: string | null
          created_at: string | null
          details: Json | null
          id: string
          issues_found: number | null
          status: string | null
          table_name: string | null
        }
        Insert: {
          check_type?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          issues_found?: number | null
          status?: string | null
          table_name?: string | null
        }
        Update: {
          check_type?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          issues_found?: number | null
          status?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      lexicon_terms: {
        Row: {
          antonyms: string[] | null
          audio_url: string | null
          category: string | null
          created_at: string | null
          definition: string | null
          definition_simple: string | null
          domain: string[] | null
          example_usage: string | null
          id: string
          is_approved: boolean | null
          part_of_speech: string | null
          pronunciation_ipa: string | null
          pronunciation_phonetic: string | null
          register: string | null
          related_terms: Json | null
          source: string | null
          synonyms: Json | null
          taxonomy_id: string | null
          term: string | null
          term_normalized: string | null
        }
        Insert: {
          antonyms?: string[] | null
          audio_url?: string | null
          category?: string | null
          created_at?: string | null
          definition?: string | null
          definition_simple?: string | null
          domain?: string[] | null
          example_usage?: string | null
          id?: string
          is_approved?: boolean | null
          part_of_speech?: string | null
          pronunciation_ipa?: string | null
          pronunciation_phonetic?: string | null
          register?: string | null
          related_terms?: Json | null
          source?: string | null
          synonyms?: Json | null
          taxonomy_id?: string | null
          term?: string | null
          term_normalized?: string | null
        }
        Update: {
          antonyms?: string[] | null
          audio_url?: string | null
          category?: string | null
          created_at?: string | null
          definition?: string | null
          definition_simple?: string | null
          domain?: string[] | null
          example_usage?: string | null
          id?: string
          is_approved?: boolean | null
          part_of_speech?: string | null
          pronunciation_ipa?: string | null
          pronunciation_phonetic?: string | null
          register?: string | null
          related_terms?: Json | null
          source?: string | null
          synonyms?: Json | null
          taxonomy_id?: string | null
          term?: string | null
          term_normalized?: string | null
        }
        Relationships: []
      }
      maieutic_metrics: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          metric_type: string | null
          metric_value: number | null
          session_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          metric_type?: string | null
          metric_value?: number | null
          session_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          metric_type?: string | null
          metric_value?: number | null
          session_id?: string | null
        }
        Relationships: []
      }
      maieutic_training_categories: {
        Row: {
          created_at: string | null
          description: string | null
          examples: Json | null
          id: string
          is_active: boolean | null
          name: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          examples?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          examples?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string | null
        }
        Relationships: []
      }
      market_news: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          published_at: string | null
          sentiment: string | null
          source: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          published_at?: string | null
          sentiment?: string | null
          source?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          published_at?: string | null
          sentiment?: string | null
          source?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_correlations: {
        Row: {
          correlation_score: number | null
          correlation_type: string | null
          created_at: string | null
          entity_a: string | null
          entity_b: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          correlation_score?: number | null
          correlation_type?: string | null
          created_at?: string | null
          entity_a?: string | null
          entity_b?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          correlation_score?: number | null
          correlation_type?: string | null
          created_at?: string | null
          entity_a?: string | null
          entity_b?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      ml_restrictions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          model_name: string | null
          reason: string | null
          restriction_type: string | null
          restriction_value: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model_name?: string | null
          reason?: string | null
          restriction_type?: string | null
          restriction_value?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model_name?: string | null
          reason?: string | null
          restriction_type?: string | null
          restriction_value?: Json | null
        }
        Relationships: []
      }
      ml_tag_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          feedback_type: string | null
          id: string
          tag_id: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          tag_id?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          tag_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ml_tag_suggestions: {
        Row: {
          confidence: number | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          model_version: string | null
          status: string | null
          suggested_tag: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          model_version?: string | null
          status?: string | null
          suggested_tag?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          model_version?: string | null
          status?: string | null
          suggested_tag?: string | null
        }
        Relationships: []
      }
      municipal_indices: {
        Row: {
          calculated_at: string | null
          data_period: string | null
          education_index: number | null
          employment_index: number | null
          environmental_index: number | null
          fiscal_health_index: number | null
          health_index: number | null
          id: string
          infrastructure_index: number | null
          municipality_code: string
          overall_score: number | null
          sanitation_index: number | null
          social_vulnerability_index: number | null
          sources_used: Json | null
        }
        Insert: {
          calculated_at?: string | null
          data_period?: string | null
          education_index?: number | null
          employment_index?: number | null
          environmental_index?: number | null
          fiscal_health_index?: number | null
          health_index?: number | null
          id?: string
          infrastructure_index?: number | null
          municipality_code: string
          overall_score?: number | null
          sanitation_index?: number | null
          social_vulnerability_index?: number | null
          sources_used?: Json | null
        }
        Update: {
          calculated_at?: string | null
          data_period?: string | null
          education_index?: number | null
          employment_index?: number | null
          environmental_index?: number | null
          fiscal_health_index?: number | null
          health_index?: number | null
          id?: string
          infrastructure_index?: number | null
          municipality_code?: string
          overall_score?: number | null
          sanitation_index?: number | null
          social_vulnerability_index?: number | null
          sources_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "municipal_indices_municipality_code_fkey"
            columns: ["municipality_code"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["code"]
          },
        ]
      }
      municipalities: {
        Row: {
          area_km2: number | null
          code: string
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          population: number | null
          region: string
          state_code: string
          state_name: string
          updated_at: string | null
        }
        Insert: {
          area_km2?: number | null
          code: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          population?: number | null
          region: string
          state_code: string
          state_name: string
          updated_at?: string | null
        }
        Update: {
          area_km2?: number | null
          code?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          population?: number | null
          region?: string
          state_code?: string
          state_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      municipios: {
        Row: {
          capital: boolean | null
          codigo_ibge: number
          codigo_uf: number | null
          ddd: number | null
          fuso_horario: string | null
          lat: number | null
          lng: number | null
          nome: string
          pib_2021_milhoes: number | null
          populacao_2022: number | null
          regiao: string | null
          uf: string
        }
        Insert: {
          capital?: boolean | null
          codigo_ibge: number
          codigo_uf?: number | null
          ddd?: number | null
          fuso_horario?: string | null
          lat?: number | null
          lng?: number | null
          nome: string
          pib_2021_milhoes?: number | null
          populacao_2022?: number | null
          regiao?: string | null
          uf: string
        }
        Update: {
          capital?: boolean | null
          codigo_ibge?: number
          codigo_uf?: number | null
          ddd?: number | null
          fuso_horario?: string | null
          lat?: number | null
          lng?: number | null
          nome?: string
          pib_2021_milhoes?: number | null
          populacao_2022?: number | null
          regiao?: string | null
          uf?: string
        }
        Relationships: []
      }
      notification_fallback_config: {
        Row: {
          alert_email: string | null
          alert_on_fallback: boolean | null
          created_at: string | null
          enabled: boolean | null
          id: string
          sms_provider: string | null
          threshold_percent: number | null
          updated_at: string | null
        }
        Insert: {
          alert_email?: string | null
          alert_on_fallback?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          sms_provider?: string | null
          threshold_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          alert_email?: string | null
          alert_on_fallback?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          sms_provider?: string | null
          threshold_percent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_fallback_logs: {
        Row: {
          created_at: string | null
          fallback_channel: string | null
          id: string
          notification_id: string | null
          original_channel: string | null
          reason: string | null
          recipient: string | null
        }
        Insert: {
          created_at?: string | null
          fallback_channel?: string | null
          id?: string
          notification_id?: string | null
          original_channel?: string | null
          reason?: string | null
          recipient?: string | null
        }
        Update: {
          created_at?: string | null
          fallback_channel?: string | null
          id?: string
          notification_id?: string | null
          original_channel?: string | null
          reason?: string | null
          recipient?: string | null
        }
        Relationships: []
      }
      notification_logic_config: {
        Row: {
          config: Json | null
          created_at: string | null
          event_type: string
          id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          event_type: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          event_type?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          created_at: string | null
          id: string
          phone_number: string
          provider: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          phone_number: string
          provider: string
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          phone_number?: string
          provider?: string
          status?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel: string | null
          created_at: string | null
          event_type: string | null
          id: string
          is_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          created_at: string | null
          email_body: string | null
          email_subject: string | null
          event_type: string
          id: string
          platform_name: string | null
          updated_at: string | null
          variables_available: Json | null
          whatsapp_message: string | null
        }
        Insert: {
          created_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          event_type: string
          id?: string
          platform_name?: string | null
          updated_at?: string | null
          variables_available?: Json | null
          whatsapp_message?: string | null
        }
        Update: {
          created_at?: string | null
          email_body?: string | null
          email_subject?: string | null
          event_type?: string
          id?: string
          platform_name?: string | null
          updated_at?: string | null
          variables_available?: Json | null
          whatsapp_message?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel: string
          created_at: string | null
          delivered_at: string | null
          email: string | null
          error_message: string | null
          external_id: string | null
          id: string
          message: string
          phone: string | null
          sent_at: string | null
          status: string | null
          title: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          delivered_at?: string | null
          email?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message: string
          phone?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          email?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message?: string
          phone?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ontology_concepts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string | null
          parent_id: string | null
          properties: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          parent_id?: string | null
          properties?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          parent_id?: string | null
          properties?: Json | null
        }
        Relationships: []
      }
      ontology_relations: {
        Row: {
          created_at: string | null
          id: string
          relation_type: string | null
          source_concept_id: string | null
          target_concept_id: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          relation_type?: string | null
          source_concept_id?: string | null
          target_concept_id?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          relation_type?: string | null
          source_concept_id?: string | null
          target_concept_id?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      pac_pmc_mapping: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          pac_code: string | null
          pmc_code: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pac_code?: string | null
          pmc_code?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pac_code?: string | null
          pmc_code?: string | null
        }
        Relationships: []
      }
      pac_valores_estimados: {
        Row: {
          confidence_interval: Json | null
          created_at: string | null
          estimated_value: number | null
          id: string
          pac_code: string | null
          reference_date: string | null
        }
        Insert: {
          confidence_interval?: Json | null
          created_at?: string | null
          estimated_value?: number | null
          id?: string
          pac_code?: string | null
          reference_date?: string | null
        }
        Update: {
          confidence_interval?: Json | null
          created_at?: string | null
          estimated_value?: number | null
          id?: string
          pac_code?: string | null
          reference_date?: string | null
        }
        Relationships: []
      }
      password_recovery_codes: {
        Row: {
          code: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          device_id: string | null
          id: string
          phone_number: string
          verification_method: string | null
          verified_at: string | null
        }
        Insert: {
          device_id?: string | null
          id?: string
          phone_number: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Update: {
          device_id?: string | null
          id?: string
          phone_number?: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      phonetic_rules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          language: string | null
          pattern: string
          priority: number | null
          replacement: string
          rule_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          pattern: string
          priority?: number | null
          replacement: string
          rule_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          pattern?: string
          priority?: number | null
          replacement?: string
          rule_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pmc_valores_reais: {
        Row: {
          created_at: string | null
          id: string
          pmc_code: string | null
          reference_date: string | null
          source: string | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pmc_code?: string | null
          reference_date?: string | null
          source?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pmc_code?: string | null
          reference_date?: string | null
          source?: string | null
          value?: number | null
        }
        Relationships: []
      }
      podcast_contents: {
        Row: {
          audio_url: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          published_at: string | null
          tags: Json | null
          title: string | null
          transcript: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          published_at?: string | null
          tags?: Json | null
          title?: string | null
          transcript?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          published_at?: string | null
          tags?: Json | null
          title?: string | null
          transcript?: string | null
        }
        Relationships: []
      }
      presentation_scripts: {
        Row: {
          content: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          slides: Json | null
          speaker_notes: string | null
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          slides?: Json | null
          speaker_notes?: string | null
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          slides?: Json | null
          speaker_notes?: string | null
          title?: string | null
        }
        Relationships: []
      }
      profile_taxonomies: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string | null
          taxonomy_id: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id?: string | null
          taxonomy_id?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string | null
          taxonomy_id?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string
          institution_study: string | null
          institution_work: string | null
          last_browser: string | null
          last_device_fingerprint: string | null
          last_ip_address: string | null
          last_language: string | null
          last_login_at: string | null
          last_name: string | null
          last_os: string | null
          last_screen_resolution: string | null
          last_timezone: string | null
          phone: string | null
          registration_browser: string | null
          registration_device_fingerprint: string | null
          registration_ip_address: string | null
          registration_location: string | null
          registration_os: string | null
          updated_at: string | null
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          institution_study?: string | null
          institution_work?: string | null
          last_browser?: string | null
          last_device_fingerprint?: string | null
          last_ip_address?: string | null
          last_language?: string | null
          last_login_at?: string | null
          last_name?: string | null
          last_os?: string | null
          last_screen_resolution?: string | null
          last_timezone?: string | null
          phone?: string | null
          registration_browser?: string | null
          registration_device_fingerprint?: string | null
          registration_ip_address?: string | null
          registration_location?: string | null
          registration_os?: string | null
          updated_at?: string | null
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          institution_study?: string | null
          institution_work?: string | null
          last_browser?: string | null
          last_device_fingerprint?: string | null
          last_ip_address?: string | null
          last_language?: string | null
          last_login_at?: string | null
          last_name?: string | null
          last_os?: string | null
          last_screen_resolution?: string | null
          last_timezone?: string | null
          phone?: string | null
          registration_browser?: string | null
          registration_device_fingerprint?: string | null
          registration_ip_address?: string | null
          registration_location?: string | null
          registration_os?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pwa_config: {
        Row: {
          config_key: string
          config_type: string | null
          config_value: string | null
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_type?: string | null
          config_value?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_type?: string | null
          config_value?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      pwa_conversation_messages: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          device_id: string | null
          id: string
          key_topics: Json | null
          metadata: Json | null
          role: string | null
          session_id: string | null
          taxonomy_tags: string[] | null
          timestamp: string | null
          transcription: string | null
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          device_id?: string | null
          id?: string
          key_topics?: Json | null
          metadata?: Json | null
          role?: string | null
          session_id?: string | null
          taxonomy_tags?: string[] | null
          timestamp?: string | null
          transcription?: string | null
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          device_id?: string | null
          id?: string
          key_topics?: Json | null
          metadata?: Json | null
          role?: string | null
          session_id?: string | null
          taxonomy_tags?: string[] | null
          timestamp?: string | null
          transcription?: string | null
        }
        Relationships: []
      }
      pwa_conversation_sessions: {
        Row: {
          city: string | null
          company: string | null
          company_source: string | null
          country: string | null
          created_at: string | null
          device_id: string | null
          ended_at: string | null
          id: string
          is_active: boolean | null
          last_message_at: string | null
          latitude: number | null
          longitude: number | null
          message_count: number | null
          metadata: Json | null
          module_type: string | null
          started_at: string | null
          updated_at: string | null
          user_email: string | null
          user_name: string | null
        }
        Insert: {
          city?: string | null
          company?: string | null
          company_source?: string | null
          country?: string | null
          created_at?: string | null
          device_id?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          latitude?: number | null
          longitude?: number | null
          message_count?: number | null
          metadata?: Json | null
          module_type?: string | null
          started_at?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_name?: string | null
        }
        Update: {
          city?: string | null
          company?: string | null
          company_source?: string | null
          country?: string | null
          created_at?: string | null
          device_id?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          latitude?: number | null
          longitude?: number | null
          message_count?: number | null
          metadata?: Json | null
          module_type?: string | null
          started_at?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      pwa_conversation_summaries: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          last_assistant_message: string | null
          last_user_message: string | null
          message_count: number | null
          module_type: string | null
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          last_assistant_message?: string | null
          last_user_message?: string | null
          message_count?: number | null
          module_type?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          last_assistant_message?: string | null
          last_user_message?: string | null
          message_count?: number | null
          module_type?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pwa_device_fingerprints: {
        Row: {
          created_at: string | null
          device_info: Json | null
          fingerprint: string
          id: string
          phone: string
          platform: string | null
          screen_size: string | null
          timezone: string | null
          touch_points: number | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          fingerprint: string
          id?: string
          phone: string
          platform?: string | null
          screen_size?: string | null
          timezone?: string | null
          touch_points?: number | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          fingerprint?: string
          id?: string
          phone?: string
          platform?: string | null
          screen_size?: string | null
          timezone?: string | null
          touch_points?: number | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      pwa_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string
          invite_code: string | null
          invited_by: string | null
          name: string | null
          phone: string | null
          pwa_access: string[] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string | null
          invited_by?: string | null
          name?: string | null
          phone?: string | null
          pwa_access?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string | null
          invited_by?: string | null
          name?: string | null
          phone?: string | null
          pwa_access?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pwa_sessions: {
        Row: {
          created_at: string | null
          device_id: string | null
          expires_at: string | null
          has_app_access: boolean | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_interaction: string | null
          phone: string | null
          pwa_access: string[] | null
          session_expires_at: string | null
          token: string | null
          total_messages: number | null
          updated_at: string | null
          user_id: string | null
          user_name: string | null
          verification_attempts: number | null
          verification_code: string | null
          verification_code_expires_at: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          expires_at?: string | null
          has_app_access?: boolean | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_interaction?: string | null
          phone?: string | null
          pwa_access?: string[] | null
          session_expires_at?: string | null
          token?: string | null
          total_messages?: number | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string | null
          verification_attempts?: number | null
          verification_code?: string | null
          verification_code_expires_at?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          expires_at?: string | null
          has_app_access?: boolean | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_interaction?: string | null
          phone?: string | null
          pwa_access?: string[] | null
          session_expires_at?: string | null
          token?: string | null
          total_messages?: number | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string | null
          verification_attempts?: number | null
          verification_code?: string | null
          verification_code_expires_at?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      rag_analytics: {
        Row: {
          created_at: string | null
          documents_retrieved: number | null
          id: string
          query: string | null
          relevance_scores: Json | null
          response_time_ms: number | null
          user_feedback: string | null
        }
        Insert: {
          created_at?: string | null
          documents_retrieved?: number | null
          id?: string
          query?: string | null
          relevance_scores?: Json | null
          response_time_ms?: number | null
          user_feedback?: string | null
        }
        Update: {
          created_at?: string | null
          documents_retrieved?: number | null
          id?: string
          query?: string | null
          relevance_scores?: Json | null
          response_time_ms?: number | null
          user_feedback?: string | null
        }
        Relationships: []
      }
      reclassification_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_count: number | null
          id: string
          job_type: string | null
          processed_items: number | null
          started_at: string | null
          status: string | null
          total_items: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          job_type?: string | null
          processed_items?: number | null
          started_at?: string | null
          status?: string | null
          total_items?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          job_type?: string | null
          processed_items?: number | null
          started_at?: string | null
          status?: string | null
          total_items?: number | null
        }
        Relationships: []
      }
      regional_pronunciations: {
        Row: {
          audio_url: string | null
          created_at: string | null
          id: string
          pronunciation: string | null
          region: string | null
          word: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          id?: string
          pronunciation?: string | null
          region?: string | null
          word?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          id?: string
          pronunciation?: string | null
          region?: string | null
          word?: string | null
        }
        Relationships: []
      }
      regional_tone_rules: {
        Row: {
          affirmations: Json | null
          avoided_terms: Json | null
          context: string | null
          created_at: string | null
          expressions: Json | null
          formality_level: number | null
          greetings: Json | null
          id: string
          is_active: boolean | null
          preferred_terms: Json | null
          priority: number | null
          region_code: string
          region_name: string | null
          replacement: string | null
          rule_name: string
          rule_pattern: string | null
          speech_rate: number | null
          updated_at: string | null
          voice_style: string | null
          warmth_level: number | null
        }
        Insert: {
          affirmations?: Json | null
          avoided_terms?: Json | null
          context?: string | null
          created_at?: string | null
          expressions?: Json | null
          formality_level?: number | null
          greetings?: Json | null
          id?: string
          is_active?: boolean | null
          preferred_terms?: Json | null
          priority?: number | null
          region_code: string
          region_name?: string | null
          replacement?: string | null
          rule_name: string
          rule_pattern?: string | null
          speech_rate?: number | null
          updated_at?: string | null
          voice_style?: string | null
          warmth_level?: number | null
        }
        Update: {
          affirmations?: Json | null
          avoided_terms?: Json | null
          context?: string | null
          created_at?: string | null
          expressions?: Json | null
          formality_level?: number | null
          greetings?: Json | null
          id?: string
          is_active?: boolean | null
          preferred_terms?: Json | null
          priority?: number | null
          region_code?: string
          region_name?: string | null
          replacement?: string | null
          rule_name?: string
          rule_pattern?: string | null
          speech_rate?: number | null
          updated_at?: string | null
          voice_style?: string | null
          warmth_level?: number | null
        }
        Relationships: []
      }
      reply_templates: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string | null
          variables: Json | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          variables?: Json | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      schema_audit_log: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_schema: Json | null
          old_schema: Json | null
          operation: string | null
          table_name: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_schema?: Json | null
          old_schema?: Json | null
          operation?: string | null
          table_name?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_schema?: Json | null
          old_schema?: Json | null
          operation?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      section_audio: {
        Row: {
          audio_url: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          section_id: string | null
          voice_id: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          section_id?: string | null
          voice_id?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          section_id?: string | null
          voice_id?: string | null
        }
        Relationships: []
      }
      section_content_versions: {
        Row: {
          changed_by: string | null
          content: string | null
          created_at: string | null
          id: string
          section_id: string | null
          version: number | null
        }
        Insert: {
          changed_by?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          section_id?: string | null
          version?: number | null
        }
        Update: {
          changed_by?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          section_id?: string | null
          version?: number | null
        }
        Relationships: []
      }
      section_contents: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          section_key: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          section_key?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          section_key?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      security_alert_config: {
        Row: {
          alert_type: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          recipients: Json | null
          threshold: number | null
        }
        Insert: {
          alert_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          recipients?: Json | null
          threshold?: number | null
        }
        Update: {
          alert_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          recipients?: Json | null
          threshold?: number | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string | null
          id: string
          ip_address: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type?: string | null
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string | null
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_scan_results: {
        Row: {
          created_at: string | null
          id: string
          recommendations: Json | null
          scan_type: string | null
          scanned_at: string | null
          status: string | null
          target: string | null
          vulnerabilities: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          recommendations?: Json | null
          scan_type?: string | null
          scanned_at?: string | null
          status?: string | null
          target?: string | null
          vulnerabilities?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          recommendations?: Json | null
          scan_type?: string | null
          scanned_at?: string | null
          status?: string | null
          target?: string | null
          vulnerabilities?: Json | null
        }
        Relationships: []
      }
      security_severity_history: {
        Row: {
          created_at: string | null
          id: string
          resolved_count: number | null
          severity_level: string | null
          snapshot_date: string | null
          threat_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          resolved_count?: number | null
          severity_level?: string | null
          snapshot_date?: string | null
          threat_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          resolved_count?: number | null
          severity_level?: string | null
          snapshot_date?: string | null
          threat_count?: number | null
        }
        Relationships: []
      }
      security_shield_config: {
        Row: {
          config_key: string
          config_value: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      security_violations: {
        Row: {
          action_taken: string | null
          created_at: string | null
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          resolved_at: string | null
          severity: string | null
          user_email: string | null
          user_id: string | null
          violation_details: Json | null
          violation_type: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          resolved_at?: string | null
          severity?: string | null
          user_email?: string | null
          user_id?: string | null
          violation_details?: Json | null
          violation_type?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          resolved_at?: string | null
          severity?: string | null
          user_email?: string | null
          user_id?: string | null
          violation_details?: Json | null
          violation_type?: string | null
        }
        Relationships: []
      }
      security_whitelist: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          device_fingerprint: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          device_fingerprint?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          device_fingerprint?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      sms_verification_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone_number: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      speech_humanization: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          pattern: string | null
          priority: number | null
          replacement: string | null
          rule_name: string
          updated_at: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pattern?: string | null
          priority?: number | null
          replacement?: string | null
          rule_name: string
          updated_at?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pattern?: string | null
          priority?: number | null
          replacement?: string | null
          rule_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_api_registry: {
        Row: {
          auto_fetch_enabled: boolean | null
          auto_fetch_interval: string | null
          base_url: string
          created_at: string | null
          description: string | null
          discovered_period_end: string | null
          discovered_period_start: string | null
          fetch_end_date: string | null
          fetch_start_date: string | null
          id: string
          last_checked_at: string | null
          last_http_status: number | null
          last_latency_ms: number | null
          last_raw_response: Json | null
          last_response_at: string | null
          last_sync_metadata: Json | null
          method: string | null
          name: string
          period_discovery_date: string | null
          provider: string
          source_data_message: string | null
          source_data_status: string | null
          status: string | null
          target_table: string | null
          updated_at: string | null
        }
        Insert: {
          auto_fetch_enabled?: boolean | null
          auto_fetch_interval?: string | null
          base_url: string
          created_at?: string | null
          description?: string | null
          discovered_period_end?: string | null
          discovered_period_start?: string | null
          fetch_end_date?: string | null
          fetch_start_date?: string | null
          id?: string
          last_checked_at?: string | null
          last_http_status?: number | null
          last_latency_ms?: number | null
          last_raw_response?: Json | null
          last_response_at?: string | null
          last_sync_metadata?: Json | null
          method?: string | null
          name: string
          period_discovery_date?: string | null
          provider: string
          source_data_message?: string | null
          source_data_status?: string | null
          status?: string | null
          target_table?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_fetch_enabled?: boolean | null
          auto_fetch_interval?: string | null
          base_url?: string
          created_at?: string | null
          description?: string | null
          discovered_period_end?: string | null
          discovered_period_start?: string | null
          fetch_end_date?: string | null
          fetch_start_date?: string | null
          id?: string
          last_checked_at?: string | null
          last_http_status?: number | null
          last_latency_ms?: number | null
          last_raw_response?: Json | null
          last_response_at?: string | null
          last_sync_metadata?: Json | null
          method?: string | null
          name?: string
          period_discovery_date?: string | null
          provider?: string
          source_data_message?: string | null
          source_data_status?: string | null
          status?: string | null
          target_table?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_versions: {
        Row: {
          changelog: string | null
          created_at: string | null
          id: string
          is_current: boolean | null
          release_date: string | null
          version: string
        }
        Insert: {
          changelog?: string | null
          created_at?: string | null
          id?: string
          is_current?: boolean | null
          release_date?: string | null
          version: string
        }
        Update: {
          changelog?: string | null
          created_at?: string | null
          id?: string
          is_current?: boolean | null
          release_date?: string | null
          version?: string
        }
        Relationships: []
      }
      tag_merge_rules: {
        Row: {
          canonical_tag: string | null
          chat_type: string | null
          created_at: string | null
          created_by: string | null
          id: string
          merge_count: number | null
          source_tag: string | null
        }
        Insert: {
          canonical_tag?: string | null
          chat_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          merge_count?: number | null
          source_tag?: string | null
        }
        Update: {
          canonical_tag?: string | null
          chat_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          merge_count?: number | null
          source_tag?: string | null
        }
        Relationships: []
      }
      tag_modification_logs: {
        Row: {
          created_at: string | null
          id: string
          modification_type: string | null
          modified_by: string | null
          new_value: Json | null
          old_value: Json | null
          tag_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          modification_type?: string | null
          modified_by?: string | null
          new_value?: Json | null
          old_value?: Json | null
          tag_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          modification_type?: string | null
          modified_by?: string | null
          new_value?: Json | null
          old_value?: Json | null
          tag_id?: string | null
        }
        Relationships: []
      }
      taxonomy_metrics_daily: {
        Row: {
          active_taxonomies: number | null
          auto_classified: number | null
          avg_confidence: number | null
          classifications_ai_suggested: number | null
          classifications_auto: number | null
          classifications_manual: number | null
          coverage_percentage: number | null
          created_at: string | null
          documents_with_taxonomy: number | null
          documents_without_taxonomy: number | null
          id: string
          metric_date: string | null
          new_taxonomies_created: number | null
          onboarded_documents: number | null
          orphan_taxonomies: number | null
          pending_review: number | null
          suggestions_approved: number | null
          suggestions_pending: number | null
          suggestions_rejected: number | null
          total_documents: number | null
          total_taxonomies: number | null
        }
        Insert: {
          active_taxonomies?: number | null
          auto_classified?: number | null
          avg_confidence?: number | null
          classifications_ai_suggested?: number | null
          classifications_auto?: number | null
          classifications_manual?: number | null
          coverage_percentage?: number | null
          created_at?: string | null
          documents_with_taxonomy?: number | null
          documents_without_taxonomy?: number | null
          id?: string
          metric_date?: string | null
          new_taxonomies_created?: number | null
          onboarded_documents?: number | null
          orphan_taxonomies?: number | null
          pending_review?: number | null
          suggestions_approved?: number | null
          suggestions_pending?: number | null
          suggestions_rejected?: number | null
          total_documents?: number | null
          total_taxonomies?: number | null
        }
        Update: {
          active_taxonomies?: number | null
          auto_classified?: number | null
          avg_confidence?: number | null
          classifications_ai_suggested?: number | null
          classifications_auto?: number | null
          classifications_manual?: number | null
          coverage_percentage?: number | null
          created_at?: string | null
          documents_with_taxonomy?: number | null
          documents_without_taxonomy?: number | null
          id?: string
          metric_date?: string | null
          new_taxonomies_created?: number | null
          onboarded_documents?: number | null
          orphan_taxonomies?: number | null
          pending_review?: number | null
          suggestions_approved?: number | null
          suggestions_pending?: number | null
          suggestions_rejected?: number | null
          total_documents?: number | null
          total_taxonomies?: number | null
        }
        Relationships: []
      }
      taxonomy_phonetics: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          phonetic: string | null
          priority: number | null
          taxonomy_code: string | null
          term: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phonetic?: string | null
          priority?: number | null
          taxonomy_code?: string | null
          term?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phonetic?: string | null
          priority?: number | null
          taxonomy_code?: string | null
          term?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      taxonomy_suggestions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          reviewed_by: string | null
          status: string | null
          suggested_category: string | null
          term: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          reviewed_by?: string | null
          status?: string | null
          suggested_category?: string | null
          term?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          reviewed_by?: string | null
          status?: string | null
          suggested_category?: string | null
          term?: string | null
        }
        Relationships: []
      }
      tooltip_contents: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string | null
          tooltip_key: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string | null
          tooltip_key: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string | null
          tooltip_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      typing_latency_logs: {
        Row: {
          character_count: number | null
          id: string
          latency_ms: number | null
          session_id: string | null
          timestamp: string | null
        }
        Insert: {
          character_count?: number | null
          id?: string
          latency_ms?: number | null
          session_id?: string | null
          timestamp?: string | null
        }
        Update: {
          character_count?: number | null
          id?: string
          latency_ms?: number | null
          session_id?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      user_chat_preferences: {
        Row: {
          auto_scroll: boolean | null
          created_at: string | null
          font_size: string | null
          id: string
          notification_sound: boolean | null
          settings: Json | null
          theme: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_scroll?: boolean | null
          created_at?: string | null
          font_size?: string | null
          id?: string
          notification_sound?: boolean | null
          settings?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_scroll?: boolean | null
          created_at?: string | null
          font_size?: string | null
          id?: string
          notification_sound?: boolean | null
          settings?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_contacts: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          relationship: string | null
          user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          relationship?: string | null
          user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          relationship?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          has_app_access: boolean | null
          has_platform_access: boolean | null
          id: string
          name: string
          phone: string | null
          pwa_access: string[] | null
          role: string
          send_via_email: boolean | null
          send_via_whatsapp: boolean | null
          status: string
          token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          has_app_access?: boolean | null
          has_platform_access?: boolean | null
          id?: string
          name: string
          phone?: string | null
          pwa_access?: string[] | null
          role?: string
          send_via_email?: boolean | null
          send_via_whatsapp?: boolean | null
          status?: string
          token: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          has_app_access?: boolean | null
          has_platform_access?: boolean | null
          id?: string
          name?: string
          phone?: string | null
          pwa_access?: string[] | null
          role?: string
          send_via_email?: boolean | null
          send_via_whatsapp?: boolean | null
          status?: string
          token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          language: string | null
          preference_key: string | null
          preference_value: Json | null
          sidebar_favorites: Json | null
          theme: string | null
          updated_at: string | null
          user_id: string | null
          whatsapp_notifications: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          preference_key?: string | null
          preference_value?: Json | null
          sidebar_favorites?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_notifications?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          preference_key?: string | null
          preference_value?: Json | null
          sidebar_favorites?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_notifications?: boolean | null
        }
        Relationships: []
      }
      user_profiles_extended: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          onboarding_completed: boolean | null
          phone_number: string | null
          preferred_language: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          phone_number?: string | null
          preferred_language?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          phone_number?: string | null
          preferred_language?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_registrations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          ban_reason: string | null
          ban_type: string | null
          banned_at: string | null
          banned_by: string | null
          city: string | null
          complement: string | null
          created_at: string | null
          dns_origin: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          has_app_access: boolean | null
          has_platform_access: boolean | null
          id: string
          institution_study: string | null
          institution_work: string | null
          is_banned: boolean | null
          last_name: string | null
          mass_import_at: string | null
          neighborhood: string | null
          phone: string | null
          pwa_access: Json | null
          pwa_registered_at: string | null
          registration_source: string | null
          rejection_reason: string | null
          requested_at: string | null
          role: string | null
          state: string | null
          status: string | null
          street: string | null
          street_number: string | null
          unbanned_at: string | null
          unbanned_by: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          ban_reason?: string | null
          ban_type?: string | null
          banned_at?: string | null
          banned_by?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string | null
          dns_origin?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          has_app_access?: boolean | null
          has_platform_access?: boolean | null
          id?: string
          institution_study?: string | null
          institution_work?: string | null
          is_banned?: boolean | null
          last_name?: string | null
          mass_import_at?: string | null
          neighborhood?: string | null
          phone?: string | null
          pwa_access?: Json | null
          pwa_registered_at?: string | null
          registration_source?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          role?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          street_number?: string | null
          unbanned_at?: string | null
          unbanned_by?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          ban_reason?: string | null
          ban_type?: string | null
          banned_at?: string | null
          banned_by?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string | null
          dns_origin?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          has_app_access?: boolean | null
          has_platform_access?: boolean | null
          id?: string
          institution_study?: string | null
          institution_work?: string | null
          is_banned?: boolean | null
          last_name?: string | null
          mass_import_at?: string | null
          neighborhood?: string | null
          phone?: string | null
          pwa_access?: Json | null
          pwa_registered_at?: string | null
          registration_source?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          role?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          street_number?: string | null
          unbanned_at?: string | null
          unbanned_by?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vimeo_videos: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          is_active: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          vimeo_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          vimeo_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          vimeo_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          phone_number: string
          status: string | null
          wa_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          phone_number: string
          status?: string | null
          wa_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          phone_number?: string
          status?: string | null
          wa_id?: string | null
        }
        Relationships: []
      }
      whatsapp_daily_metrics: {
        Row: {
          conversations_started: number | null
          created_at: string | null
          id: string
          messages_received: number | null
          messages_sent: number | null
          metric_date: string | null
          quality_score: number | null
        }
        Insert: {
          conversations_started?: number | null
          created_at?: string | null
          id?: string
          messages_received?: number | null
          messages_sent?: number | null
          metric_date?: string | null
          quality_score?: number | null
        }
        Update: {
          conversations_started?: number | null
          created_at?: string | null
          id?: string
          messages_received?: number | null
          messages_sent?: number | null
          metric_date?: string | null
          quality_score?: number | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          direction: string
          id: string
          message_type: string | null
          status: string | null
          wa_message_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          direction: string
          id?: string
          message_type?: string | null
          status?: string | null
          wa_message_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          message_type?: string | null
          status?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_quality_events: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string | null
          id: string
          message_id: string | null
          phone_number: string | null
          quality_score: number | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type?: string | null
          id?: string
          message_id?: string | null
          phone_number?: string | null
          quality_score?: number | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string | null
          id?: string
          message_id?: string | null
          phone_number?: string | null
          quality_score?: number | null
        }
        Relationships: []
      }
      whatsapp_tier_status: {
        Row: {
          created_at: string | null
          current_usage: number | null
          daily_limit: number | null
          id: string
          last_updated: string | null
          tier: string | null
        }
        Insert: {
          created_at?: string | null
          current_usage?: number | null
          daily_limit?: number | null
          id?: string
          last_updated?: string | null
          tier?: string | null
        }
        Update: {
          created_at?: string | null
          current_usage?: number | null
          daily_limit?: number | null
          id?: string
          last_updated?: string | null
          tier?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_pwa_access: { Args: { p_phone: string }; Returns: Json }
      login_pwa: { Args: { p_phone: string }; Returns: Json }
      search_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      verify_pwa_code: {
        Args: { p_code: string; p_phone: string }
        Returns: Json
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
