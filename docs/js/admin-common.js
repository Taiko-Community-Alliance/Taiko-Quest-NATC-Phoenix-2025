// Minimal shared helpers for admin pages
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function supaFromConfig() {
  const { SUPABASE_URL, SUPABASE_KEY } = window.__ENV || {}
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase config')
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

export function redirectBase() {
  // strip hash; Supabase allow-list ignores fragments
  const location = window.location
  return `${location.origin}${location.pathname}${location.search}`
}

export function updateAuthUI(user, els) {
  const { signinBtn, signoutBtn, whoami } = els
  const loggedIn = !!user
  if (signinBtn)  signinBtn.classList.toggle('hidden', loggedIn)
  if (signoutBtn) signoutBtn.classList.toggle('hidden', !loggedIn)
  if (whoami)     whoami.textContent = loggedIn ? `Signed in as ${user.email}` : 'Not signed in'
}

export async function requireAdmin(supabase, ADMIN_DOMAIN, els) {
  // wires auth state + toggles buttons, ensures profile exists, checks role
  const { data:{ user } } = await supabase.auth.getUser()
  updateAuthUI(user, els)
  if (!user) return { user: null, admin: false }

  // upsert profile (self-only policies; no recursion)
  await supabase.from('profiles').upsert(
    { id: user.id, email: user.email, display_name: user.user_metadata?.full_name || '' },
    { onConflict: 'id' }
  )

  // optional domain gate
  const domainOk = !ADMIN_DOMAIN || (user.email?.endsWith(ADMIN_DOMAIN))
  if (!domainOk) return { user, admin: false }

  // role check
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return { user, admin: prof?.role === 'admin' }
}

export async function signInGoogle(supabase) {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectBase() }
  })
}
export async function signOut(supabase) {
  await supabase.auth.signOut(); location.reload()
}