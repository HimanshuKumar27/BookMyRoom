// ============================================================
// Page Controller — Guest Dashboard (My Bookings)
// ============================================================

import { renderNavbar, updateNavbarAuth } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { GetUserBookingsUseCase } from '../../core/use-cases/bookings/GetUserBookingsUseCase.js';
import { CancelBookingUseCase } from '../../core/use-cases/bookings/CancelBookingUseCase.js';
import { SupabaseBookingRepository } from '../../adapters/repositories/SupabaseBookingRepository.js';
import { SupabaseAuthService } from '../../adapters/services/SupabaseAuthService.js';

document.addEventListener('DOMContentLoaded', async () => {
  const authService = new SupabaseAuthService();
  const bookingRepository = new SupabaseBookingRepository();
  
  const getUserBookingsUseCase = new GetUserBookingsUseCase(bookingRepository);
  const cancelBookingUseCase = new CancelBookingUseCase(bookingRepository);

  // Render Layout Components
  renderNavbar('');
  renderFooter();

  let currentUser = null;
  let enrichedBookings = [];
  const listEl = document.getElementById('bookings-list');
  const today = new Date().toISOString().split('T')[0];

  // Auth check
  try {
    const user = await authService.getUser();
    currentUser = user;
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    const isAdmin = await authService.checkAdmin(user.id);
    await updateNavbarAuth(user, isAdmin);

    // Personal Greeting
    const fullName = user.user_metadata?.full_name || user.email.split('@')[0];
    const firstName = fullName.split(' ')[0];
    const hour = new Date().getHours();
    let timeGreeting = 'Good evening';
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon';

    const greetingText = document.getElementById('greeting-text');
    const greetingSub = document.getElementById('greeting-sub');
    if (greetingText) greetingText.textContent = `${timeGreeting}, ${firstName}!`;
    if (greetingSub) greetingSub.textContent = 'Here are your hotel reservations';

    await loadAndDisplayBookings();
  } catch (err) {
    console.error('Auth verification failed on user dashboard:', err);
    window.location.href = 'login.html';
  }

  // Load bookings and render dashboards
  async function loadAndDisplayBookings() {
    try {
      const bookings = await getUserBookingsUseCase.execute(currentUser.id);
      
      // Classify statuses
      enrichedBookings = (bookings || []).map(b => {
        const checkOut = b.check_out;
        if (b.status === 'Confirmed' && checkOut < today) {
          b.displayStatus = 'Completed';
        } else {
          b.displayStatus = b.status || 'Confirmed';
        }
        return b;
      });

      updateStats();
      renderBookingsList('all');
    } catch (err) {
      console.error('Failed to load bookings:', err);
      showToast('Failed to load bookings', 'error');
    }
  }

  // Calculate dashboard summary numbers
  function updateStats() {
    const statEl = document.getElementById('booking-stats');
    if (!statEl) return;

    const totalBookings = enrichedBookings.length;
    const upcoming = enrichedBookings.filter(b => b.displayStatus === 'Confirmed').length;
    const completed = enrichedBookings.filter(b => b.displayStatus === 'Completed').length;
    const totalSpent = enrichedBookings
      .filter(b => b.displayStatus !== 'Cancelled')
      .reduce((sum, b) => sum + (b.total_cost || 0), 0);

    statEl.innerHTML = `
      <div class="booking-stat">
        <div class="num">${totalBookings}</div>
        <div class="lbl">Total</div>
      </div>
      <div class="booking-stat">
        <div class="num">${upcoming}</div>
        <div class="lbl">Upcoming</div>
      </div>
      <div class="booking-stat">
        <div class="num">${completed}</div>
        <div class="lbl">Completed</div>
      </div>
      <div class="booking-stat">
        <div class="num">${formatCurrency(totalSpent)}</div>
        <div class="lbl">Total Spent</div>
      </div>
    `;
  }

  // Status CSS styling utilities
  function getStatusClass(status) {
    switch(status) {
      case 'Confirmed': return 'status-confirmed';
      case 'Cancelled': return 'status-cancelled';
      case 'Pending': return 'status-pending';
      case 'Completed': return 'status-completed';
      default: return 'status-confirmed';
    }
  }

  function getStatusDot(status) {
    switch(status) {
      case 'Confirmed': return '●';
      case 'Cancelled': return '●';
      case 'Pending': return '◐';
      case 'Completed': return '✓';
      default: return '●';
    }
  }

  // Renders cards list matching selected status filter tab
  function renderBookingsList(filter = 'all') {
    if (!listEl) return;

    const filtered = filter === 'all'
      ? enrichedBookings
      : enrichedBookings.filter(b => b.displayStatus === filter);

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/><path d="M1 21h22"/><path d="M9 7h1"/><path d="M9 11h1"/><path d="M14 7h1"/><path d="M14 11h1"/><path d="M9 15h6v6H9z"/></svg></div>
          <h2>${filter === 'all' ? 'No bookings yet' : `No ${filter.toLowerCase()} bookings`}</h2>
          <p>${filter === 'all' 
            ? 'Start exploring hotels across India and book your perfect stay.' 
            : `You don't have any ${filter.toLowerCase()} bookings right now.`
          }</p>
          <a href="rooms.html" class="btn-primary">Browse Rooms →</a>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(b => {
      const roomImage = (b.rooms?.images && b.rooms.images.length > 0)
        ? b.rooms.images[0]
        : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&h=200&fit=crop';

      const checkInDate = formatDate(b.check_in);
      const checkOutDate = formatDate(b.check_out);
      const canCancel = b.displayStatus === 'Confirmed' && b.check_in >= today;

      return `
        <div class="booking-card" data-booking-id="${b.id}">
          <img class="booking-card-img" src="${roomImage}" alt="${b.room_name || 'Hotel Room'}" loading="lazy">

          <div class="booking-card-body">
            <div class="booking-id">#${b.id.slice(0, 8).toUpperCase()}</div>
            <div class="booking-room-name">${b.room_name || 'Hotel Room'}</div>
            <div class="booking-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${b.room_city || 'India'} · ${b.room_type || 'Room'}
            </div>

            <div class="booking-details-grid">
              <div class="booking-detail-item">
                <span class="detail-label">Check-in</span>
                <span class="detail-value">${checkInDate}</span>
              </div>
              <div class="booking-detail-item">
                <span class="detail-label">Check-out</span>
                <span class="detail-value">${checkOutDate}</span>
              </div>
              <div class="booking-detail-item">
                <span class="detail-label">Duration</span>
                <span class="detail-value">${b.nights} night${b.nights > 1 ? 's' : ''}</span>
              </div>
              <div class="booking-detail-item">
                <span class="detail-label">Guests</span>
                <span class="detail-value">${b.guests || 1} guest${(b.guests || 1) > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <div class="booking-card-actions">
            <span class="status-pill ${getStatusClass(b.displayStatus)}">
              ${getStatusDot(b.displayStatus)} ${b.displayStatus}
            </span>
            <div class="booking-price">
              ${formatCurrency(b.total_cost)}
              <span class="per-night">${formatCurrency(b.price_per_night)}/night</span>
              ${b.coupon_code ? `<span style="display:inline-block;font-size:0.65rem;color:#10b981;font-weight:600;background:#10b98118;padding:2px 8px;border-radius:10px;margin-top:4px;">${b.coupon_code} applied</span>` : ''}
              ${b.gst_label ? `<span style="display:block;font-size:0.65rem;color:var(--text-muted);margin-top:2px;">${b.gst_label}</span>` : ''}
            </div>
            ${canCancel 
              ? `<button class="btn-cancel" onclick="window.openCancelModal('${b.id}')">Cancel Booking</button>` 
              : ''
            }
          </div>
        </div>
      `;
    }).join('');
  }

  // Dashboard filter tabs event listeners
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderBookingsList(tab.dataset.filter);
    });
  });

  // Cancel Modal operations
  let cancelBookingId = null;
  const cancelModal = document.getElementById('cancel-modal');

  window.openCancelModal = (bookingId) => {
    cancelBookingId = bookingId;
    cancelModal?.classList.add('active');
  };

  document.getElementById('btn-keep')?.addEventListener('click', () => {
    cancelModal?.classList.remove('active');
    cancelBookingId = null;
  });

  document.getElementById('btn-confirm-cancel')?.addEventListener('click', async () => {
    if (!cancelBookingId) return;

    const btn = document.getElementById('btn-confirm-cancel');
    if (btn) {
      btn.textContent = 'Cancelling...';
      btn.disabled = true;
    }

    try {
      await cancelBookingUseCase.execute(cancelBookingId);

      // Update UI state locally
      const booking = enrichedBookings.find(b => b.id === cancelBookingId);
      if (booking) {
        booking.status = 'Cancelled';
        booking.displayStatus = 'Cancelled';
      }

      cancelModal?.classList.remove('active');
      cancelBookingId = null;
      
      const activeFilter = document.querySelector('.filter-tab.active').dataset.filter;
      renderBookingsList(activeFilter);
      updateStats();
      
      showToast('Booking cancelled successfully', 'success');
    } catch (error) {
      console.error('Cancellation failed:', error);
      showToast('Failed to cancel booking', 'error');
    } finally {
      if (btn) {
        btn.textContent = 'Yes, Cancel';
        btn.disabled = false;
      }
    }
  });

  // Modal click outside to close
  cancelModal?.addEventListener('click', (e) => {
    if (e.target === cancelModal) {
      cancelModal.classList.remove('active');
      cancelBookingId = null;
    }
  });
});
