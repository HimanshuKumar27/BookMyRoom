// ============================================================
// Page Controller — Booking & Reservation Checkout
// ============================================================

import { renderNavbar, updateNavbarAuth } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { showToast } from '../components/toast.js';
import { getParam, getTodayISO, getTomorrowISO, parseSearchCriteria, escapeHTML } from '../utils/dom.js';
import { formatCurrency } from '../utils/formatters.js';
import { sanitize, validateForm, isValidDateRange, isValidPositiveInt, showFormErrors } from '../utils/validators.js';
import { calculateNights, calculatePricing, getGSTInfo } from '../../core/entities/Pricing.js';
import { CheckCouponUseCase } from '../../core/use-cases/bookings/CheckCouponUseCase.js';
import { CreateBookingUseCase } from '../../core/use-cases/bookings/CreateBookingUseCase.js';
import { SupabaseBookingRepository } from '../../adapters/repositories/SupabaseBookingRepository.js';
import { SupabaseRoomRepository } from '../../adapters/repositories/SupabaseRoomRepository.js';
import { SupabaseAuthService } from '../../adapters/services/SupabaseAuthService.js';
import { EmailJSNotificationService } from '../../adapters/services/EmailJSNotificationService.js';
import { BrowserStorageCache } from '../../adapters/services/BrowserStorageCache.js';
import { rateLimiters } from '../../infrastructure/security/rate-limiter.js';
import { supabase } from '../../infrastructure/database/supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
  const authService = new SupabaseAuthService();
  const roomRepository = new SupabaseRoomRepository();
  const bookingRepository = new SupabaseBookingRepository();
  const notificationService = new EmailJSNotificationService();
  const cacheService = new BrowserStorageCache();
  const sessionCache = new BrowserStorageCache('session');

  const checkCouponUseCase = new CheckCouponUseCase(bookingRepository);
  const createBookingUseCase = new CreateBookingUseCase(
    bookingRepository,
    roomRepository,
    notificationService,
    sessionCache
  );

  // Render components
  renderNavbar('booking');
  renderFooter();

  let currentUser = null;
  let appliedDiscount = 0; // percentage
  let couponEligible = false;
  let roomsMap = {};
  let selectedRoom = null;

  // Form Inputs
  const checkInEl = document.getElementById('check-in');
  const checkOutEl = document.getElementById('check-out');
  const guestCountEl = document.getElementById('guest-count');
  const roomSelectEl = document.getElementById('room-select');
  const couponInputEl = document.getElementById('coupon-input');
  const couponStatusEl = document.getElementById('coupon-status');
  const btnApplyCoupon = document.getElementById('btn-apply-coupon');
  const bookingForm = document.getElementById('booking-form');

  // Set min dates
  const searchCriteria = parseSearchCriteria();
  if (checkInEl) {
    checkInEl.value = searchCriteria.hasDateRange ? searchCriteria.checkin : getTodayISO();
    checkInEl.min = getTodayISO();
  }
  if (checkOutEl) {
    checkOutEl.value = searchCriteria.hasDateRange ? searchCriteria.checkout : getTomorrowISO();
    checkOutEl.min = getTomorrowISO();
  }
  if (guestCountEl && new URLSearchParams(window.location.search).has('guests')) {
    guestCountEl.value = String(Math.min(5, searchCriteria.guests));
  }
  if (checkInEl && checkOutEl) {
    const initialMinOut = new Date(checkInEl.value);
    initialMinOut.setDate(initialMinOut.getDate() + 1);
    checkOutEl.min = initialMinOut.toISOString().split('T')[0];
  }

  // Fallback Room Images
  const defaultImages = {
    'Single': 'assets/images/room-standard.webp',
    'Double': 'assets/images/room-premium.webp',
    'Suite': 'assets/images/room-deluxe.webp',
    'Deluxe': 'assets/images/room-deluxe.webp'
  };

  // --- Auth guard & Pre-fill info ---
  try {
    const user = await authService.getUser();
    currentUser = user;
    if (user) {
      const isAdmin = await authService.checkAdmin(user.id);
      await updateNavbarAuth(user, isAdmin);

      // Pre-fill profile fields
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        if (profile.full_name) document.getElementById('guest-name').value = profile.full_name;
        if (profile.email) document.getElementById('guest-email').value = profile.email;
        if (profile.phone) document.getElementById('guest-phone').value = profile.phone;
      }

      // Check coupon WELCOME20 eligibility
      const couponCheck = await checkCouponUseCase.execute(user.id);
      couponEligible = couponCheck.eligible;
      
      const couponSection = document.getElementById('coupon-section');
      if (couponSection) couponSection.classList.remove('hidden');

      if (couponEligible) {
        const banner = document.getElementById('coupon-banner');
        if (banner) banner.classList.remove('hidden');
        const remaining = 3 - couponCheck.bookingCount;
        const textEl = document.getElementById('coupon-remaining-text');
        if (textEl) textEl.textContent = `Valid for your next ${remaining} booking${remaining > 1 ? 's' : ''}`;
      }
    }
  } catch (err) {
    console.error('Authentication guard failed on checkout page:', err);
  }

  // Coupon Action
  if (btnApplyCoupon && couponInputEl && couponStatusEl) {
    btnApplyCoupon.addEventListener('click', () => {
      const code = couponInputEl.value.trim().toUpperCase();

      if (code === 'WELCOME20' && couponEligible) {
        appliedDiscount = 20;
        couponStatusEl.textContent = 'WELCOME20 applied — 20% discount!';
        couponStatusEl.style.color = '#10b981';
        couponStatusEl.classList.remove('hidden');
        couponInputEl.disabled = true;
        btnApplyCoupon.textContent = 'Remove';
        
        btnApplyCoupon.onclick = () => {
          appliedDiscount = 0;
          couponStatusEl.classList.add('hidden');
          couponInputEl.disabled = false;
          couponInputEl.value = '';
          btnApplyCoupon.textContent = 'Apply';
          btnApplyCoupon.onclick = null; // reset to original DOM listener
          updatePricing();
        };
        updatePricing();
      } else if (code === 'WELCOME20' && !couponEligible) {
        couponStatusEl.textContent = 'You have already used this coupon (valid for first 3 bookings only).';
        couponStatusEl.style.color = '#ef4444';
        couponStatusEl.classList.remove('hidden');
      } else {
        couponStatusEl.textContent = 'Invalid coupon code.';
        couponStatusEl.style.color = '#ef4444';
        couponStatusEl.classList.remove('hidden');
      }
    });
  }

  let roomsCache = null;

  // Load Rooms list inside dropdown
  async function loadRooms() {
    try {
      if (!roomsCache) {
        roomsCache = await roomRepository.getAllRooms();
      }
      const rooms = roomsCache;
      const select = document.getElementById('room-select');
      if (!select) return;

      const previousId = select.value || getParam('roomId') || selectedRoom?.id || '';
      const requestedGuests = parseInt(guestCountEl?.value || '1', 10) || 1;
      const unavailableIds = await bookingRepository.getUnavailableRoomIds(checkInEl.value, checkOutEl.value);
      
      roomsMap = {};
      select.innerHTML = '<option value="">— Choose a Room —</option>';

      (rooms || []).forEach(room => {
        const dateUnavailable = unavailableIds.has(room.id);
        const capacityUnavailable = (room.capacity || 1) < requestedGuests;
        const openForSale = room.status === 'Available';
        roomsMap[room.id] = { ...room, dateUnavailable, capacityUnavailable };
        
        const gst = getGSTInfo(room.price);
        const statusText = !openForSale 
          ? ' (Booked)' 
          : dateUnavailable 
            ? ' (Unavailable for dates)' 
            : capacityUnavailable 
              ? ' (Too small)' 
              : '';
        const gstTag = gst.rate === 0 ? ' [No GST]' : ` [+${gst.percent} GST]`;

        const opt = document.createElement('option');
        opt.value = room.id;
        opt.textContent = `${room.name} — ${room.type} — ${room.city || 'India'} — ${formatCurrency(room.price)}/night${gstTag}${statusText}`;
        opt.disabled = !openForSale || dateUnavailable || capacityUnavailable;
        select.appendChild(opt);
      });

      if (previousId && roomsMap[previousId]) {
        select.value = previousId;
        onRoomSelected(previousId);
      }
    } catch (error) {
      console.error('Error loading rooms on booking page:', error);
      const select = document.getElementById('room-select');
      if (select) select.innerHTML = '<option value="">Could not load rooms. Check Supabase config.</option>';
    }
  }

  // Handle Room Selection dropdown
  function onRoomSelected(roomId) {
    selectedRoom = roomId ? { id: roomId, ...roomsMap[roomId] } : null;
    const bar = document.getElementById('room-info-bar');
    const summaryRoomName = document.getElementById('summary-room-name');

    if (selectedRoom) {
      const img = (selectedRoom.images && selectedRoom.images.length > 0) ? selectedRoom.images[0] : (defaultImages[selectedRoom.type] || 'assets/images/room-standard.webp');
      const gst = getGSTInfo(selectedRoom.price);
      
      const thumbEl = document.getElementById('room-thumb');
      const nameDisp = document.getElementById('room-name-display');
      const metaDisp = document.getElementById('room-meta-display');

      if (thumbEl) thumbEl.src = img;
      if (nameDisp) nameDisp.textContent = selectedRoom.name;
      if (metaDisp) metaDisp.textContent = `${selectedRoom.type} · ${selectedRoom.city || 'India'} · ${formatCurrency(selectedRoom.price)}/night · ${gst.percent} GST`;
      
      if (bar) {
        bar.classList.remove('hidden');
        bar.classList.add('flex');
      }
      if (summaryRoomName) {
        summaryRoomName.innerHTML = `<div class="font-display text-lg">${escapeHTML(selectedRoom.name)}</div><div class="text-sm text-gray-400">${escapeHTML(selectedRoom.type)} · ${escapeHTML(selectedRoom.city || 'India')}</div>`;
      }
    } else {
      if (bar) {
        bar.classList.add('hidden');
        bar.classList.remove('flex');
      }
      if (summaryRoomName) {
        summaryRoomName.innerHTML = '<span class="text-gray-400 text-sm">Select a room to see pricing</span>';
      }
    }
    updatePricing();
  }

  if (roomSelectEl) {
    roomSelectEl.addEventListener('change', (e) => onRoomSelected(e.target.value));
  }

  // Recalculates display totals (GST, Coupon, tariff)
  function updatePricing() {
    const dashFields = ['price-per-night', 'nights-count', 'room-charges', 'tax-amount', 'total-amount'];
    
    if (!selectedRoom) {
      dashFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
      });
      document.getElementById('discount-row')?.classList.add('hidden');
      document.getElementById('gst-info-badge')?.classList.add('hidden');
      const taxLabel = document.getElementById('tax-label');
      if (taxLabel) taxLabel.textContent = 'Taxes & fees';
      return;
    }

    const nights = calculateNights(checkInEl.value, checkOutEl.value);
    const pricing = calculatePricing(selectedRoom.price, nights, appliedDiscount);

    const pricePN = document.getElementById('price-per-night');
    const nightsCount = document.getElementById('nights-count');
    const roomChg = document.getElementById('room-charges');
    const taxLabel = document.getElementById('tax-label');
    const taxAmt = document.getElementById('tax-amount');
    const totalAmt = document.getElementById('total-amount');

    if (pricePN) pricePN.textContent = formatCurrency(pricing.pricePerNight);
    if (nightsCount) nightsCount.textContent = nights > 0 ? `${nights} night${nights > 1 ? 's' : ''}` : '—';
    if (roomChg) roomChg.textContent = nights > 0 ? formatCurrency(pricing.roomCharges) : '—';
    if (taxLabel) taxLabel.textContent = nights > 0 ? `${pricing.gstLabel}` : 'Taxes & fees';
    if (taxAmt) taxAmt.textContent = nights > 0 ? (pricing.taxAmount > 0 ? formatCurrency(pricing.taxAmount) : 'FREE') : '—';
    if (totalAmt) totalAmt.textContent = nights > 0 ? formatCurrency(pricing.total) : '—';

    // Discount Row
    const discountRow = document.getElementById('discount-row');
    if (discountRow) {
      if (appliedDiscount > 0 && nights > 0) {
        discountRow.classList.remove('hidden');
        const discLabel = document.getElementById('discount-label');
        const discAmt = document.getElementById('discount-amount');
        if (discLabel) discLabel.textContent = `Discount (${appliedDiscount}%)`;
        if (discAmt) discAmt.textContent = `- ${formatCurrency(pricing.discount)}`;
      } else {
        discountRow.classList.add('hidden');
      }
    }

    // GST badge description
    const gstBadge = document.getElementById('gst-info-badge');
    if (gstBadge) {
      if (nights > 0) {
        gstBadge.classList.remove('hidden');
        const textEl = document.getElementById('gst-badge-text');
        if (textEl) {
          if (pricing.gstRate === 0) {
            textEl.textContent = `Room tariff ≤ ₹1,000/night — No GST applicable`;
          } else if (pricing.gstRate === 0.05) {
            textEl.textContent = `Room tariff ₹1,001–₹7,500/night — 5% GST (No ITC)`;
          } else {
            textEl.textContent = `Room tariff > ₹7,500/night — 18% GST (ITC allowed)`;
          }
        }
      } else {
        gstBadge.classList.add('hidden');
      }
    }
  }

  // Date validation updates
  if (checkInEl && checkOutEl) {
    checkInEl.addEventListener('change', () => {
      const nextDay = new Date(checkInEl.value);
      nextDay.setDate(nextDay.getDate() + 1);
      const minOut = nextDay.toISOString().split('T')[0];
      checkOutEl.min = minOut;
      if (checkOutEl.value <= checkInEl.value) {
        checkOutEl.value = minOut;
      }
      updatePricing();
      loadRooms();
    });

    checkOutEl.addEventListener('change', () => {
      updatePricing();
      loadRooms();
    });
  }

  if (guestCountEl) {
    guestCountEl.addEventListener('change', () => {
      updatePricing();
      loadRooms();
    });
  }

  // Checkout submission handler
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentUser) {
        showToast('Please login to make a booking.', 'error');
        sessionStorage.setItem('authRedirect', window.location.href);
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
      }

      const guestName = sanitize(document.getElementById('guest-name').value);
      const guestEmail = sanitize(document.getElementById('guest-email').value);
      const guestPhone = sanitize(document.getElementById('guest-phone').value);
      const guestCountVal = guestCountEl.value;
      const specialRequests = sanitize(document.getElementById('special-requests').value);

      // Perform validation checks
      const validation = validateForm({
        'Room': { value: selectedRoom ? selectedRoom.id : '', rules: ['required'] },
        'Guest Name': { value: guestName, rules: ['required', 'name'] },
        'Email': { value: guestEmail, rules: ['required', 'email'] },
        'Phone': { value: guestPhone, rules: ['required', 'phone'] }
      });

      if (!selectedRoom) {
        validation.errors.push('Please select a room.');
        validation.valid = false;
      }

      if (!isValidPositiveInt(guestCountVal, 1, selectedRoom?.capacity || 10)) {
        validation.errors.push(`Number of guests must be between 1 and ${selectedRoom?.capacity || 10}.`);
        validation.valid = false;
      }

      const dateCheck = isValidDateRange(checkInEl.value, checkOutEl.value);
      if (!dateCheck.valid) {
        validation.errors.push(dateCheck.error);
        validation.valid = false;
      }

      if (!validation.valid) {
        showFormErrors(validation.errors, 'form-errors');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      showFormErrors([], 'form-errors');

      // Check Rate Limits
      const rateCheck = rateLimiters.booking.check();
      if (!rateCheck.allowed) {
        showToast(`Too many bookings. Please try again in ${rateLimiters.booking.getRemainingTime()} seconds.`, 'error');
        return;
      }

      const btn = document.getElementById('btn-book');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Processing Booking...';
      }

      const nights = calculateNights(checkInEl.value, checkOutEl.value);
      const pricing = calculatePricing(selectedRoom.price, nights, appliedDiscount);

      const bookingData = {
        room_id: selectedRoom.id,
        room_name: sanitize(selectedRoom.name),
        room_type: sanitize(selectedRoom.type),
        room_city: sanitize(selectedRoom.city || 'India'),
        guest_name: guestName,
        email: guestEmail,
        phone: guestPhone,
        guests: parseInt(guestCountVal, 10),
        check_in: checkInEl.value,
        check_out: checkOutEl.value,
        nights,
        price_per_night: selectedRoom.price,
        room_charges: pricing.roomCharges,
        discount: pricing.discount,
        discount_percent: pricing.discountPercent,
        coupon_code: appliedDiscount > 0 ? 'WELCOME20' : null,
        gst_rate: pricing.gstRate,
        gst_label: pricing.gstLabel,
        tax: pricing.taxAmount,
        total_cost: pricing.total,
        special_requests: specialRequests,
        status: 'Confirmed',
        user_id: currentUser.id
      };

      try {
        await createBookingUseCase.execute(bookingData);
        window.location.href = 'booking-success.html';
      } catch (error) {
        console.error('Booking use case execution failed:', error);
        showToast(error.message || 'Booking failed. Please try again.', 'error');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Confirm Booking';
        }
      }
    });
  }

  // Initialize
  await loadRooms();
});
