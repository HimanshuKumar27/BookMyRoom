// ============================================================
// Shared Utilities — BookMyRoom Hotel Booking System (Supabase)
// ============================================================

import { supabase } from './supabase-config.js';

/**
 * Format a number as Indian Rupees
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Calculate number of nights between two dates
 */
export function calculateNights(checkIn, checkOut) {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diff = d2 - d1;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Get GST rate and label based on per-night room tariff (Indian hotel slab)
 * Up to ₹1,000/night   → 0% GST (Budget stays exempt)
 * ₹1,001 – ₹7,500/night → 5% GST (No ITC)
 * Above ₹7,500/night    → 18% GST (ITC allowed)
 */
export function getGSTInfo(pricePerNight) {
  if (pricePerNight <= 1000) return { rate: 0, label: 'No GST (Exempt)', percent: '0%' };
  if (pricePerNight <= 7500) return { rate: 0.05, label: 'GST @ 5%', percent: '5%' };
  return { rate: 0.18, label: 'GST @ 18%', percent: '18%' };
}

/**
 * Calculate full pricing breakdown with GST slab + optional coupon discount
 */
export function calculatePricing(pricePerNight, nights, discountPercent = 0) {
  const gst = getGSTInfo(pricePerNight);
  const roomCharges = pricePerNight * nights;
  const discount = discountPercent > 0 ? Math.round(roomCharges * (discountPercent / 100)) : 0;
  const chargesAfterDiscount = roomCharges - discount;
  const taxAmount = Math.round(chargesAfterDiscount * gst.rate);
  const total = chargesAfterDiscount + taxAmount;

  return {
    pricePerNight,
    nights,
    roomCharges,
    discount,
    discountPercent,
    chargesAfterDiscount,
    gstRate: gst.rate,
    gstLabel: gst.label,
    gstPercent: gst.percent,
    taxAmount,
    total
  };
}

/**
 * Check if user qualifies for the WELCOME20 new customer coupon (first 3 bookings)
 * Returns { eligible, bookingCount }
 */
export async function checkNewCustomerCoupon(userId) {
  if (!userId) return { eligible: false, bookingCount: 0 };
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) return { eligible: false, bookingCount: 0 };
  return { eligible: (count || 0) < 3, bookingCount: count || 0 };
}

/**
 * Get URL query parameter
 */
export function getParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

/**
 * Show a toast notification
 */
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getTodayISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Get tomorrow's date as YYYY-MM-DD
 */
export function getTomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/**
 * Inject the shared navbar into the page
 */
export function renderNavbar(activePage = '') {
  const nav = document.getElementById('navbar');
  nav.className = 'fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all duration-300';
  nav.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16 md:h-20">
        <!-- Logo -->
        <a href="index.html" class="flex-shrink-0 flex items-center gap-2 group">
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
          <a href="register.html" class="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">Sign Up</a>
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
          <a href="register.html" class="w-full text-center bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-3 rounded-xl font-bold shadow-md">Sign Up</a>
        </div>
      </div>
    </div>
  `;

  // ── Mobile toggle ──
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

  // ── Book Now auth guard ──
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

  // ── Scroll effect ──
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
 */
export async function updateNavbarAuth(user, isAdmin = false) {
  // Update desktop auth
  const authDivDesktop = document.getElementById('navbar-auth-desktop');
  if (!authDivDesktop) return;

  if (user) {
    // Try to get full name from user metadata first, then profile table
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

    // Desktop
    if (authDivDesktop) {
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

      // Toggle dropdown
      const profileBtn = document.getElementById('user-profile-btn');
      const dropdownMenu = document.getElementById('user-dropdown-menu');
      if (profileBtn && dropdownMenu) {
        profileBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
        });
        // Close on outside click
        document.addEventListener('click', () => {
          if (dropdownMenu) dropdownMenu.style.display = 'none';
        });
        dropdownMenu.addEventListener('click', (e) => e.stopPropagation());
      }

      // Logout handler
      document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
      });
    }

    // Mobile
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

/**
 * Render the shared footer
 */
export function renderFooter() {
  const footer = document.getElementById('footer');
  if (!footer) return;

  footer.innerHTML = `
    <div class="footer-grid">
      <div>
        <div class="footer-brand"><img src="assets/apple-touch-icon.png" alt="Book My Room Icon" width="22" height="22" style="display:inline-block;vertical-align:-3px;margin-right:4px;border-radius:4px;">BookMyRoom</div>
        <p class="footer-desc">
          Find and book hotels across India with the best prices. 
          Simple booking, verified properties, and 24/7 support.
        </p>
      </div>
      <div>
        <h4>Quick Links</h4>
        <ul>
          <li><a href="index.html">Home</a></li>
          <li><a href="rooms.html">All Rooms</a></li>
          <li><a href="booking.html">Book Now</a></li>
          <li><a href="my-bookings.html">My Bookings</a></li>
          <li><a href="login.html">Login / Register</a></li>
        </ul>
      </div>
      <div>
        <h4>Top Cities</h4>
        <ul>
          <li><a href="rooms.html?city=Jaipur">Jaipur</a></li>
          <li><a href="rooms.html?city=Goa">Goa</a></li>
          <li><a href="rooms.html?city=Udaipur">Udaipur</a></li>
          <li><a href="rooms.html?city=Shimla">Shimla</a></li>
          <li><a href="rooms.html?city=Manali">Manali</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:6px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Sec 102, Bhangel, Noida</li>
          <li><a href="tel:+917011121740" style="color:rgba(255,255,255,0.5);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:6px;"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>+91 7011121740</a></li>
          <li><a href="mailto:365himanshukumar@gmail.com" style="color:rgba(255,255,255,0.5);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:6px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>365himanshukumar@gmail.com</a></li>
          <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:6px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>24/7 Support</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      &copy; ${new Date().getFullYear()} BookMyRoom. All Rights Reserved.
    </div>
  `;
}

/**
 * Initialize scroll reveal animations
 */
export function initRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/**
 * Get recently booked count (today) - for urgency display
 */
export async function getTodayBookingsCount() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today + 'T00:00:00');
    return error ? 0 : (count || 0);
  } catch {
    return 0;
  }
}

/**
 * Check if the current user is an admin
 */
export async function checkAdmin(userId) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    return data?.role === 'admin';
  } catch {
    return false;
  }
}
