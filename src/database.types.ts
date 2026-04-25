export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
        }
        Insert: {
          id?: number
          user_id?: string
          title: string
          icon?: string
          color?: string
          pinned_at?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          title?: string
          icon?: string
          color?: string
          pinned_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          id: number
          list_id: number
          task: string
          is_complete: boolean
          created_at: string
        }
        Insert: {
          id?: number
          list_id: number
          task: string
          is_complete?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          list_id?: number
          task?: string
          is_complete?: boolean
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
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          created_at?: string
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
