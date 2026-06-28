// ============================================================
// UI Component — Shared Navbar
// ============================================================

import { supabase } from '../../infrastructure/database/supabase-client.js';
import { showToast } from './toast.js';

/**
 * Inject the shared navbar into the page
 * @param {string} activePage - 'home', 'rooms', 'booking', or ''
 */
export function renderNavbar(activePage = '') {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  nav.className = 'fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all duration-300';
  nav.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16 md:h-20">
        <!-- Logo -->
        <a href="index.html" class="shrink-0 flex items-center gap-2 group">
          <img src="assets/apple-touch-icon.png" alt="BookMyRoom" class="h-8 w-8 rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
          <span class="font-display font-bold text-xl text-gray-900 tracking-tight">BookMyRoom</span>
        </a>

        <!-- Desktop Links -->
        <div class="hidden md:flex items-center space-x-8" id="navbar-links-desktop">
          <a href="index.html" class="${activePage === 'home' ? 'text-red-600 font-bold' : 'text-gray-600 hover:text-red-600 font-medium'} transition-colors">Home</a>
          <a href="rooms.html" class="${activePage === 'rooms' ? 'text-red-600 font-bold' : 'text-gray-600 hover:text-red-600 font-medium'} transition-colors">Rooms</a>
          <a href="#" id="nav-book-now-desktop" class="${activePage === 'booking' ? 'text-red-600 font-bold' : 'text-gray-600 hover:text-red-600 font-medium'} transition-colors">Book Now</a>
        </div>

        <!-- Desktop Auth -->
        <div class="hidden md:flex items-center gap-4" id="navbar-auth-desktop">
          <a href="login.html" class="text-gray-600 hover:text-gray-900 font-medium transition-colors">Login</a>
          <a href="register.html" class="bg-linear-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">Sign Up</a>
        </div>

        <!-- Mobile Toggle -->
        <div class="flex items-center md:hidden">
          <button type="button" class="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none transition-colors" id="mobile-toggle" aria-expanded="false">
            <span class="sr-only">Open main menu</span>
            <svg class="block h-6 w-6 menu-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg class="hidden h-6 w-6 close-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div class="md:hidden hidden bg-white border-t border-gray-100 shadow-xl absolute w-full left-0 z-40 transition-all origin-top" id="mobile-menu">
      <div class="px-4 pt-2 pb-4 space-y-1" id="navbar-links-mobile">
        <a href="index.html" class="block px-4 py-3 rounded-xl text-base font-medium ${activePage === 'home' ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'} transition-colors">Home</a>
        <a href="rooms.html" class="block px-4 py-3 rounded-xl text-base font-medium ${activePage === 'rooms' ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'} transition-colors">Rooms</a>
        <a href="#" id="nav-book-now-mobile" class="block px-4 py-3 rounded-xl text-base font-medium ${activePage === 'booking' ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'} transition-colors">Book Now</a>
      </div>
      <div class="px-4 pb-6 pt-2 border-t border-gray-100" id="navbar-auth-mobile">
        <div class="flex flex-col gap-3">
          <a href="login.html" class="w-full text-center border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-xl font-bold transition-colors">Login</a>
          <a href="register.html" class="w-full text-center bg-linear-to-r from-red-600 to-red-500 text-white px-4 py-3 rounded-xl font-bold shadow-md">Sign Up</a>
        </div>
      </div>
    </div>
  `;

  // Mobile menu toggle logic
  const toggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuIcon = toggle?.querySelector('.menu-icon');
  const closeIcon = toggle?.querySelector('.close-icon');

  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      const isHidden = mobileMenu.classList.contains('hidden');
      if (isHidden) {
        mobileMenu.classList.remove('hidden');
        menuIcon?.classList.add('hidden');
        closeIcon?.classList.remove('hidden');
      } else {
        mobileMenu.classList.add('hidden');
        menuIcon?.classList.remove('hidden');
        closeIcon?.classList.add('hidden');
      }
    });
  }

  // Book Now navigation auth guard
  const setupAuthGuard = (id) => {
    const link = document.getElementById(id);
    if (link) {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            window.location.href = 'booking.html';
          } else {
            sessionStorage.setItem('authRedirect', window.location.origin + '/booking.html');
            showToast('Please login or create an account to book a room.', 'error');
            setTimeout(() => { window.location.href = 'login.html'; }, 1200);
          }
        } catch {
          sessionStorage.setItem('authRedirect', window.location.origin + '/booking.html');
          showToast('Please login or create an account to book a room.', 'error');
          setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        }
      });
    }
  };

  setupAuthGuard('nav-book-now-desktop');
  setupAuthGuard('nav-book-now-mobile');

  // Navbar scrolling drop-shadow effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      nav.classList.add('shadow-sm');
    } else {
      nav.classList.remove('shadow-sm');
    }
  });
}

/**
 * Update navbar for authenticated user
 * @param {Object} user - Authenticated user object
 * @param {boolean} isAdmin - True if user has admin privileges
 */
export async function updateNavbarAuth(user, isAdmin = false) {
  const authDivDesktop = document.getElementById('navbar-auth-desktop');
  if (!authDivDesktop) return;

  if (user) {
    let fullName = user.user_metadata?.full_name || '';
    if (!fullName) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        fullName = profile?.full_name || '';
      } catch { /* ignore */ }
    }

    const displayName = fullName || user.email.split('@')[0];
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    // Render Desktop Auth
    authDivDesktop.innerHTML = `
      ${isAdmin ? '<a href="admin.html" class="btn-secondary btn-sm" style="font-size:0.78rem;padding:6px 14px;margin-right:8px;">Admin Panel</a>' : ''}
      <div class="user-profile-dropdown" style="position:relative;">
        <button id="user-profile-btn" style="display:flex;align-items:center;gap:8px;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:50px;transition:all 0.2s ease;" onmouseover="this.style.background='var(--bg-light)'" onmouseout="this.style.background='none'">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--color-primary-gradient);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.75rem;letter-spacing:0.5px;">${initials}</div>
          <span style="color:var(--text-dark);font-weight:600;font-size:0.85rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${displayName}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div id="user-dropdown-menu" style="display:none;position:absolute;top:calc(100% + 6px);right:0;min-width:220px;background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(25,28,29,0.12);padding:8px;z-index:100;animation:fadeInDown 0.2s ease;">
          <div style="padding:12px 14px;border-bottom:1px solid var(--border-light);margin-bottom:4px;">
            <div style="font-weight:700;font-size:0.88rem;color:var(--text-dark);margin-bottom:2px;">${displayName}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${user.email}</div>
          </div>
          ${isAdmin ? '<a href="admin.html" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;color:var(--text-body);font-size:0.85rem;font-weight:500;transition:all 0.15s ease;" onmouseover="this.style.background=\'var(--bg-light)\'" onmouseout="this.style.background=\'none\'"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>Admin Panel</a>' : ''}
          <a href="my-bookings.html" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;color:var(--text-body);font-size:0.85rem;font-weight:500;transition:all 0.15s ease;" onmouseover="this.style.background='var(--bg-light)'" onmouseout="this.style.background='none'"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>My Bookings</a>
          <div style="border-top:1px solid var(--border-light);margin:4px 0;"></div>
          <button id="btn-logout" style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;border-radius:8px;background:none;border:none;color:#b7102a;font-size:0.85rem;font-weight:600;cursor:pointer;text-align:left;transition:all 0.15s ease;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Logout</button>
        </div>
      </div>
    `;

    // Dropdown toggling
    const profileBtn = document.getElementById('user-profile-btn');
    const dropdownMenu = document.getElementById('user-dropdown-menu');
    if (profileBtn && dropdownMenu) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
      });
      // Close dropdown on click outside
      document.addEventListener('click', () => {
        if (dropdownMenu) dropdownMenu.style.display = 'none';
      });
      dropdownMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    // Logout click handler
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.href = 'login.html';
    });

    // Render Mobile Auth
    const authDivMobile = document.getElementById('navbar-auth-mobile');
    if (authDivMobile) {
      authDivMobile.innerHTML = `
        <div style="padding: 12px 0; border-bottom: 1px solid var(--border-light); margin-bottom: 8px;">
          <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-dark); margin-bottom: 2px;">${displayName}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${user.email}</div>
        </div>
        <div class="flex flex-col gap-3">
          ${isAdmin ? '<a href="admin.html" class="w-full text-center border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-xl font-bold transition-colors">Admin Panel</a>' : ''}
          <a href="my-bookings.html" class="w-full text-center border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-xl font-bold transition-colors">My Bookings</a>
          <button id="btn-logout-mobile" class="w-full text-center bg-red-50 text-red-600 px-4 py-3 rounded-xl font-bold transition-colors">Logout</button>
        </div>
      `;

      document.getElementById('btn-logout-mobile')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
      });
    }
  }
}
