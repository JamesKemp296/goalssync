#!/usr/bin/env node
/**
 * Invoke weekly-recap-push on the linked Supabase project.
 *
 * Gateway auth: anon key (matches Supabase dashboard when JWT verify is OFF)
 * Function auth: CRON_SECRET via x-cron-secret header
 *
 * Set in .env or export:
 *   CRON_SECRET=...  (same value as Supabase Edge Function secret)
 *
 *   npm run invoke:function:weekly-recap-push
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvValue(name) {
  if (process.env[name]?.trim()) return process.env[name].trim()
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return undefined
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    if (key !== name) continue
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    return value
  }
  return undefined
}

const cronSecret = process.env.CRON_SECRET?.trim() || loadEnvValue('CRON_SECRET')
if (!cronSecret) {
  console.error(
    'Missing CRON_SECRET.\n\n' +
      '  1. Generate one: openssl rand -base64 32\n' +
      '  2. Set on Supabase: npx supabase secrets set CRON_SECRET=...\n' +
      '  3. Add to .env: CRON_SECRET=...\n' +
      '  4. Redeploy: npm run deploy:function:weekly-recap-push',
  )
  process.exit(1)
}

const anonKey =
  process.env.SUPABASE_ANON_KEY?.trim() || loadEnvValue('VITE_SUPABASE_ANON_KEY')
if (!anonKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabaseUrl = loadEnvValue('VITE_SUPABASE_URL')
if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL in .env')
  process.exit(1)
}

const projectBase = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
const functionUrl = `${projectBase}/functions/v1/weekly-recap-push`

/** @type {Record<string, string>} */
const headers = {
  Authorization: `Bearer ${anonKey}`,
  apikey: anonKey,
  'Content-Type': 'application/json',
  'x-cron-secret': cronSecret,
}

console.log(`POST ${functionUrl}`)

const res = await fetch(functionUrl, { method: 'POST', headers, body: '{}' })
const text = await res.text()

console.log(`HTTP ${res.status}`)
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2))
} catch {
  console.log(text)
}

if (!res.ok) process.exit(1)
