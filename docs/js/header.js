// docs/js/header.js
export function renderHeader({
  admin = false,
  nav = [],
  withAuth = true,
  // Defaults: user pages → ./index.html, ./assets/... ; admin pages → ../index.html, ../assets/...
  homeHref = admin ? '../index.html' : './index.html',
  logoSrc  = admin ? '../assets/brand/TCA-Logo.png' : './assets/brand/TCA-Logo.png',
  title    = 'Taiko Quest NATC Phoenix 2025',
} = {}) {
  const links = (nav || [])
    .map(([label, href]) => `<a href="${href}" class="text-sm text-gray-700 hover:text-gray-900 px-2 py-1">${label}</a>`)
    .join('')

  return `
<header class="bg-white shadow-sm">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
    <!-- Title row -->
    <div class="flex items-center justify-between">
      <a href="${homeHref}" class="flex items-center gap-2 group">
        <img src="${logoSrc}" alt="TCA" class="h-8 sm:h-10 w-auto">
        <span class="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 group-hover:underline">${title}</span>
      </a>

      <button id="menuBtn" class="sm:hidden inline-flex items-center justify-center p-2 rounded-md ring-1 ring-gray-300" aria-label="Open menu">☰</button>

      <div class="hidden sm:flex items-center gap-2">
        ${links}
        ${withAuth ? `
          <span id="whoami" class="js-whoami text-sm text-gray-600">Checking session…</span>
          <button id="signin" class="js-signin hidden px-3 py-2 rounded-lg bg-gray-900 text-white text-sm">Sign in</button>
          <button id="signout" class="js-signout hidden px-3 py-2 rounded-lg bg-gray-200 text-gray-900 text-sm">Sign out</button>
        ` : ''}
      </div>
    </div>
    <!-- Subheader -->
    <div class="mt-1 text-xs text-gray-500">Taiko Community Alliance</div>
  </div>

  <!-- Mobile menu -->
  <div id="mobileMenu" class="sm:hidden hidden border-t border-gray-200">
    <div class="px-4 py-3 space-y-2">
      ${links ? `<nav class="flex flex-col gap-1">${links}</nav>` : ''}
      ${withAuth ? `
        <div class="flex items-center justify-between pt-2">
          <span class="js-whoami text-sm text-gray-600">Checking session…</span>
          <div class="flex gap-2">
            <button class="js-signin hidden px-3 py-2 rounded-lg bg-gray-900 text-white text-sm">Sign in</button>
            <button class="js-signout hidden px-3 py-2 rounded-lg bg-gray-200 text-gray-900 text-sm">Sign out</button>
          </div>
        </div>
      ` : ''}
    </div>
  </div>
</header>`
}

export function initHeader() {
  const btn = document.getElementById('menuBtn')
  const menu = document.getElementById('mobileMenu')
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('hidden'))
}

/** Hook up the header’s auth buttons for desktop + mobile */
export function bindAuthButtons({ onSignIn, onSignOut } = {}) {
  const all = (sel) => Array.from(document.querySelectorAll(sel)).filter(Boolean)
  all('#signin, .js-signin').forEach(b => { if (onSignIn) b.onclick = onSignIn })
  all('#signout, .js-signout').forEach(b => { if (onSignOut) b.onclick = onSignOut })
}

/** Optional: quickly set the header’s auth state text/buttons */
export function setHeaderAuthUI({ loggedIn, label = 'Signed in' }) {
  const who = document.querySelectorAll('.js-whoami, #whoami')
  who.forEach(el => el && (el.textContent = loggedIn ? `Signed in as ${label}` : 'Not signed in'))
  const show = (sel, show) => document.querySelectorAll(sel).forEach(el => el && el.classList.toggle('hidden', !show))
  show('#signin, .js-signin', !loggedIn)
  show('#signout, .js-signout', loggedIn)
}