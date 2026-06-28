// ============================================================
// Page Controller — Home Page
// ============================================================

import { renderNavbar, updateNavbarAuth } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { initRevealAnimations, getTodayISO, getTomorrowISO } from '../utils/dom.js';
import { formatCurrency } from '../utils/formatters.js';
import { SupabaseAuthService } from '../../adapters/services/SupabaseAuthService.js';
import { BrowserStorageCache } from '../../adapters/services/BrowserStorageCache.js';
import { SupabaseBookingRepository } from '../../adapters/repositories/SupabaseBookingRepository.js';

document.addEventListener('DOMContentLoaded', async () => {
  const authService = new SupabaseAuthService();
  const cacheService = new BrowserStorageCache();
  const bookingRepository = new SupabaseBookingRepository();

  // Render components
  renderNavbar('home');
  renderFooter();
  initRevealAnimations();

  // Authentication State Check
  try {
    const user = await authService.getUser();
    if (user) {
      const isAdmin = await authService.checkAdmin(user.id);
      await updateNavbarAuth(user, isAdmin);
    }
  } catch (err) {
    console.error('Failed to verify authentication on homepage:', err);
  }

  // Real-time Booking Counter (Urgency Element)
  const countEl = document.getElementById('today-bookings-count');
  if (countEl) {
    const updateUrgencyCounter = async () => {
      try {
        const count = await bookingRepository.getTodayBookingsCount();
        countEl.textContent = count;
      } catch (err) {
        console.warn('Urgency counter failed to update:', err);
      }
    };

    await updateUrgencyCounter();
    setInterval(updateUrgencyCounter, 30000); // 30s polling
  }

  // Hero Date Pickers Configuration
  const checkinInput = document.getElementById('hero-checkin');
  const checkoutInput = document.getElementById('hero-checkout');
  const cityInput = document.getElementById('hero-city');
  const searchBtn = document.getElementById('hero-search-btn');

  if (checkinInput && checkoutInput) {
    checkinInput.value = getTodayISO();
    checkoutInput.value = getTomorrowISO();
    checkinInput.min = getTodayISO();
    checkoutInput.min = getTomorrowISO();

    checkinInput.addEventListener('change', () => {
      const nextDay = new Date(checkinInput.value);
      nextDay.setDate(nextDay.getDate() + 1);
      const minOut = nextDay.toISOString().split('T')[0];
      checkoutInput.min = minOut;
      if (checkoutInput.value <= checkinInput.value) {
        checkoutInput.value = minOut;
      }
    });
  }

  // Guest & Room Dropdown Trigger
  const guestTrigger = document.getElementById('guest-selector-trigger');
  const guestPopover = document.getElementById('guest-popover');
  const roomsVal = document.getElementById('rooms-val');
  const guestsVal = document.getElementById('guests-val');
  
  let roomsCount = 1;
  let guestsCount = 2;

  const updateGuestsDisplay = () => {
    if (roomsVal) roomsVal.textContent = roomsCount;
    if (guestsVal) guestsVal.textContent = guestsCount;
    document.getElementById('hero-rooms-count').textContent = roomsCount;
    document.getElementById('hero-guests-count').textContent = guestsCount;
  };

  // Expose updates for inline markup handlers (preserves onclick compatibility)
  window.updateGuests = (type, delta) => {
    if (type === 'rooms') {
      roomsCount = Math.max(1, Math.min(5, roomsCount + delta));
    } else {
      guestsCount = Math.max(1, Math.min(10, guestsCount + delta));
    }
    updateGuestsDisplay();
  };

  window.closeGuestPopover = () => {
    guestPopover?.classList.add('hidden');
  };

  if (guestTrigger && guestPopover) {
    guestTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      guestPopover.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      guestPopover.classList.add('hidden');
    });

    guestPopover.addEventListener('click', (e) => e.stopPropagation());
  }

  // Redirect to Listings (Search execution)
  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const city = cityInput?.value || '';
      const checkin = checkinInput?.value || getTodayISO();
      const checkout = checkoutInput?.value || getTomorrowISO();

      const params = new URLSearchParams();
      if (city) params.set('city', city);
      params.set('checkin', checkin);
      params.set('checkout', checkout);
      params.set('rooms', roomsCount);
      params.set('guests', guestsCount);

      window.location.href = `rooms.html?${params.toString()}`;
    });
  }

  // Load Recently Viewed Hotels from Cache
  const recentSection = document.getElementById('recently-viewed');
  const recentGrid = document.getElementById('recent-rooms-grid');
  
  if (recentSection && recentGrid) {
    const recentRooms = cacheService.getItem('brm_recent') || [];
    if (recentRooms.length > 0) {
      recentSection.style.display = 'block';
      recentGrid.innerHTML = recentRooms.map(room => {
        const rating = room.rating || 4.5;
        const ratingColor = rating >= 4.5 ? 'text-green-500' : 'text-yellow-500';
        return `
          <div class="min-w-[280px] md:min-w-[340px] bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 p-4 snap-center cursor-pointer group transition-all duration-300 hover:-translate-y-1" onclick="window.location.href='room-detail.html?id=${room.id}'">
            <div class="relative overflow-hidden aspect-4/3 rounded-xl mb-3">
              <img src="${room.image || 'assets/images/room-standard.webp'}" alt="${room.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy">
              <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
                <span class="flex ${ratingColor} text-xs">★</span>
              </div>
            </div>
            <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">${room.type} · ${room.city}</div>
            <h3 class="font-display font-bold text-lg text-gray-900 mb-2 truncate">${room.name}</h3>
            <div class="flex items-baseline justify-between">
              <div class="font-bold text-xl text-red-600">${formatCurrency(room.price)}<span class="text-xs font-normal text-gray-500">/night</span></div>
              <button onclick="event.stopPropagation();" class="p-1.5 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all">
                <svg class="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
              </button>
            </div>
          </div>
        `;
      }).join('');
    } else {
      recentSection.style.display = 'none';
    }
  }
});
