// ============================================================
// Page Controller — Booking Success Receipt
// ============================================================

import { renderNavbar, renderFooter, updateNavbarAuth } from '../components/navbar.js';
import { escapeHTML } from '../utils/dom.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { SupabaseAuthService } from '../../adapters/services/SupabaseAuthService.js';
import { BrowserStorageCache } from '../../adapters/services/BrowserStorageCache.js';
import { EmailJSNotificationService } from '../../adapters/services/EmailJSNotificationService.js';

document.addEventListener('DOMContentLoaded', async () => {
  const authService = new SupabaseAuthService();
  const sessionCache = new BrowserStorageCache('session');
  const notificationService = new EmailJSNotificationService();

  // Render components
  renderNavbar('');
  renderFooter();

  // Verify auth
  try {
    const user = await authService.getUser();
    if (user) {
      const isAdmin = await authService.checkAdmin(user.id);
      await updateNavbarAuth(user, isAdmin);
    }
  } catch (err) {
    console.error('Auth verification failed on success page:', err);
  }

  // Load receipt summary
  const summaryDiv = document.getElementById('booking-summary');
  const emailStatusMessage = document.getElementById('email-status-message');
  const booking = sessionCache.getItem('lastBooking');

  if (booking) {
    try {
      if (booking.emailSent === 'pending') {
        if (emailStatusMessage) {
          emailStatusMessage.innerHTML = 'Your reservation has been successfully placed. <span id="email-loader" style="font-weight:600;color:var(--color-primary);">Sending confirmation email...</span>';
        }

        // Send email asynchronously in the background on the success page
        notificationService.sendBookingConfirmation({
          guest_name: booking.guest_name,
          email: booking.email,
          room_name: booking.room_name,
          room_type: booking.room_type,
          room_city: booking.room_city,
          check_in: booking.check_in,
          check_out: booking.check_out,
          nights: booking.nights,
          guests: booking.guests,
          room_charges: booking.room_charges ? booking.room_charges.toLocaleString('en-IN') : '0',
          discount: booking.discount > 0 ? booking.discount.toLocaleString('en-IN') : '',
          coupon_code: booking.coupon_code || '',
          gst_label: booking.gst_label || 'GST @ 18%',
          tax: booking.tax ? booking.tax.toLocaleString('en-IN') : '0',
          total_cost: booking.total_cost ? booking.total_cost.toLocaleString('en-IN') : '0',
          booking_id: booking.bookingId
        }).then((sent) => {
          booking.emailSent = sent;
          sessionCache.setItem('lastBooking', booking);

          if (emailStatusMessage) {
            emailStatusMessage.textContent = sent
              ? 'Your reservation has been successfully placed. A confirmation email has been sent to your inbox.'
              : 'Your reservation has been successfully placed. Email confirmation could not be sent, so please save your booking ID.';
          }
        }).catch((err) => {
          console.error('Email sending failed on success page:', err);
          booking.emailSent = false;
          sessionCache.setItem('lastBooking', booking);
          if (emailStatusMessage) {
            emailStatusMessage.textContent = 'Your reservation has been successfully placed. Email confirmation could not be sent, so please save your booking ID.';
          }
        });
      } else {
        if (emailStatusMessage) {
          emailStatusMessage.textContent = booking.emailSent === true
            ? 'Your reservation has been successfully placed. A confirmation email has been sent to your inbox.'
            : 'Your reservation has been successfully placed. Email confirmation could not be sent, so please save your booking ID.';
        }
      }

      if (summaryDiv) {
        summaryDiv.innerHTML = `
          <div class="row">
            <span class="label">Booking ID</span>
            <span style="font-family:monospace;font-size:0.85rem;">${booking.bookingId?.slice(0, 12) || '—'}...</span>
          </div>
          <div class="row">
            <span class="label">Room</span>
            <span>${escapeHTML(booking.room_name || booking.roomName)}</span>
          </div>
          <div class="row">
            <span class="label">Location</span>
            <span>${escapeHTML(booking.room_city || booking.roomCity || 'India')}</span>
          </div>
          <div class="row">
            <span class="label">Guest</span>
            <span>${escapeHTML(booking.guest_name || booking.guestName)}</span>
          </div>
          <div class="row">
            <span class="label">Check-in</span>
            <span>${formatDate(booking.check_in || booking.checkIn)}</span>
          </div>
          <div class="row">
            <span class="label">Check-out</span>
            <span>${formatDate(booking.check_out || booking.checkOut)}</span>
          </div>
          <div class="row">
            <span class="label">Duration</span>
            <span>${booking.nights} night${booking.nights > 1 ? 's' : ''}</span>
          </div>
          <div class="row">
            <span class="label">Guests</span>
            <span>${booking.guests}</span>
          </div>
          <div class="row">
            <span class="label">Room Charges</span>
            <span>${formatCurrency(booking.room_charges || booking.roomCharges)}</span>
          </div>
          ${booking.discount && booking.discount > 0 ? `
          <div class="row" style="color:#10b981;">
            <span class="label" style="color:#10b981;">Discount (${booking.coupon_code || 'WELCOME20'})</span>
            <span>- ${formatCurrency(booking.discount)}</span>
          </div>` : ''}
          <div class="row">
            <span class="label">${booking.gst_label || 'GST'}</span>
            <span>${booking.tax > 0 ? formatCurrency(booking.tax) : 'FREE'}</span>
          </div>
          <div class="row">
            <span class="label">Total Amount</span>
            <span>${formatCurrency(booking.total_cost || booking.totalCost)}</span>
          </div>
        `;
      }
    } catch (e) {
      console.error('Failed to parse success booking receipt:', e);
      if (summaryDiv) {
        summaryDiv.innerHTML = '<div class="text-center py-4 text-gray-400">Could not load booking details.</div>';
      }
    }
  } else {
    if (emailStatusMessage) {
      emailStatusMessage.textContent = 'No recent booking details were found in this browser session.';
    }
    if (summaryDiv) {
      summaryDiv.innerHTML = `
        <div class="text-center py-4 text-gray-400">
          No booking details found. <a href="rooms.html" style="color:var(--color-primary);">Browse rooms →</a>
        </div>
      `;
    }
  }

  // Spawns celebratory confetti shapes
  function spawnConfetti() {
    const shapes = ['●', '■', '▲', '◆', '★', '♦'];
    const colors = ['#e63946', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'];
    
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.textContent = shapes[Math.floor(Math.random() * shapes.length)];
      el.style.color = colors[Math.floor(Math.random() * colors.length)];
      el.style.left = Math.random() * 100 + 'vw';
      el.style.animationDuration = (2 + Math.random() * 3) + 's';
      el.style.animationDelay = (Math.random() * 2) + 's';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 6000);
    }
  }

  spawnConfetti();
});
