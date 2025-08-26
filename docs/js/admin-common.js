// docs/js/admin-common.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function supaFromConfig() {
  const { SUPABASE_URL, SUPABASE_KEY } = window.__ENV || {}
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    alert('Missing Supabase config')
    throw new Error('Missing Supabase config')
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

// Build a redirect URL without hash (Supabase ignore URL fragments)
export function redirectBase() {
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}`
}

function toList(x) { return !x ? [] : Array.isArray(x) ? x : [x] }

function labelFrom(user) {
  return (
    user?.display_name ||
    user?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Signed in'
  )
}

// Updates BOTH desktop and mobile header instances via class hooks, and supports the single
// els you pass from pages (ids) to keep your current code working.
export function updateAuthUI(user, els = {}) {
  const loggedIn = !!user

  const whoElems = [
    ...toList(els.whoami),
    ...document.querySelectorAll('.js-whoami'),
  ]
  const signinElems = [
    ...toList(els.signinBtn),
    ...document.querySelectorAll('.js-signin'),
  ]
  const signoutElems = [
    ...toList(els.signoutBtn),
    ...document.querySelectorAll('.js-signout'),
  ]

  whoElems.forEach(el => {
    if (!el) return
    el.textContent = loggedIn ? `Signed in as ${labelFrom(user)}` : 'Not signed in'
  })
  signinElems.forEach(el => el && el.classList.toggle('hidden', loggedIn))
  signoutElems.forEach(el => el && el.classList.toggle('hidden', !loggedIn))
}

async function getSessionProfileAndAdmin(supabase, adminDomain) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, isAdmin: false }

  // Ensure profile exists (idempotent)
  const metaName = user.user_metadata?.full_name || user.user_metadata?.name || ''
  await supabase.from('profiles').upsert(
    { id: user.id, email: user.email, display_name: metaName },
    { onConflict: 'id' }
  )

  // Admin flag via admins table
  const { data: adminRow } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const domainOk = !adminDomain || (user.email?.toLowerCase().endsWith(adminDomain.toLowerCase()))
  const isAdmin = !!adminRow && domainOk
  return { user, isAdmin }
}

// Ensure profile exists + check admin; also keeps buttons in sync on auth changes
export async function requireAdmin(supabase, ADMIN_DOMAIN, els) {
  const { user, isAdmin } = await getSessionProfileAndAdmin(supabase, ADMIN_DOMAIN)
  updateAuthUI(user, els)
  supabase.auth.onAuthStateChange((_evt, session) => updateAuthUI(session?.user ?? null, els))
  return { user, admin: isAdmin }
}

export async function requireAdminOrRedirect(
  supabase,
  { adminDomain = null, redirectTo = '../request.html', els } = {}
) {
  const { user, isAdmin } = await getSessionProfileAndAdmin(supabase, adminDomain)
  updateAuthUI(user, els)
  supabase.auth.onAuthStateChange((_evt, session) => updateAuthUI(session?.user ?? null, els))

  if (!user || !isAdmin) {
    const target = new URL(redirectTo, window.location.href).toString()
    if (window.location.toString() !== target) {
      window.location.replace(target)
      return { user, admin: false, redirected: true }
    }
  }
  return { user, admin: true, redirected: false }
}

export async function signInGoogle(supabase) {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectBase() }
  })
}

export async function signOut(supabase) {
  await supabase.auth.signOut()
  window.location.reload()
}