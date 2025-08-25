// docs/js/user-common.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Create Supabase client from window.__ENV (config.js). */
export function supaFromConfig() {
  const { SUPABASE_URL, SUPABASE_KEY } = window.__ENV || {}
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase config')
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

/** Return a hash-less redirect URL (Supabase allowlist ignores fragments). */
export function redirectBase() {
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}`
}

/** Ensure a profile exists for the current user and return it. */
export async function ensureProfile(supabase) {
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) return { user:null, profile:null }
  const metaName = user.user_metadata?.full_name || user.user_metadata?.name || ''
  await supabase.from('profiles').upsert(
    { id: user.id, email: user.email, display_name: metaName },
    { onConflict: 'id' }
  )
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('email, display_name, consent, approved')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw error
  return { user, profile }
}

/**
 * Gate check:
 * - returns { user, profile, needsConsent, approved, regStatus }
 * - if not approved, checks registrations.status by email (approved/pending/rejected/null)
 */
export async function gateCheck(supabase) {
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) return { user:null, profile:null, needsConsent:false, approved:false, regStatus:null }

  const { profile } = await ensureProfile(supabase)
  const needsConsent = !profile?.consent
  const approved = !!profile?.approved
  let regStatus = null

  if (!approved) {
    const { data: reg } = await supabase
      .from('registrations')
      .select('status')
      .eq('email', user.email)
      .maybeSingle()
    regStatus = reg?.status ?? null
  }
  return { user, profile, needsConsent, approved, regStatus }
}

/** Require an approved attendee; otherwise redirect (default to ./access.html). */
export async function requireApprovedOrRedirect(supabase, { redirectTo = './access.html' } = {}) {
  const { user, profile, needsConsent, approved } = await gateCheck(supabase)
  if (!user) {
    window.location.replace(redirectTo)
    return { redirected:true }
  }
  if (needsConsent || !approved) {
    // Let access.html handle consent + pending gate
    if (window.location.pathname.endsWith('/board.html')) {
      window.location.replace(redirectTo)
      return { redirected:true }
    }
  }
  return { user, profile, redirected:false }
}

/** Mark consent = true for the current user. */
export async function agreeConsent(supabase) {
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ consent:true }).eq('id', user.id)
}

/** Send an email magic link with basic guards; return { ok, error } for the UI. */
export async function sendMagicLink(supabase, email) {
  if (!email) return { ok:false, error:'Email required' }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectBase() }
  })
  return { ok: !error, error: error?.message || null }
}

/** Ensure a quest board exists; if not, create one with 25 items (level-balanced). */
export async function ensureBoard(supabase, userId) {
  const { data: existing, error: e1 } = await supabase
    .from('quest_boards')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (e1) throw e1
  if (existing) return existing

  // Pull active questions
  const { data: allQs, error: qErr } = await supabase
    .from('questions')
    .select('id, level')
    .eq('active', true)
  if (qErr) throw qErr
  if (!allQs?.length) throw new Error('No active questions found.')

  // Level targets (tweak as you like)
  const LEVEL_TARGETS = { easy: 13, medium: 9, hard: 3 }

  const byLevel = { easy: [], medium: [], hard: [] }
  for (const q of allQs) (byLevel[q.level] || (byLevel[q.level] = [])).push(q)

  function pick(arr, n) {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
    return a.slice(0, n)
  }

  let selected = []
  for (const lvl of ['easy','medium','hard']) {
    const want = LEVEL_TARGETS[lvl]
    const got = Math.min(want, byLevel[lvl]?.length || 0)
    selected = selected.concat(pick(byLevel[lvl] || [], got))
  }
  if (selected.length < 25) {
    const remaining = allQs.filter(q => !selected.some(s => s.id === q.id))
    selected = selected.concat(pick(remaining, Math.max(0, 25 - selected.length)))
  }
  selected = selected.slice(0, 25)

  const { data: boards, error: bErr } = await supabase
    .from('quest_boards')
    .insert({ user_id: userId })
    .select()
  if (bErr) throw bErr
  const board = boards[0]

  const items = selected.map(q => ({ board_id: board.id, question_id: q.id }))
  const { error: biErr } = await supabase.from('board_items').insert(items)
  if (biErr) throw biErr

  return board
}

/** Load board items w/ joined question text. */
export async function getBoardItems(supabase, boardId) {
  const { data, error } = await supabase
    .from('board_items')
    .select('id, proof_url, verified, questions(text)')
    .eq('board_id', boardId)
  if (error) throw error
  return data || []
}

/** Upload proof into `proofs` bucket and save the public URL to board_items. */
export async function uploadProof(supabase, itemId, file) {
  const isVideo = file.type.startsWith('video/')
  const max = isVideo ? 10 * 1024 * 1024 : 2 * 1024 * 1024
  if (file.size > max) throw new Error(`File too large. Max ${isVideo ? '10MB video' : '2MB photo'}.`)

  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const ext = (file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase().replace(/[^\w]/g,'')
  const path = `${user.id}/${itemId}/${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage.from('proofs').upload(path, file, { upsert: true })
  if (upErr) throw upErr

  const { data: pub } = supabase.storage.from('proofs').getPublicUrl(path)
  const { error: saveErr } = await supabase
    .from('board_items')
    .update({ proof_url: pub.publicUrl })
    .eq('id', itemId)
  if (saveErr) throw saveErr
}

export async function signOut(supabase) {
  await supabase.auth.signOut()
  window.location.replace('./access.html')
}