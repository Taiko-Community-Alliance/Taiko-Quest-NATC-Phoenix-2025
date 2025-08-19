import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function supaFromConfig() {
  const { SUPABASE_URL, SUPABASE_KEY } = window.__ENV || {}
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    alert('Missing Supabase config'); throw new Error('Missing Supabase config')
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

// Build a redirect URL without hash
export function redirectBase() {
  return `${location.origin}${location.pathname}${location.search}`
}

// Show who’s signed in (or not)
export function updateAuthUI(userLike, els) {
  const { signinBtn, signoutBtn, whoami } = els || {}
  const loggedIn = !!userLike
  if (signinBtn)  signinBtn.classList.toggle('hidden', loggedIn)
  if (signoutBtn) signoutBtn.classList.toggle('hidden', !loggedIn)
  if (whoami)     whoami.textContent = loggedIn
    ? `Signed in as ${userLike.name || userLike.email}`
    : 'Not signed in'
}

// Ensure profile exists + check admin role; optional domain gate
export async function requireAdmin(supabase, ADMIN_DOMAIN, els) {
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) {
    updateAuthUI(null, els)
    return { user: null, profile: null, admin: false }
  }

  // 1) Best-effort guess of a display name from auth metadata
  const metaName = user.user_metadata?.full_name || user.user_metadata?.name || ''

  // 2) Upsert profile (id/email + an initial display_name if we have one)
  await supabase.from('profiles').upsert(
    { id: user.id, email: user.email, display_name: metaName },
    { onConflict: 'id' }
  )

  // 3) Read profile (now authoritative for name + role)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('display_name, role, email')
    .eq('id', user.id)
    .maybeSingle()

  // Robust display name fallback chain
  const displayName = profile?.display_name || metaName || user.email || 'Signed in'

  // Update header UI immediately
  updateAuthUI({ name: displayName, email: user.email }, els)

  // Domain “gate” for UI (RLS still enforces)
  const domainOk = !ADMIN_DOMAIN || (user.email?.toLowerCase().endsWith(ADMIN_DOMAIN.toLowerCase()))

  return {
    user,
    profile,           // { display_name, role, email } or null
    admin: !!(domainOk && profile?.role === 'admin')
  }
}

export async function signInGoogle(supabase) {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectBase() }
  })
}

export async function signOut(supabase) {
  await supabase.auth.signOut()
  location.reload()
}