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
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string
          title: string
          icon?: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          title?: string
          icon?: string
          color?: string
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
