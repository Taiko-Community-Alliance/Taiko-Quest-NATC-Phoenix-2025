// docs/js/header.js
// Injects a responsive header with "Taiko Quest" (link) + "Taiko Community Alliance" subheader.
// Use `admin: true` on /docs/admin/* pages to fix relative paths.
// Pass `nav` as an array of [label, href]. Set `withAuth: true` to render
// placeholders with IDs: #whoami, #signin, #signout (your auth code can bind to these).

export function renderHeader({ admin = false, nav = [], withAuth = false } = {}) {
  const base = admin ? '..' : '.'
  const home = admin ? '../index.html' : './index.html'

  const navLinks = nav.map(([label, href]) =>
    `<a href="${href}" class="px-3 py-2 rounded-lg hover:bg-gray-100 text-sm">${escapeHtml(label)}</a>`
  ).join('')

  const authHTML = withAuth ? `
    <span id="whoami" class="hidden sm:inline text-sm text-gray-600">Checking session…</span>
    <button id="signin" class="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm">Sign in</button>
    <button id="signout" class="px-3 py-2 rounded-lg bg-gray-200 text-gray-900 text-sm hidden">Sign out</button>
  ` : ''

  return `
<header class="bg-white/90 backdrop-blur shadow-sm">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
    <a href="${home}" class="group flex items-center gap-3">
      <img src="${base}/assets/brand/TCA-Logo.png" alt="TCA Logo" class="h-8 w-auto" onerror="this.style.display='none'">
      <div>
        <div class="font-semibold text-lg group-hover:underline">Taiko Quest · NATC Phoenix 2025</div>
        <div class="text-xs text-gray-600">Taiko Community Alliance</div>
      </div>
    </a>

    <!-- Desktop nav -->
    <nav class="hidden sm:flex items-center gap-2">
      ${navLinks}
      ${authHTML}
    </nav>

    <!-- Mobile controls -->
    <button id="menuBtn" class="sm:hidden p-2 rounded-lg border border-gray-200" aria-label="Open menu" aria-controls="mobileNav" aria-expanded="false">
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    </button>
  </div>

  <!-- Mobile nav -->
  <div id="mobileNav" class="sm:hidden hidden border-t border-gray-100">
    <div class="px-4 py-3 flex flex-col gap-2">
      ${nav.map(([label, href]) =>
        `<a href="${href}" class="px-3 py-2 rounded-lg hover:bg-gray-100 text-sm">${escapeHtml(label)}</a>`
      ).join('')}
      ${withAuth ? `
        <div class="flex items-center gap-2 pt-2">
          <!-- Use a UNIQUE id here to avoid duplicate IDs -->
          <span id="whoamiMobile" class="text-sm text-gray-600">Checking session…</span>
          <!-- We intentionally DO NOT duplicate signin/signout buttons on mobile to keep IDs unique.
               The sign-in/out actions remain available from the desktop row even on mobile via menu. -->
        </div>` : ``}
    </div>
  </div>
</header>`
}

export function initHeader() {
  const btn = document.getElementById('menuBtn')
  const mobile = document.getElementById('mobileNav')
  if (!btn || !mobile) return
  btn.addEventListener('click', () => {
    const isOpen = !mobile.classList.contains('hidden')
    mobile.classList.toggle('hidden', isOpen)
    btn.setAttribute('aria-expanded', String(!isOpen))
  })
}

/**
 * Bind header auth UI to Supabase auth state (user pages).
 * - Shows email in #whoami / #whoamiMobile
 * - Toggles Sign in / Sign out
 * - Optional signInHref for OTP pages (default ./access.html)
 */
export function bindAuthHeader(supabase, { signInHref = './access.html', onSignOut } = {}) {
  const whoamiEls = [
    ...document.querySelectorAll('#whoami'),
    ...document.querySelectorAll('#whoamiMobile')
  ]
  const signinBtn  = document.getElementById('signin')
  const signoutBtn = document.getElementById('signout')

  function render(user) {
    const isAuthed = !!user
    // Toggle buttons
    if (signinBtn) signinBtn.classList.toggle('hidden', isAuthed)
    if (signoutBtn) signoutBtn.classList.toggle('hidden', !isAuthed)
    // Update whoami text / visibility
    const label = isAuthed ? (user.email || 'Signed in') : 'Not signed in'
    whoamiEls.forEach(el => {
      if (!el) return
      el.textContent = label
      // Show on mobile and desktop only when authed; keep hidden otherwise on desktop
      if (el.id === 'whoami') {
        el.classList.toggle('hidden', !isAuthed)
      }
    })
  }

  // Initial render
  supabase.auth.getUser().then(({ data: { user } }) => render(user))

  // React to changes (after OTP redirect, etc.)
  supabase.auth.onAuthStateChange((_event, session) => {
    render(session?.user || null)
  })

  // Actions
  if (signinBtn) {
    signinBtn.onclick = () => {
      // For attendees we use OTP, so send them to access page
      window.location.assign(signInHref)
    }
  }
  if (signoutBtn) {
    signoutBtn.onclick = async () => {
      await supabase.auth.signOut()
      render(null)
      if (typeof onSignOut === 'function') onSignOut()
      // Default behavior: bring them home
      else window.location.assign('./index.html')
    }
  }
}

function escapeHtml(s='') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}
