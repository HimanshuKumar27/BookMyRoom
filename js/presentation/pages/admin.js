// ============================================================
// Page Controller — Admin Dashboard
// ============================================================

import { renderNavbar, renderFooter, updateNavbarAuth } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { sanitize, validateForm, isValidPrice, isValidPositiveInt, isValidText, showFormErrors } from '../utils/validators.js';
import { ManageRoomsUseCase } from '../../core/use-cases/rooms/ManageRoomsUseCase.js';
import { SeedRoomsUseCase } from '../../core/use-cases/rooms/SeedRoomsUseCase.js';
import { SupabaseRoomRepository } from '../../adapters/repositories/SupabaseRoomRepository.js';
import { SupabaseBookingRepository } from '../../adapters/repositories/SupabaseBookingRepository.js';
import { SupabaseAuthService } from '../../adapters/services/SupabaseAuthService.js';
import { rateLimiters } from '../../infrastructure/security/rate-limiter.js';

document.addEventListener('DOMContentLoaded', async () => {
  const authService = new SupabaseAuthService();
  const roomRepository = new SupabaseRoomRepository();
  const bookingRepository = new SupabaseBookingRepository();

  const manageRoomsUseCase = new ManageRoomsUseCase(roomRepository);
  const seedRoomsUseCase = new SeedRoomsUseCase(roomRepository);

  // Render Layout Components
  renderNavbar('');
  renderFooter();

  // ===== Verification Gate =====
  try {
    const user = await authService.getUser();
    if (!user) {
      showToast('Please login as admin.', 'error');
      sessionStorage.setItem('authRedirect', window.location.href);
      setTimeout(() => window.location.href = 'login.html', 1200);
      return;
    }

    const isAdmin = await authService.checkAdmin(user.id);
    await updateNavbarAuth(user, isAdmin);

    if (!isAdmin) {
      showToast('Access denied. Admin privileges required.', 'error');
      setTimeout(() => window.location.href = 'index.html', 1500);
      return;
    }

    // Admin Verified successfully — run initialization
    await initializeAdminDashboard();
  } catch (err) {
    console.error('Failed verification on admin dashboard page:', err);
    window.location.href = 'index.html';
  }

  function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  async function initializeAdminDashboard() {
    // Load initial views
    await loadRooms();
    await loadBookings();

    // Setup real-time postgres notifications subscriptions with 300ms debounce
    const debouncedLoadRooms = debounce(() => loadRooms(), 300);
    const debouncedLoadBookings = debounce(() => loadBookings(), 300);

    const unsubscribeRooms = roomRepository.subscribeToRooms(debouncedLoadRooms);
    const unsubscribeBookings = bookingRepository.subscribeToBookings(debouncedLoadBookings);

    // Cleanup when leaving
    window.addEventListener('unload', () => {
      unsubscribeRooms();
      unsubscribeBookings();
    });
  }

  // ===== Tab Switching =====
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('tab-rooms')?.classList.toggle('hidden', target !== 'rooms');
      document.getElementById('tab-bookings')?.classList.toggle('hidden', target !== 'bookings');
    });
  });

  // ===== Modal Bindings =====
  const modal = document.getElementById('room-modal');
  const modalTitle = document.getElementById('modal-title');
  const roomForm = document.getElementById('room-form');

  document.getElementById('btn-add-room')?.addEventListener('click', () => {
    if (modalTitle) modalTitle.textContent = 'Add New Room';
    if (roomForm) roomForm.reset();
    const idField = document.getElementById('room-id');
    if (idField) idField.value = '';
    showFormErrors([], 'form-errors');
    modal?.classList.add('active');
  });

  document.getElementById('modal-close')?.addEventListener('click', () => modal?.classList.remove('active'));
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal?.classList.remove('active'); });

  // ===== Save Room (Create / Update Form Submit) =====
  if (roomForm) {
    roomForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const rateCheck = rateLimiters.adminAction.check();
      if (!rateCheck.allowed) {
        showToast('Too many actions. Please slow down.', 'error');
        return;
      }

      const roomId = document.getElementById('room-id').value;
      const roomName = sanitize(document.getElementById('room-name').value);
      const roomPrice = document.getElementById('room-price').value;
      const roomCapacity = document.getElementById('room-capacity').value;
      const roomDescription = sanitize(document.getElementById('room-description').value);
      const amenitiesStr = sanitize(document.getElementById('room-amenities').value);
      const imagesStr = document.getElementById('room-images').value;

      const validation = validateForm({ 'Room Name': { value: roomName, rules: ['required'] } });
      if (!isValidText(roomName, 2, 100)) {
        validation.errors.push('Room name must be 2–100 characters.');
        validation.valid = false;
      }
      if (!isValidPrice(roomPrice)) {
        validation.errors.push('Price must be between ₹500 and ₹1,00,000 per night.');
        validation.valid = false;
      }
      if (!isValidPositiveInt(roomCapacity, 1, 10)) {
        validation.errors.push('Capacity must be between 1 and 10 guests.');
        validation.valid = false;
      }

      if (!validation.valid) {
        showFormErrors(validation.errors, 'form-errors');
        return;
      }
      showFormErrors([], 'form-errors');

      const btn = document.getElementById('btn-save-room');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving...';
      }

      const roomData = {
        name: roomName,
        type: document.getElementById('room-type').value,
        city: document.getElementById('room-city').value,
        price: parseInt(roomPrice, 10),
        capacity: parseInt(roomCapacity, 10),
        status: document.getElementById('room-status').value,
        rating: parseFloat(document.getElementById('room-rating').value) || 4.5,
        review_count: parseInt(document.getElementById('room-review-count').value, 10) || Math.floor(10 + Math.random() * 50),
        amenities: amenitiesStr ? amenitiesStr.split(',').map(s => sanitize(s.trim())).filter(Boolean) : [],
        description: roomDescription,
        images: imagesStr ? imagesStr.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      try {
        await manageRoomsUseCase.saveRoom(roomId, roomData);
        showToast(roomId ? 'Room updated successfully!' : 'Room added successfully!', 'success');
        modal?.classList.remove('active');
        await loadRooms();
      } catch (err) {
        console.error('Failed to save room details:', err);
        showToast('Error saving room.', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Save Room';
        }
      }
    });
  }

  // ===== Fetch Rooms and Render Table =====
  async function loadRooms() {
    const tbody = document.getElementById('rooms-tbody');
    if (!tbody) return;

    try {
      const [totalCount, availableCount, bookedCount, rooms] = await Promise.all([
        roomRepository.getRoomsCount(),
        roomRepository.getRoomsCount({ status: 'Available' }),
        roomRepository.getRoomsCount({ status: 'Booked' }),
        roomRepository.getAllRooms()
      ]);

      const totalRoomsEl = document.getElementById('stat-total-rooms');
      const availEl = document.getElementById('stat-available');
      const bookedEl = document.getElementById('stat-booked');

      if (totalRoomsEl) totalRoomsEl.textContent = totalCount;
      if (availEl) availEl.textContent = availableCount;
      if (bookedEl) bookedEl.textContent = bookedCount;

      if (rooms.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-400">No rooms found. Click "Add Room" to create one.</td></tr>`;
        return;
      }

      tbody.innerHTML = rooms.map(r => {
        const statusClass = r.status === 'Available' ? 'status-confirmed' : 'status-cancelled';
        return `
          <tr>
            <td class="font-semibold">${sanitize(r.name)}</td>
            <td>${sanitize(r.type)}</td>
            <td>${sanitize(r.city || '—')}</td>
            <td>${formatCurrency(r.price)}</td>
            <td>${r.capacity || 2}</td>
            <td><span class="status-badge ${statusClass}">${r.status}</span></td>
            <td>
              <div class="actions">
                <button class="btn-primary btn-sm" onclick="editRoom('${r.id}')">Edit</button>
                <button class="btn-danger btn-sm" onclick="removeRoom('${r.id}', '${sanitize(r.name)}')">Delete</button>
                <button class="btn-secondary btn-sm" onclick="toggleStatus('${r.id}', '${r.status}')">${r.status === 'Available' ? 'Mark Booked' : 'Mark Available'}</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load rooms table in admin dashboard:', err);
    }
  }

  // ===== Fetch Bookings and Render Table =====
  async function loadBookings() {
    const tbody = document.getElementById('bookings-tbody');
    if (!tbody) return;

    try {
      const [totalCount, bookings] = await Promise.all([
        bookingRepository.getBookingsCount(),
        bookingRepository.getAllBookings({ limit: 50 })
      ]);

      const statBookingsEl = document.getElementById('stat-bookings');
      if (statBookingsEl) statBookingsEl.textContent = totalCount;

      if (bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-gray-400">No bookings yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = bookings.map(b => {
        const statusClass = b.status === 'Confirmed' ? 'status-confirmed' : b.status === 'Cancelled' ? 'status-cancelled' : 'status-pending';
        return `
          <tr>
            <td>
              <div class="font-semibold">${sanitize(b.guest_name || '—')}</div>
              <div class="text-xs text-gray-500">${sanitize(b.email || '')}</div>
            </td>
            <td>${sanitize(b.room_name || '—')}</td>
            <td>${sanitize(b.room_city || '—')}</td>
            <td>${formatDate(b.check_in)}</td>
            <td>${formatDate(b.check_out)}</td>
            <td>${b.nights || '—'}</td>
            <td class="font-semibold">${formatCurrency(b.total_cost || 0)}</td>
            <td><span class="status-badge ${statusClass}">${b.status || 'Pending'}</span></td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load bookings table in admin dashboard:', err);
    }
  }

  // ===== Window-scoped Action Handles (preserves HTML compatibility) =====
  window.editRoom = async (id) => {
    const rateCheck = rateLimiters.adminAction.check();
    if (!rateCheck.allowed) {
      showToast('Too many actions. Please slow down.', 'error');
      return;
    }

    try {
      const r = await roomRepository.getRoomById(id);
      if (!r) {
        showToast('Error loading room details.', 'error');
        return;
      }

      document.getElementById('room-id').value = id;
      document.getElementById('room-name').value = r.name || '';
      document.getElementById('room-type').value = r.type || 'Single';
      document.getElementById('room-city').value = r.city || 'Jaipur';
      document.getElementById('room-price').value = r.price || '';
      document.getElementById('room-capacity').value = r.capacity || 2;
      document.getElementById('room-status').value = r.status || 'Available';
      document.getElementById('room-amenities').value = (r.amenities || []).join(', ');
      document.getElementById('room-description').value = r.description || '';
      document.getElementById('room-images').value = (r.images || []).join(', ');
      document.getElementById('room-rating').value = r.rating || 4.5;
      document.getElementById('room-review-count').value = r.review_count || Math.floor(10 + Math.random() * 50);

      if (modalTitle) modalTitle.textContent = 'Edit Room';
      showFormErrors([], 'form-errors');
      modal?.classList.add('active');
    } catch (err) {
      console.error('Error fetching room detail for editing:', err);
      showToast('Error loading room.', 'error');
    }
  };

  window.removeRoom = async (id, name) => {
    const rateCheck = rateLimiters.adminAction.check();
    if (!rateCheck.allowed) {
      showToast('Too many actions. Please slow down.', 'error');
      return;
    }

    if (!confirm(`Delete room "${name}"? This cannot be undone.`)) return;

    try {
      await manageRoomsUseCase.deleteRoom(id);
      showToast('Room deleted.', 'success');
      await loadRooms();
    } catch (err) {
      console.error('Error deleting room:', err);
      showToast('Error deleting room.', 'error');
    }
  };

  window.toggleStatus = async (id, currentStatus) => {
    const rateCheck = rateLimiters.adminAction.check();
    if (!rateCheck.allowed) {
      showToast('Too many actions. Please slow down.', 'error');
      return;
    }

    try {
      await manageRoomsUseCase.toggleStatus(id, currentStatus);
      const targetStatus = currentStatus === 'Available' ? 'Booked' : 'Available';
      showToast(`Room marked as ${targetStatus}.`, 'success');
      await loadRooms();
    } catch (err) {
      console.error('Error toggling room status:', err);
      showToast('Error updating status.', 'error');
    }
  };

  // ===== Seed Sample Data =====
  document.getElementById('btn-seed-data')?.addEventListener('click', async () => {
    const rateCheck = rateLimiters.seedData.check();
    if (!rateCheck.allowed) {
      const waitMin = Math.ceil(rateLimiters.seedData.getRemainingTime() / 60);
      showToast(`Seed data is rate limited. Try again in ${waitMin} minutes.`, 'error');
      return;
    }

    if (!confirm('This will add 8 sample Indian hotel rooms. Continue?')) return;

    const sampleRooms = [
      { name: 'Budget AC Room', type: 'Single', city: 'Varanasi', price: 899, capacity: 2, status: 'Available', rating: 4.2, review_count: 47, amenities: ['WiFi', 'AC', 'TV', 'Breakfast'], description: 'Affordable AC room in the city center near the ghats. Clean rooms with daily housekeeping.', images: [] },
      { name: 'Standard Room', type: 'Single', city: 'Darjeeling', price: 999, capacity: 2, status: 'Available', rating: 4.5, review_count: 89, amenities: ['WiFi', 'Heater', 'Garden', 'Mountain View'], description: 'Cozy room with mountain views & morning tea included.', images: [] },
      { name: 'Standard AC Room', type: 'Single', city: 'Munnar', price: 1299, capacity: 2, status: 'Available', rating: 4.3, review_count: 56, amenities: ['WiFi', 'AC', 'Garden View', 'Parking'], description: 'Clean and cozy standard room with garden view. Located near the main market.', images: [] },
      { name: 'Mountain View Room', type: 'Double', city: 'Shimla', price: 1599, capacity: 3, status: 'Available', rating: 4.7, review_count: 124, amenities: ['WiFi', 'Heater', 'Mountain View', 'Parking'], description: 'Comfortable double room with Himalayan views. Room heater, hot water, free parking.', images: [] },
      { name: 'Lake View Room', type: 'Deluxe', city: 'Udaipur', price: 2199, capacity: 2, status: 'Available', rating: 4.8, review_count: 203, amenities: ['WiFi', 'AC', 'Lake View', 'Room Service'], description: 'Comfortable deluxe room with a beautiful view of the lake. AC, hot water, and 24/7 room service.', images: [] },
      { name: 'Beach View Room', type: 'Deluxe', city: 'Goa', price: 2499, capacity: 3, status: 'Available', rating: 4.9, review_count: 317, amenities: ['WiFi', 'AC', 'Beach Access', 'Pool', 'Breakfast'], description: 'Well-maintained room near Calangute beach. Pool access, complimentary breakfast.', images: [] },
      { name: 'Heritage Room', type: 'Suite', city: 'Jodhpur', price: 2999, capacity: 4, status: 'Available', rating: 4.6, review_count: 178, amenities: ['WiFi', 'AC', 'Pool', 'All Meals', 'Spa'], description: 'Heritage suite with modern amenities near Mehrangarh Fort. All meals included.', images: [] },
      { name: 'Royal Suite', type: 'Suite', city: 'Jaipur', price: 4499, capacity: 4, status: 'Available', rating: 4.9, review_count: 256, amenities: ['WiFi', 'AC', 'Pool', 'Breakfast', 'Parking', 'Spa'], description: 'Spacious AC suite near Hawa Mahal with city view. Complimentary breakfast & spa access.', images: [] }
    ];

    const btn = document.getElementById('btn-seed-data');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Seeding...';
    }

    try {
      await seedRoomsUseCase.execute(sampleRooms);
      showToast('8 sample rooms added!', 'success');
      await loadRooms();
    } catch (err) {
      console.error('Failed to seed rooms:', err);
      showToast('Error seeding data.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Seed Sample Data';
      }
    }
  });
});
