// docs/js/user-common.js (add/replace these parts)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function supaFromConfig() {
  const { SUPABASE_URL, SUPABASE_KEY } = window.__ENV || {}
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase config')
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

export async function requireApprovedOrRedirect(supabase, { redirectTo = './access.html' } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { window.location.href = redirectTo; return { redirected:true } }
  await supabase.from('profiles').upsert(
    { id:user.id, email:user.email, display_name: user.user_metadata?.full_name || '' },
    { onConflict:'id' }
  )
  const { data: prof } = await supabase.from('profiles')
    .select('consent,approved').eq('id', user.id).maybeSingle()
  if (!prof?.consent || !prof?.approved) { window.location.href = redirectTo; return { redirected:true } }
  return { redirected:false, user, profile: prof }
}

export async function ensureProfile(supabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No session')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return { user, profile }
}

export async function getOrCreateBoard(supabase, dayNo) {
  const { data: { user } } = await supabase.auth.getUser()
  let { data: board } = await supabase.from('quest_boards')
    .select('id').eq('user_id', user.id).eq('day_no', dayNo).maybeSingle()
  if (!board) {
    const ins = await supabase.from('quest_boards')
      .insert({ user_id: user.id, day_no: dayNo })
      .select().single()
    if (ins.error) throw ins.error
    board = ins.data
  }
  return board
}

/** Generate NORMAL items only (4). Idempotent per (board, track). */
export async function generateNormalsForTrack(supabase, boardId, track, normalCount = 4) {
  // Already have normals for this track?
  const { data: existing } = await supabase.from('board_items')
    .select('id,is_bonus').eq('board_id', boardId).ilike('track', track)
  const haveNormals = (existing || []).some(it => !it.is_bonus)
  if (haveNormals) return

  // Pool for this track
  const { data: pool, error } = await supabase.from('questions')
    .select('id, level, text').eq('active', true).ilike('category', track)
  if (error) throw error
  if (!pool?.length) throw new Error('No questions for this track.')

  const shuffle = (a)=>{ const x=a.slice(); for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]]} return x }
  const normals = shuffle(pool).slice(0, normalCount)
  const items = normals.map(q => ({ board_id: boardId, question_id: q.id, track, is_bonus: false }))

  const ins = await supabase.from('board_items').insert(items)
  if (ins.error && !String(ins.error.message||'').toLowerCase().includes('duplicate'))
    throw ins.error
}

/** Draw ONE bonus if eligible. Idempotent: does nothing if bonus exists. */
export async function drawBonusMission(supabase, boardId, track, bonusLevel = 4) {
  // If bonus already exists, bail
  const { count: bonusCount } = await supabase.from('board_items')
    .select('id', { count:'exact', head:true })
    .eq('board_id', boardId).ilike('track', track).eq('is_bonus', true)
  if ((bonusCount || 0) > 0) return { created:false }

  // Eligibility: all 4 normals verified
  const { data: normals } = await supabase.from('board_items')
    .select('id,verified,is_bonus').eq('board_id', boardId).ilike('track', track)
  const normalList = (normals || []).filter(it => !it.is_bonus)
  const allFourVerified = normalList.length >= 4 && normalList.every(it => it.verified === true)
  if (!allFourVerified) throw new Error('Bonus available only after all 4 are verified.')

  // Pick a Lv 4 first, fallback to any in track not yet on this board/track
  const { data: pool } = await supabase.from('questions')
    .select('id, level').eq('active', true).ilike('category', track)
  const chosenIds = new Set((normals || []).map(it => it.question_id))
  const candidatesLv4 = (pool || []).filter(q => Number(q.level) === Number(bonusLevel) && !chosenIds.has(q.id))
  const candidatesAny = (pool || []).filter(q => !chosenIds.has(q.id))
  const pick = (arr)=>arr[Math.floor(Math.random()*arr.length)]
  const bonus = (candidatesLv4.length ? pick(candidatesLv4) : pick(candidatesAny))
  if (!bonus) throw new Error('No bonus question available for this track.')

  const ins = await supabase.from('board_items')
    .insert({ board_id: boardId, question_id: bonus.id, track, is_bonus: true })
    .select().single()
  if (ins.error && !String(ins.error.message||'').toLowerCase().includes('duplicate')) throw ins.error
  return { created:true, item: ins.data }
}

export async function getBoardItems(supabase, boardId) {
  const { data, error } = await supabase.from('board_items')
    .select('id, proof_url, verified, track, is_bonus, submitted_at, verified_at, verified_by, questions(text,level)')
    .eq('board_id', boardId)
  if (error) throw error
  return data || []
}

export async function uploadProof(supabase, itemId, file) {
  const isVideo = file.type.startsWith('video/')
  const max = isVideo ? 10 * 1024 * 1024 : 2 * 1024 * 1024
  if (file.size > max) throw new Error(`File too large (max ${isVideo ? '10MB video' : '2MB photo'})`)

  const { data: { user } } = await supabase.auth.getUser()
  const ext = (file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase().replace(/[^\w]/g,'')
  const path = `${user.id}/${itemId}/${Date.now()}.${ext}`

  const up = await supabase.storage.from('proofs').upload(path, file, { upsert: true })
  if (up.error) throw up.error

  const { data: pub } = supabase.storage.from('proofs').getPublicUrl(path)
  const upd = await supabase.from('board_items').update({
    proof_url: pub.publicUrl,
    submitted_at: new Date().toISOString()
  }).eq('id', itemId).select().single()
  if (upd.error) throw upd.error
  return upd.data
}

export async function signOut(supabase) {
  await supabase.auth.signOut()
  window.location.href = './access.html'
}