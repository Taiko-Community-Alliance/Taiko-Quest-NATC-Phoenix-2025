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
  // strip hash; Supabase allow-list ignores fragments
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}`
}

export function updateAuthUI(user, els = {}) {
  const { signinBtn, signoutBtn, whoami } = els
  const loggedIn = !!user
  if (signinBtn)  signinBtn.classList.toggle('hidden', loggedIn)
  if (signoutBtn) signoutBtn.classList.toggle('hidden', !loggedIn)
  if (whoami)     whoami.textContent = loggedIn ? `Signed in as ${user.display_name || user.email}` : 'Not signed in'
}

async function getSessionProfileAndAdmin(supabase, adminDomain) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null, isAdmin: false, displayName: null }

  const metaName = user.user_metadata?.full_name || user.user_metadata?.name || ''
  await supabase.from('profiles').upsert(
    { id: user.id, email: user.email, display_name: metaName },
    { onConflict: 'id' }
  )

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

  const { data: adminRow } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()

  const domainOk = !adminDomain || (user.email?.toLowerCase().endsWith(adminDomain.toLowerCase()))
  const isAdmin = !!adminRow && domainOk
  const displayName = profile?.display_name || metaName || user.email || 'Signed in'

  return { user, profile, isAdmin, displayName }
}

// Ensure profile exists + check admin role; optional domain gate
export async function requireAdmin(supabase, ADMIN_DOMAIN, els) {
  // wires auth state + toggles buttons, ensures profile exists, checks role
  const { user, profile, isAdmin, displayName } = await getSessionProfileAndAdmin(supabase, ADMIN_DOMAIN)
  updateAuthUI(user ? {name: displayName, email: user?.email} : null, els)
  return { user, profile, admin: isAdmin }
}

export async function requireAdminOrRedirect(supabase, { adminDomain, requireApproved = false, redirectTo = '.../access.html', els} = {}) {
  const { user, profile, isAdmin, displayName } = await getSessionProfileAndAdmin(supabase, adminDomain)
  updateAuthUI(user ? {name: displayName, email: user?.email} : null, els)
  if (!user) return { user: null, profile: null, admin: false, redirect: false }

  const needsRedirect = (!isAdmin) || (requireApproved && profile?.approved)
  if (needsRedirect) {
    const target = new URL(redirectTo, window.location.href).toString()
    if (window.location.toStging() !== target) {
      window.location.replace(target)
      return { user, profile, admin: false, redirect: true }
    }
  }
  return { user, profile, admin: true, redirect: false }
}

export async function signInGoogle(supabase) {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectBase() }
  })
}

export async function signOut(supabase) {
  await supabase.auth.signOut(); window.location.reload()
}