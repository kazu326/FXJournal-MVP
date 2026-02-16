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
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          id: string
          published_at: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          published_at?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          published_at?: string | null
          title?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          actor_user_id: string
          client_version: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          hash: string
          id: string
          occurred_at: string
          organization_id: string
          payload: Json
          prev_hash: string | null
          request_id: string | null
          subject_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          actor_user_id: string
          client_version?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          hash: string
          id?: string
          occurred_at?: string
          organization_id: string
          payload?: Json
          prev_hash?: string | null
          request_id?: string | null
          subject_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_user_id?: string
          client_version?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          hash?: string
          id?: string
          occurred_at?: string
          organization_id?: string
          payload?: Json
          prev_hash?: string | null
          request_id?: string | null
          subject_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_events_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_events_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_required: boolean | null
          sequence_number: number
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_required?: boolean | null
          sequence_number: number
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_required?: boolean | null
          sequence_number?: number
          title?: string
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          recipient_user_id: string | null
          sender_user_id: string | null
          thread_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          recipient_user_id?: string | null
          sender_user_id?: string | null
          thread_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          recipient_user_id?: string | null
          sender_user_id?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          created_at: string | null
          id: string
          member_user_id: string
          teacher_user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_user_id: string
          teacher_user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_user_id?: string
          teacher_user_id?: string
        }
        Relationships: []
      }
      intervention_outcomes: {
        Row: {
          after_value: number | null
          before_value: number | null
          created_at: string
          id: string
          improvement_percent: number | null
          intervention_id: string
          measured_at: string | null
          metric_name: string
          notes: string | null
        }
        Insert: {
          after_value?: number | null
          before_value?: number | null
          created_at?: string
          id?: string
          improvement_percent?: number | null
          intervention_id: string
          measured_at?: string | null
          metric_name: string
          notes?: string | null
        }
        Update: {
          after_value?: number | null
          before_value?: number | null
          created_at?: string
          id?: string
          improvement_percent?: number | null
          intervention_id?: string
          measured_at?: string | null
          metric_name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_outcomes_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          action_taken: string
          created_at: string
          executed_at: string | null
          executed_by: string | null
          expected_outcome: string | null
          id: string
          intervention_type: string
          status: string | null
          trigger_metric: Json | null
          trigger_reason: string
          user_id: string
        }
        Insert: {
          action_taken: string
          created_at?: string
          executed_at?: string | null
          executed_by?: string | null
          expected_outcome?: string | null
          id?: string
          intervention_type: string
          status?: string | null
          trigger_metric?: Json | null
          trigger_reason: string
          user_id: string
        }
        Update: {
          action_taken?: string
          created_at?: string
          executed_at?: string | null
          executed_by?: string | null
          expected_outcome?: string | null
          id?: string
          intervention_type?: string
          status?: string | null
          trigger_metric?: Json | null
          trigger_reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "interventions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "interventions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "interventions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "interventions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "interventions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lecture_notes: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          last_watched_at: string | null
          lecture_id: string
          memo: string | null
          slide_url: string | null
          understood_extra: boolean | null
          understood_main: boolean | null
          understood_risk: boolean | null
          updated_at: string | null
          user_id: string
          video_url: string | null
          watch_progress: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          lecture_id: string
          memo?: string | null
          slide_url?: string | null
          understood_extra?: boolean | null
          understood_main?: boolean | null
          understood_risk?: boolean | null
          updated_at?: string | null
          user_id: string
          video_url?: string | null
          watch_progress?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          lecture_id?: string
          memo?: string | null
          slide_url?: string | null
          understood_extra?: boolean | null
          understood_main?: boolean | null
          understood_risk?: boolean | null
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
          watch_progress?: number | null
        }
        Relationships: []
      }
      lectures: {
        Row: {
          content_type: string | null
          course_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          external_url: string | null
          id: string
          is_required: boolean | null
          key_points: string[] | null
          lecture_date: string | null
          sequence_number: number | null
          slide_url: string | null
          title: string
          updated_at: string | null
          video_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          content_type?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          external_url?: string | null
          id?: string
          is_required?: boolean | null
          key_points?: string[] | null
          lecture_date?: string | null
          sequence_number?: number | null
          slide_url?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          content_type?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          external_url?: string | null
          id?: string
          is_required?: boolean | null
          key_points?: string[] | null
          lecture_date?: string | null
          sequence_number?: number | null
          slide_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lectures_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_schedule: {
        Row: {
          before_snapshot: Json | null
          created_at: string
          id: string
          intervention_id: string
          measure_at: string
          metrics: Json
          status: string | null
        }
        Insert: {
          before_snapshot?: Json | null
          created_at?: string
          id?: string
          intervention_id: string
          measure_at: string
          metrics: Json
          status?: string | null
        }
        Update: {
          before_snapshot?: Json | null
          created_at?: string
          id?: string
          intervention_id?: string
          measure_at?: string
          metrics?: Json
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "measurement_schedule_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      member_settings: {
        Row: {
          id: string
          max_risk_percent: number
          member_user_id: string
          note: string | null
          unlocked: boolean | null
          updated_at: string | null
          weekly_limit: number
        }
        Insert: {
          id?: string
          max_risk_percent?: number
          member_user_id: string
          note?: string | null
          unlocked?: boolean | null
          updated_at?: string | null
          weekly_limit?: number
        }
        Update: {
          id?: string
          max_risk_percent?: number
          member_user_id?: string
          note?: string | null
          unlocked?: boolean | null
          updated_at?: string | null
          weekly_limit?: number
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_active: boolean
          member_id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          is_active?: boolean
          member_id: string
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean
          member_id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      org_staff: {
        Row: {
          created_at: string
          organization_id: string
          role: string
          staff_user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role: string
          staff_user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: string
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_staff_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_staff_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_staff_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_staff_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      org_students: {
        Row: {
          created_at: string
          organization_id: string
          student_user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          student_user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          student_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_students_student_user_id_fkey"
            columns: ["student_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_students_student_user_id_fkey"
            columns: ["student_user_id"]
            isOneToOne: false
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_students_student_user_id_fkey"
            columns: ["student_user_id"]
            isOneToOne: false
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_students_student_user_id_fkey"
            columns: ["student_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: true
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: true
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: true
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_date: string
          payment_method: string | null
          status: string
          subscription_id: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string | null
          status?: string
          subscription_id?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string | null
          status?: string
          subscription_id?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pending_org_owners: {
        Row: {
          claimed_at: string | null
          created_at: string
          discord_user_id: string
          org_name: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          discord_user_id: string
          org_name: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          discord_user_id?: string
          org_name?: string
        }
        Relationships: []
      }
      pending_org_staff: {
        Row: {
          claimed_at: string | null
          created_at: string
          discord_user_id: string
          owner_discord_id: string
          role: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          discord_user_id: string
          owner_discord_id: string
          role: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          discord_user_id?: string
          owner_discord_id?: string
          role?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_xp: number
          display_name: string | null
          email: string | null
          last_login_date: string | null
          level: number
          login_streak: number
          member_id: string | null
          onboarding_completed: boolean
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_xp?: number
          display_name?: string | null
          email?: string | null
          last_login_date?: string | null
          level?: number
          login_streak?: number
          member_id?: string | null
          onboarding_completed?: boolean
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_xp?: number
          display_name?: string | null
          email?: string | null
          last_login_date?: string | null
          level?: number
          login_streak?: number
          member_id?: string | null
          onboarding_completed?: boolean
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_users: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          churn_reason: string | null
          created_at: string
          end_date: string | null
          id: string
          mrr_amount: number
          plan_type: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          churn_reason?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          mrr_amount: number
          plan_type: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          churn_reason?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          mrr_amount?: number
          plan_type?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trade_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          expected_value: string | null
          followup_sent_at: string | null
          gate_all_ok: boolean | null
          gate_risk_ok: boolean
          gate_rr_ok: boolean
          gate_rule_ok: boolean
          gate_trade_count_ok: boolean
          id: string
          log_type: string
          member_id: string | null
          occurred_at: string
          post_gate_kept: boolean | null
          post_within_hypothesis: boolean | null
          result: string | null
          reviewed_at: string | null
          ruleset_version: string
          success_prob: string | null
          teacher_note: string | null
          teacher_review: string | null
          teacher_reviewed_at: string | null
          unexpected_reason: string | null
          updated_at: string | null
          user_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expected_value?: string | null
          followup_sent_at?: string | null
          gate_all_ok?: boolean | null
          gate_risk_ok: boolean
          gate_rr_ok: boolean
          gate_rule_ok: boolean
          gate_trade_count_ok: boolean
          id?: string
          log_type: string
          member_id?: string | null
          occurred_at?: string
          post_gate_kept?: boolean | null
          post_within_hypothesis?: boolean | null
          result?: string | null
          reviewed_at?: string | null
          ruleset_version?: string
          success_prob?: string | null
          teacher_note?: string | null
          teacher_review?: string | null
          teacher_reviewed_at?: string | null
          unexpected_reason?: string | null
          updated_at?: string | null
          user_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expected_value?: string | null
          followup_sent_at?: string | null
          gate_all_ok?: boolean | null
          gate_risk_ok?: boolean
          gate_rr_ok?: boolean
          gate_rule_ok?: boolean
          gate_trade_count_ok?: boolean
          id?: string
          log_type?: string
          member_id?: string | null
          occurred_at?: string
          post_gate_kept?: boolean | null
          post_within_hypothesis?: boolean | null
          result?: string | null
          reviewed_at?: string | null
          ruleset_version?: string
          success_prob?: string | null
          teacher_note?: string | null
          teacher_review?: string | null
          teacher_reviewed_at?: string | null
          unexpected_reason?: string | null
          updated_at?: string | null
          user_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "trade_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_risk_queue"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "trade_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_unlock_candidates"
            referencedColumns: ["member_id"]
          },
        ]
      }
      trades: {
        Row: {
          created_at: string | null
          currency_pair: string | null
          entry_price: number | null
          entry_time: string | null
          exit_price: number | null
          exit_time: string | null
          id: string
          lot_size: number | null
          notes: string | null
          position_type: string | null
          profit_loss: number | null
          screenshot_url: string | null
          trade_date: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency_pair?: string | null
          entry_price?: number | null
          entry_time?: string | null
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          lot_size?: number | null
          notes?: string | null
          position_type?: string | null
          profit_loss?: number | null
          screenshot_url?: string | null
          trade_date?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency_pair?: string | null
          entry_price?: number | null
          entry_time?: string | null
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          lot_size?: number | null
          notes?: string | null
          position_type?: string | null
          profit_loss?: number | null
          screenshot_url?: string | null
          trade_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          discord_id: string
          id: string
          last_active_date: string | null
          level: number | null
          lifetime_value: number | null
          onboarding_completed: boolean | null
          streak_days: number | null
          subscription_start_date: string | null
          subscription_status: string | null
          total_xp: number | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          discord_id: string
          id?: string
          last_active_date?: string | null
          level?: number | null
          lifetime_value?: number | null
          onboarding_completed?: boolean | null
          streak_days?: number | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          total_xp?: number | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          discord_id?: string
          id?: string
          last_active_date?: string | null
          level?: number | null
          lifetime_value?: number | null
          onboarding_completed?: boolean | null
          streak_days?: number | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          total_xp?: number | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_behavior_change: {
        Row: {
          avg_trades_per_day_after: number | null
          avg_trades_per_day_before: number | null
          change_percentage: number | null
          first_learning_date: string | null
          trades_after_learning: number | null
          trades_before_learning: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_daily_trade_stats: {
        Row: {
          long_count: number | null
          short_count: number | null
          trade_count: number | null
          trade_date: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_learning_progress: {
        Row: {
          completed_lectures: number | null
          completion_percentage: number | null
          course_title: string | null
          total_lectures: number | null
          user_id: string | null
        }
        Relationships: []
      }
      admin_overtrading_detection: {
        Row: {
          risk_level: string | null
          trade_count: number | null
          trade_date: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_behavior_compliance_report"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_compliance_report_with_interventions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ltv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_user_stats: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_streak: number | null
          email: string | null
          level: number | null
          total_xp: number | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: never
          created_at?: string | null
          current_streak?: never
          email?: string | null
          level?: never
          total_xp?: never
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: never
          created_at?: string | null
          current_streak?: never
          email?: string | null
          level?: never
          total_xp?: never
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      v_behavior_compliance_report: {
        Row: {
          avg_subscription_months: number | null
          behavior_change_percent: number | null
          canceled_at: string | null
          churn_reason: string | null
          course_title: string | null
          current_subscription_end: string | null
          current_subscription_start: string | null
          email: string | null
          first_learning_date: string | null
          first_subscription_date: string | null
          last_overtrading_date: string | null
          learning_completion_rate: number | null
          lifetime_value: number | null
          monthly_revenue: number | null
          plan_type: string | null
          risk_detected: boolean | null
          subscription_status: string | null
          trades_after_learning: number | null
          trades_before_learning: number | null
          user_id: string | null
          user_registration_date: string | null
        }
        Relationships: []
      }
      v_churn_analysis: {
        Row: {
          active_users: number | null
          churn_month: string | null
          churn_rate_percent: number | null
          churned_users: number | null
          common_reasons: string | null
        }
        Relationships: []
      }
      v_compliance_report_with_interventions: {
        Row: {
          avg_subscription_months: number | null
          behavior_change_percent: number | null
          canceled_at: string | null
          churn_reason: string | null
          course_title: string | null
          current_subscription_end: string | null
          current_subscription_start: string | null
          email: string | null
          first_learning_date: string | null
          first_subscription_date: string | null
          improvement_percent: number | null
          intervention_count: number | null
          last_intervention_date: string | null
          last_intervention_type: string | null
          last_overtrading_date: string | null
          learning_completion_rate: number | null
          lifetime_value: number | null
          metrics_improved: string | null
          monthly_revenue: number | null
          plan_type: string | null
          risk_detected: boolean | null
          subscription_status: string | null
          trades_after_learning: number | null
          trades_before_learning: number | null
          user_id: string | null
          user_registration_date: string | null
        }
        Relationships: []
      }
      v_intervention_effectiveness: {
        Row: {
          avg_improvement: number | null
          completed: number | null
          intervention_type: string | null
          success_rate: number | null
          successful_cases: number | null
          total_interventions: number | null
          trigger_reason: string | null
        }
        Relationships: []
      }
      v_mrr_arr_summary: {
        Row: {
          active_subscribers: number | null
          annual_contribution_to_mrr: number | null
          arr: number | null
          avg_revenue_per_user: number | null
          monthly_mrr: number | null
          total_mrr: number | null
          trial_users: number | null
        }
        Relationships: []
      }
      v_review_queue: {
        Row: {
          display_name: string | null
          email: string | null
          expected_value: string | null
          gate_risk_ok: boolean | null
          gate_rr_ok: boolean | null
          gate_rule_ok: boolean | null
          gate_trade_count_ok: boolean | null
          log_id: string | null
          log_type: string | null
          member_id: string | null
          occurred_at: string | null
          post_gate_kept: boolean | null
          post_within_hypothesis: boolean | null
          success_prob: string | null
          teacher_note: string | null
          teacher_review: string | null
          teacher_reviewed_at: string | null
          unexpected_reason: string | null
          user_id: string | null
          voided_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "trade_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_risk_queue"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "trade_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_unlock_candidates"
            referencedColumns: ["member_id"]
          },
        ]
      }
      v_risk_queue: {
        Row: {
          alert_invalid: boolean | null
          alert_over_weekly: boolean | null
          alert_skip0: boolean | null
          display_name: string | null
          email: string | null
          invalid_7: number | null
          last_log_at: string | null
          last_log_id: string | null
          member_id: string | null
          skip_7: number | null
          user_id: string | null
          valid_7: number | null
          weekly_limit: number | null
        }
        Relationships: []
      }
      v_unfinished_queue: {
        Row: {
          display_name: string | null
          email: string | null
          followup_sent_at: string | null
          hours_since: number | null
          is_over_24h: boolean | null
          log_id: string | null
          member_id: string | null
          occurred_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "trade_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_risk_queue"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "trade_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_unlock_candidates"
            referencedColumns: ["member_id"]
          },
        ]
      }
      v_unlock_candidates: {
        Row: {
          display_name: string | null
          email: string | null
          invalid_count_14: number | null
          last_log_at: string | null
          member_id: string | null
          risk_ok_rate_14: number | null
          rule_ok_rate_14: number | null
          suggested_weekly_limit: number | null
          user_id: string | null
          valid_count_14: number | null
          weekly_limit: number | null
        }
        Relationships: []
      }
      v_user_ltv: {
        Row: {
          avg_subscription_months: number | null
          email: string | null
          first_subscription_date: string | null
          last_subscription_date: string | null
          lifetime_value: number | null
          subscription_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_weekly_counts: {
        Row: {
          attempts_week: number | null
          invalid_week: number | null
          user_id: string | null
          valid_week: number | null
          week_start_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      update_xp_and_streak: {
        Args: { p_action: Database["public"]["Enums"]["xp_action_type"] }
        Returns: {
          new_current_xp: number
          new_level: number
          new_login_streak: number
        }[]
      }
    }
    Enums: {
      xp_action_type:
        | "LOGIN"
        | "DAILY_LESSON_SKIP"
        | "TRADE_PRE"
        | "TRADE_POST"
        | "WEEKLY_LECTURE_NOTE"
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
      xp_action_type: [
        "LOGIN",
        "DAILY_LESSON_SKIP",
        "TRADE_PRE",
        "TRADE_POST",
        "WEEKLY_LECTURE_NOTE",
      ],
    },
  },
} as const
