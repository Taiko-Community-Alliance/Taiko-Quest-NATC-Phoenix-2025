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
          <span id="whoami" class="text-sm text-gray-600">Checking session…</span>
          <!-- NOTE: We avoid duplicating IDs. Mobile auth buttons reuse the same IDs above,
               so we *don't* render additional #signin/#signout here to keep IDs unique.
               Your auth buttons remain accessible in the desktop row even on mobile. -->
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

function escapeHtml(s='') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}