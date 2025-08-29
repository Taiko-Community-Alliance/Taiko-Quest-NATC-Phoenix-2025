// docs/js/user-common.js
// Shared helpers for user pages (Access, Tracks, Board)
// Phoenix conference timezone by default.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* -------------------------------------------------------
 * Config / Client
 * ----------------------------------------------------- */

export const EVENT_TZ = 'America/Phoenix' // conference local time

export const CONF_START = new Date('2025-08-29T00:00:00-07:00');
export const MAX_DAYS   = 4;

export function supaFromConfig() {
  const { SUPABASE_URL, SUPABASE_KEY } = window.__ENV || {}
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase config')
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

export function redirectBaseNoHash() {
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}` // fragments are ignored by Supabase allow-list
}

/* -------------------------------------------------------
 * Date helpers (Phoenix local “today”)
 * ----------------------------------------------------- */

export function todayStrTZ(tz = EVENT_TZ) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date())
  const y = parts.find(p => p.type === 'year')?.value
  const m = parts.find(p => p.type === 'month')?.value
  const d = parts.find(p => p.type === 'day')?.value
  return `${y}-${m}-${d}` // YYYY-MM-DD
}

export function todayStrAZ() {
  return todayStrTZ('America/Phoenix')
}

/* -------------------------------------------------------
 * Auth / Profile / Gate
 * ----------------------------------------------------- */

export async function sendMagicLink(supabase, email, redirectTo = redirectBaseNoHash()) {
  if (!email) return { ok: false, error: 'Email required' }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function signOut(supabase) {
  await supabase.auth.signOut()
}

/** Ensure a profile row for current user; return { user, profile } */
export async function ensureProfile(supabase) {
  const { data: { user }, error: uErr } = await supabase.auth.getUser()
  if (uErr) throw uErr
  if (!user) return { user: null, profile: null }

  // Upsert is safe with RLS “self” policies
  await supabase.from('profiles').upsert(
    { id: user.id, email: user.email, display_name: user.user_metadata?.full_name || '' },
    { onConflict: 'id' }
  )
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id,email,display_name,consent')
    .eq('id', user.id).maybeSingle()
  if (pErr) throw pErr
  return { user, profile }
}

/** Access-page gate: checks consent + registration approval (via registrations.status) */
export async function gateCheck(supabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null, needsConsent: false, approved: false, regStatus: null }

  // Ensure profile exists on first sign-in
  await supabase.from('profiles').upsert(
    { id: user.id, email: user.email, display_name: user.user_metadata?.full_name || '' },
    { onConflict: 'id' }
  )

  const { data: profile } = await supabase
    .from('profiles').select('consent').eq('id', user.id).maybeSingle()
  const needsConsent = !profile?.consent

  const { data: reg } = await supabase
    .from('registrations').select('status').eq('email', user.email).maybeSingle()
  const regStatus = reg?.status || null
  const approved = regStatus === 'approved'

  return { user, profile, needsConsent, approved, regStatus }
}

/** Require: signed in + consented + registration approved, else redirect */
export async function requireApprovedOrRedirect(supabase, { redirectTo = './access.html' } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { window.location.replace(redirectTo); return { redirected: true } }

  const { data: prof } = await supabase.from('profiles').select('consent').eq('id', user.id).maybeSingle()
  if (!prof?.consent) { window.location.replace(redirectTo); return { redirected: true } }

  const { data: reg } = await supabase.from('registrations').select('status').eq('email', user.email).maybeSingle()
  if (reg?.status !== 'approved') { window.location.replace(redirectTo); return { redirected: true } }

  return { redirected: false }
}

export async function agreeConsent(supabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')
  const { error } = await supabase.from('profiles').update({ consent: true }).eq('id', user.id)
  if (error) throw new Error(error.message)
  return { ok: true }
}

/* -------------------------------------------------------
 * Classic “25 tile” fallback board (optional)
 * ----------------------------------------------------- */

const LEVEL_TARGETS_25 = { 1: 13, 2: 9, 3: 3, 4: 0 }

/* -------------------------------------------------------
 * Track-per-day boards (4 + 1 bonus)
 * ----------------------------------------------------- */

/** Get all boards for the user */
export async function getUserBoards(supabase, userId, dayDate) {
  const { data, error } = await supabase
    .from('quest_boards')
    .select('id, track, day_no, created_at')
    .eq('user_id', userId)
  if (error) throw error

  if (!data) {

  }
  return data || []
}

/** Recent boards for history */
export async function listRecentBoards(supabase, userId) {
  const { data, error } = await supabase
    .from('quest_boards')
    .select('id, track, day_no, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** Count boards completed per track for a user (client-side group) */
export async function trackStatsForUser(supabase, userId) {
  const { data, error } = await supabase
    .from('quest_boards')
    .select('track')
    .eq('user_id', userId)
  if (error) throw error
  const stats = {}
  for (const row of (data || [])) {
    const t = row.track || 'unknown'
    stats[t] = (stats[t] || 0) + 1
  }
  return stats
}

/**
 * Ensure a board for today & a specific track, with 4 main + 1 bonus question.
 * Enforces 1 board per day (any track) by checking any existing board today.
 * Assumes quest_boards has (user_id, track text, day_no date).
 * Optionally, board_items has is_bonus boolean (remove if your schema lacks it).
 */
export async function ensureTrackBoardForToday(supabase, userId, track) {
  const nowPhoenix = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' }));
  const midnight   = new Date(nowPhoenix.getFullYear(), nowPhoenix.getMonth(), nowPhoenix.getDate());
  const dayOffset  = Math.floor((midnight - CONF_START) / (24 * 60 * 60 * 1000)) + 1;

  const { data: existing } = await supabase
    .from('quest_boards')
    .select('id')
    .eq('user_id', userId)
    .eq('track', track)
    .maybeSingle()
  if (existing) return existing

  // Create the quest board
  const { data: board, error: bErr } = await supabase
    .from('quest_boards')
    .insert([
      { user_id: userId, track: track, day_no: dayOffset, status: 'open' }
    ])
    .select('id')
    .maybeSingle()
  
  if (bErr) throw bErr

  // Pull 5 questions from this track/category
  const { data: pool, error: qErr } = await supabase
    .from('questions')
    .select('id, level, text, category, active')
    .eq('active', true)
    .eq('category', track)
  if (qErr) throw qErr
  if (!pool?.length || pool.length < 5) throw new Error('Not enough active questions in this track')

  const main = shuffleAndTake(pool, 4) // add level filter
  const remaining = pool.filter(q => !main.some(m => m.id === q.id))
  const bonus = shuffleAndTake(remaining, 1) // special level

  console.log('Selected questions:', main, bonus)

  // Insert items (set is_bonus if your schema has it)
  const items = [
    ...main.map(q => ({ board_id: board.id, question_id: q.id, is_bonus: true && false })), // keep field if exists
    { board_id: board.id, question_id: bonus[0].id, is_bonus: true }
  ]
  // If your schema does not have is_bonus, strip it:
  const hasIsBonus = true // flip to false if you removed the column
  const payload = hasIsBonus ? items : items.map(({ is_bonus, ...rest }) => rest)

  console.log('Inserting items:', payload)
  const { error: iErr } = await supabase.from('board_items').insert(payload)
  if (iErr) throw iErr

  return board
}

function shuffleAndTake(arr, n) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

/* -------------------------------------------------------
 * Board data + uploads
 * ----------------------------------------------------- */

export async function getBoardItems(supabase, boardId) {
  const { data, error } = await supabase
    .from('board_items')
    .select('id, proof_url, verified, is_bonus, question(text, level, category)')
    .eq('board_id', boardId)
  if (error) throw error
  return data || []
}

export async function uploadProof(supabase, itemId, file) {
  const isVideo = file.type.startsWith('video/')
  const max = isVideo ? 10 * 1024 * 1024 : 2 * 1024 * 1024
  if (file.size > max) throw new Error(`File too large (max ${isVideo ? '10MB video' : '2MB photo'})`)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const ext = (file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase().replace(/[^\w]/g, '')
  const path = `${user.id}/${itemId}/${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage.from('proofs').upload(path, file, { upsert: true })
  if (upErr) throw new Error(upErr.message)

  const { data: pub } = supabase.storage.from('proofs').getPublicUrl(path)
  const { error: saveErr } = await supabase.from('board_items').update({ proof_url: pub.publicUrl }).eq('id', itemId)
  if (saveErr) throw new Error(saveErr.message)
  return { ok: true, url: pub.publicUrl }
}
