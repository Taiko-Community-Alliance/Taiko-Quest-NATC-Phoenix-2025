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

function labelFrom(user, profile) {
  // Accepts either a Supabase user object or a { name, email, display_name } shape
  return (
    profile?.display_name ||
    user?.display_name ||
    user?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Signed in'
  )
}

export function updateAuthUI(user, els = {}) {
  const { signinBtn, signoutBtn, whoami } = els
  const loggedIn = !!user
  if (signinBtn)  signinBtn.classList.toggle('hidden', loggedIn)
  if (signoutBtn) signoutBtn.classList.toggle('hidden', !loggedIn)
  if (whoami)     whoami.textContent = loggedIn ? `Signed in as ${labelFrom(user)}` : 'Not signed in'
}

async function getSessionProfileAndAdmin(supabase, adminDomain) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null, isAdmin: false }

  // Ensure profile exists (idempotent)
  const metaName = user.user_metadata?.full_name || user.user_metadata?.name || ''
  await supabase.from('profiles').upsert(
    { id: user.id, email: user.email, display_name: metaName },
    { onConflict: 'id' }
  )

  // We actually need display_name & approved for UI; role is deprecated
  const { data: profile } = await supabase
    .from('profiles