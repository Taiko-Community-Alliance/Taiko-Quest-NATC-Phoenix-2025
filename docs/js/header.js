// docs/js/header.js
export function renderHeader({ admin = false, nav = [], withAuth = true } = {}) {
  const links = (nav || [])
    .map(([label, href]) => `<a href="${href}" class="text-sm text-gray-700 hover:text-gray-900 px-2 py-1">${label}</a>`)
    .join('')

  return `
<header class="bg-white shadow-sm">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
    <!-- Top: title + hamburger -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="${admin ? './index.html' : './index.html'}" class="text-lg sm:text-xl font-semibold text-gray-900">Taiko Quest</a>
        <span class="hidden sm:inline text-sm text-gray-500">Taiko Community Alliance</span>
      </div>
      <button id="menuBtn" class="sm:hidden inline-flex items-center justify-center p-2 rounded-md ring-1 ring-gray-300">
        <span class="sr-only">Open menu</span>
        ☰
      </button>
      <div class="hidden sm:flex items-center gap-2">
        ${links}
        ${withAuth ? `
          <span id="whoami" class="js-whoami text-sm text-gray-600">Checking session…</span>
          <button id="signin" class="js-signin hidden px-3 py-2 rounded-lg bg-gray-900 text-white text-sm">Sign in</button>
          <button id="signout" class="js-signout hidden px-3 py-2 rounded-lg bg-gray-200 text-gray-900 text-sm">Sign out</button>
        ` : ''}
      </div>
    </div>
    <!-- Subheader (small screens show org name here) -->
    <div class="sm:hidden mt-1 text-xs text-gray-500">Taiko Community Alliance</div>
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