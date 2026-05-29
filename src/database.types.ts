export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ListTimeFrame = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Database {
  public: {
    Tables: {
      lists: {
        Row: {
          id: number
          user_id: string
          title: string
          icon: string
          color: string
          pinned_at: string | null
          created_at: string
          time_frame: ListTimeFrame
          current_period_started_at: string | null
          next_reset_at: string | null
        }
        Insert: {
          id?: number
          user_id?: string
          title: string
          icon?: string
          color?: string
          pinned_at?: string | null
          created_at?: string
          time_frame?: ListTimeFrame
          current_period_started_at?: string | null
          next_reset_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          title?: string
          icon?: string
          color?: string
          pinned_at?: string | null
          created_at?: string
          time_frame?: ListTimeFrame
          current_period_started_at?: string | null
          next_reset_at?: string | null
        }
        Relationships: []
      }
      todos: {
        Row: {
          id: number
          list_id: number
          task: string
          is_complete: boolean
          completed_at: string | null
          target_count: number
          progress_count: number
          created_at: string
        }
        Insert: {
          id?: number
          list_id: number
          task: string
          is_complete?: boolean
          completed_at?: string | null
          target_count?: number
          progress_count?: number
          created_at?: string
        }
        Update: {
          id?: number
          list_id?: number
          task?: string
          is_complete?: boolean
          completed_at?: string | null
          target_count?: number
          progress_count?: number
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          created_at: string
          timezone: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          created_at?: string
          timezone?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          created_at?: string
          timezone?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          user_a_id: string
          user_b_id: string
          created_at: string
        }
        Insert: {
          user_a_id: string
          user_b_id: string
          created_at?: string
        }
        Update: {
          user_a_id?: string
          user_b_id?: string
          created_at?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          id: string
          email: string
          invited_by: string
          created_at: string
          accepted_at: string | null
          accepted_by: string | null
        }
        Insert: {
          id?: string
          email: string
          invited_by: string
          created_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
        }
        Update: {
          id?: string
          email?: string
          invited_by?: string
          created_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
        }
        Relationships: []
      }
      list_period_history: {
        Row: {
          id: number
          list_id: number
          user_id: string
          period_start: string
          period_end: string
          time_frame: Exclude<ListTimeFrame, 'none'>
          total_count: number
          completed_count: number
          completed_all: boolean
          created_at: string
        }
        Insert: {
          id?: number
          list_id: number
          user_id: string
          period_start: string
          period_end: string
          time_frame: Exclude<ListTimeFrame, 'none'>
          total_count: number
          completed_count: number
          completed_all: boolean
          created_at?: string
        }
        Update: {
          id?: number
          list_id?: number
          user_id?: string
          period_start?: string
          period_end?: string
          time_frame?: Exclude<ListTimeFrame, 'none'>
          total_count?: number
          completed_count?: number
          completed_all?: boolean
          created_at?: string
        }
        Relationships: []
      }
      todo_period_history: {
        Row: {
          id: number
          list_period_history_id: number
          todo_id: number | null
          task: string
          was_completed: boolean
        }
        Insert: {
          id?: number
          list_period_history_id: number
          todo_id?: number | null
          task: string
          was_completed: boolean
        }
        Update: {
          id?: number
          list_period_history_id?: number
          todo_id?: number | null
          task?: string
          was_completed?: boolean
        }
        Relationships: []
      }
      badges_awarded: {
        Row: {
          id: number
          user_id: string
          badge_key: string
          awarded_at: string
          metadata: Json
        }
        Insert: {
          id?: number
          user_id: string
          badge_key: string
          awarded_at?: string
          metadata?: Json
        }
        Update: {
          id?: number
          user_id?: string
          badge_key?: string
          awarded_at?: string
          metadata?: Json
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      award_instant_badges_for_list: {
        Args: { p_list_id: number }
        Returns: void
      }
      award_lifetime_badges: {
        Args: Record<string, never>
        Returns: void
      }
      evaluate_user_badges: {
        Args: Record<string, never>
        Returns: void
      }
      compute_next_reset_at: {
        Args: { p_list_id: number }
        Returns: string | null
      }
      reset_due_lists: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
