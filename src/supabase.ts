import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseUrl = rawSupabaseUrl
  ? rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
  : undefined

export const supabaseConfigError: string | null =
  !supabaseUrl || !supabaseAnonKey
    ? 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env'
    : null

export const supabase: SupabaseClient<Database> | null = (() => {
  if (supabaseConfigError || !supabaseUrl || !supabaseAnonKey) return null
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
})()
