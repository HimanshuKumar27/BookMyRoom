// ============================================================
// Page Controller — Rooms Directory
// ============================================================

import { renderNavbar, renderFooter, updateNavbarAuth } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { escapeHTML, getParam, parseSearchCriteria } from '../utils/dom.js';
import { formatCurrency } from '../utils/formatters.js';
import { getGSTInfo } from '../../core/entities/Pricing.js';
import { GetRoomsUseCase } from '../../core/use-cases/rooms/GetRoomsUseCase.js';
import { SupabaseRoomRepository } from '../../adapters/repositories/SupabaseRoomRepository.js';
import { SupabaseBookingRepository } from '../../adapters/repositories/SupabaseBookingRepository.js';
import { SupabaseAuthService } from '../../adapters/services/SupabaseAuthService.js';
import { BrowserStorageCache } from '../../adapters/services/BrowserStorageCache.js';

document.addEventListener('DOMContentLoaded', async () => {
  const roomRepository = new SupabaseRoomRepository();
  const bookingRepository = new SupabaseBookingRepository();
  const getRoomsUseCase = new GetRoomsUseCase(roomRepository, bookingRepository);
  const authService = new SupabaseAuthService();
  const cacheService = new BrowserStorageCache();

  // Render Layout Components
  renderNavbar('rooms');
  renderFooter();

  const grid = document.getElementById('rooms-grid');
  const loading = document.getElementById('rooms-loading');
  const empty = document.getElementById('rooms-empty');
  const resultsCount = document.getElementById('results-count');

  let roomsMap = {};
  let compareList = cacheService.getItem('brm_compare') || [];
  if (!Array.isArray(compareList)) compareList = [];

  let wishlist = cacheService.getItem('brm_wishlist') || [];
  if (!Array.isArray(wishlist)) wishlist = [];

  // Check Authentication State
  try {
    const user = await authService.getUser();
    if (user) {
      const isAdmin = await authService.checkAdmin(user.id);
      await updateNavbarAuth(user, isAdmin);
    }
  } catch (err) {
    console.error('Auth verification failed on rooms page:', err);
  }

  // Pre-configured Fallback Images
  const defaultImages = {
    'Single': 'assets/images/room-standard.webp',
    'Double': 'assets/images/room-premium.webp',
    'Suite': 'assets/images/room-deluxe.webp',
    'Deluxe': 'assets/images/room-deluxe.webp'
  };

  /**
   * Generates markup card for a single room
   */
  function renderRoomCard(room) {
    const imgSrc = escapeHTML((room.images && room.images.length > 0) ? room.images[0] : (defaultImages[room.type] || 'assets/images/room-standard.webp'));
    const roomId = escapeHTML(room.id);
    const roomName = escapeHTML(room.name);
    const roomType = escapeHTML(room.type);
    const roomCity = escapeHTML(room.city || 'India');
    const roomStatus = escapeHTML(room.displayStatus || room.status || 'Available');
    const isAvailable = room.isSearchAvailable ?? room.status === 'Available';
    
    // Status Badge
    const statusMarkup = isAvailable
      ? `<span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider rounded-full self-start">${roomStatus}</span>` 
      : `<span class="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider rounded-full self-start">${roomStatus}</span>`;
    
    // Star Rating
    const rating = room.rating || 4.5;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const reviewCount = room.review_count || Math.floor(10 + Math.random() * 90);
    const ratingColor = rating >= 4.5 ? 'text-green-500' : (rating >= 4.0 ? 'text-yellow-500' : 'text-orange-500');
    
    const amenities = (room.amenities || []).slice(0, 4).map(a => 
      `<span class="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full"><svg class="w-4 h-4 mr-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>${escapeHTML(a)}</span>`
    ).join('');
    
    const gst = getGSTInfo(room.price);
    const viewCount = room.view_count || Math.floor(10 + Math.random() * 90);
    const isWishlisted = wishlist.includes(room.id);

    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row group cursor-pointer reveal visible">
        <!-- Image Section -->
        <div class="w-full md:w-2/5 h-64 md:h-auto relative overflow-hidden">
          <img src="${imgSrc}" alt="${roomName}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy">
          
          <!-- Compare checkbox -->
          <div class="compare-checkbox-wrapper">
            <input type="checkbox" class="compare-checkbox" onchange="toggleCompare('${roomId}', this)"
              ${compareList.includes(room.id) ? 'checked' : ''} title="Add to comparison">
          </div>
          
          <!-- Cancellation badge -->
          <div class="absolute bottom-3 left-3 ${compareList.includes(room.id) ? 'left-14' : ''}">
            <span class="px-2.5 py-1 bg-white/95 backdrop-blur-sm text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Free Cancel
            </span>
          </div>
          <!-- Status badge -->
          ${statusMarkup.replace('self-start', '').replace('rounded-full', 'rounded-md').replace('px-3 py-1', 'px-2.5 py-1')}
        </div>
        
        <!-- Details Section -->
        <div class="w-full md:w-3/5 p-6 flex flex-col justify-between">
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">${roomType}</span>
                <span class="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">${roomCity}</span>
              </div>
              <h3 class="text-xl md:text-2xl font-display font-bold text-gray-900 leading-tight mb-3 group-hover:text-primary transition-colors">${roomName}</h3>
            </div>
          </div>
          
          <!-- Rating & social proof -->
          <div class="flex items-center gap-3 mb-3">
            <div class="flex items-center gap-2">
              <div class="flex ${ratingColor} text-sm">${'★'.repeat(fullStars)}${hasHalfStar ? '½' : ''}</div>
              <span class="text-sm font-semibold text-gray-700">${rating.toFixed(1)}</span>
              <span class="text-xs text-gray-400">(${reviewCount} reviews)</span>
            </div>
            <span class="text-xs text-gray-300">|</span>
            <div class="flex items-center gap-1 text-xs text-amber-600">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              ${viewCount} views today
            </div>
          </div>
          
          <div class="flex flex-wrap gap-2 mb-6">
            ${amenities}
            ${(room.amenities && room.amenities.length > 4) ? `<span class="flex items-center text-sm text-gray-500 px-3 py-1">+${room.amenities.length - 4} more</span>` : ''}
          </div>
          
          <div class="flex flex-col md:flex-row justify-between items-start md:items-end mt-auto pt-4 border-t border-gray-100">
            <div class="mb-4 md:mb-0">
              <div class="flex items-baseline">
                <span class="text-2xl font-bold text-gray-900">${formatCurrency(room.price)}</span>
                <span class="text-sm text-gray-500 ml-1">/ night</span>
              </div>
              <div class="mt-1 text-xs text-gray-400">+ ${gst.percent} GST • No hidden charges</div>
            </div>
            <div class="flex gap-2 items-center">
              <button onclick="event.stopPropagation(); toggleWishlist('${roomId}', this);" class="p-3.5 rounded-xl border ${isWishlisted ? 'border-red-300 bg-red-50' : 'border-gray-200'} hover:border-red-300 hover:bg-red-50 transition-all">
                <svg class="w-5 h-5 ${isWishlisted ? 'text-red-500 fill-current' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
              </button>
              <a href="room-detail.html?id=${roomId}${window.location.search ? `&${window.location.search.slice(1)}` : ''}" class="inline-flex justify-center items-center px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark hover:-translate-y-0.5 transition-all w-full md:w-auto shadow-md hover:shadow-lg">
                View Details
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Load Rooms list utilizing Use Case
  async function loadRooms() {
    if (loading) loading.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');
    if (grid) grid.innerHTML = '';

    const typeVal = document.getElementById('filter-type').value;
    const cityVal = document.getElementById('filter-city').value;
    const priceVal = document.getElementById('filter-price').value;
    const statusVal = document.getElementById('filter-status').value;
    const sortBy = document.getElementById('sort-by')?.value || 'recommended';

    const params = new URLSearchParams(window.location.search);
    const searchCriteria = parseSearchCriteria(params);

    const filters = {
      type: typeVal,
      city: cityVal,
      priceRange: priceVal,
      status: statusVal,
      sortBy
    };

    let displayedRooms = [];
    let availabilityWarning = false;

    try {
      displayedRooms = await getRoomsUseCase.execute(filters, searchCriteria);
    } catch (err) {
      availabilityWarning = true;
      console.warn('Rooms search execution failed:', err);
    }

    if (loading) loading.classList.add('hidden');

    // Headers & active filter indicators setup
    const titleEl = document.getElementById('results-title');
    const filtersEl = document.getElementById('active-filters');
    let titleParts = [];

    if (params.has('guests')) titleParts.push(`${searchCriteria.guests} guests`);
    if (params.has('rooms')) titleParts.push(`${searchCriteria.rooms} room${searchCriteria.rooms > 1 ? 's' : ''}`);
    
    if (searchCriteria.checkin && searchCriteria.checkout) {
      const ci = new Date(searchCriteria.checkin);
      const co = new Date(searchCriteria.checkout);
      titleParts.push(`${ci.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${co.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
    }

    const activeTags = [];
    if (cityVal) activeTags.push({ label: `City: ${cityVal}`, value: 'city' });
    if (typeVal) activeTags.push({ label: `Type: ${typeVal}`, value: 'type' });
    if (priceVal) activeTags.push({ label: `Price: ${priceVal === 'under_1000' ? 'Under ₹1,000' : priceVal === '1000_1500' ? '₹1,000-1,500' : 'Above ₹1,500'}`, value: 'price' });
    if (statusVal) activeTags.push({ label: `Status: ${statusVal}`, value: 'status' });

    if (filtersEl) {
      if (activeTags.length > 0) {
        filtersEl.classList.remove('hidden');
        filtersEl.classList.add('flex');
        filtersEl.innerHTML = activeTags.map(tag => `
          <span class="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full border border-red-100">
            ${escapeHTML(tag.label)}
            <button onclick="clearFilter('${tag.value}')" class="hover:text-red-800">&times;</button>
          </span>
        `).join('');
      } else {
        filtersEl.classList.add('hidden');
        filtersEl.classList.remove('flex');
      }
    }

    if (titleEl) {
      titleEl.textContent = titleParts.length > 0 ? 'Rooms for ' + titleParts.join(' • ') : 'Available Rooms';
    }

    roomsMap = Object.fromEntries(displayedRooms.map(room => [room.id, room]));

    if (!displayedRooms.length) {
      if (grid) grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      if (resultsCount) resultsCount.textContent = '0 rooms found';
    } else {
      if (empty) empty.classList.add('hidden');
      if (grid) grid.innerHTML = displayedRooms.map(r => renderRoomCard(r)).join('');
      const warningText = availabilityWarning ? ' (availability dates could not be verified)' : '';
      if (resultsCount) resultsCount.textContent = `Showing ${displayedRooms.length} room${displayedRooms.length > 1 ? 's' : ''}${warningText}`;
    }
  }

  // Clear single filters trigger
  window.clearFilter = (filterName) => {
    const selects = {
      'city': document.getElementById('filter-city'),
      'type': document.getElementById('filter-type'),
      'price': document.getElementById('filter-price'),
      'status': document.getElementById('filter-status')
    };
    if (selects[filterName]) {
      selects[filterName].value = '';
      loadRooms();
    }
  };

  // Real-time subscription to rooms table
  const unsubscribeRooms = roomRepository.subscribeToRooms(() => {
    loadRooms();
  });

  // Attach filters triggers
  document.getElementById('filter-type')?.addEventListener('change', loadRooms);
  document.getElementById('filter-city')?.addEventListener('change', loadRooms);
  document.getElementById('filter-price')?.addEventListener('change', loadRooms);
  document.getElementById('filter-status')?.addEventListener('change', loadRooms);
  
  document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
    ['filter-type', 'filter-city', 'filter-price', 'filter-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    if (window.location.search) history.replaceState(null, '', 'rooms.html');
    loadRooms();
  });

  // Pre-fill city from parameters
  const urlCity = getParam('city');
  if (urlCity) {
    const citySelect = document.getElementById('filter-city');
    if (citySelect) citySelect.value = urlCity;
  }

  // Compare Bar UI setup
  function updateCompareBar() {
    const bar = document.getElementById('compare-bar');
    const countEl = document.getElementById('compare-count');
    if (countEl) countEl.textContent = compareList.length;
    if (bar) {
      if (compareList.length >= 2) {
        bar.classList.add('visible');
      } else {
        bar.classList.remove('visible');
      }
    }
  }

  window.toggleCompare = (roomId, checkbox) => {
    const idx = compareList.indexOf(roomId);
    if (idx === -1) {
      if (compareList.length >= 3) {
        showToast('You can compare up to 3 rooms', 'error');
        checkbox.checked = false;
        return;
      }
      compareList.push(roomId);
    } else {
      compareList.splice(idx, 1);
    }
    cacheService.setItem('brm_compare', compareList);
    updateCompareBar();
  };

  window.clearCompare = () => {
    compareList = [];
    cacheService.removeItem('brm_compare');
    updateCompareBar();
    document.querySelectorAll('.compare-checkbox').forEach(cb => cb.checked = false);
  };

  window.handleSort = () => {
    loadRooms();
  };

  // Compare Matrix Modal
  window.openCompareModal = () => {
    const modal = document.getElementById('compare-modal');
    const content = document.getElementById('compare-content');
    const roomsToCompare = compareList.map(id => roomsMap[id]).filter(Boolean);
    
    if (roomsToCompare.length < 2) {
      showToast('Select at least 2 rooms to compare', 'error');
      return;
    }

    const fields = [
      { label: 'Room', key: 'name', type: 'text' },
      { label: 'Type', key: 'type', type: 'text' },
      { label: 'City', key: 'city', type: 'text' },
      { label: 'Price/night', key: 'price', type: 'price' },
      { label: 'Capacity', key: 'capacity', type: 'number' },
      { label: 'Status', key: 'status', type: 'badge' },
      { label: 'Amenities', key: 'amenities', type: 'list' },
    ];

    let html = '<div class="grid-cols-4 gap-4">';
    html += '<div class="col-span-4 grid grid-cols-4 gap-4 mb-4 border-b pb-4">';
    html += '<div class="font-bold text-gray-700">Feature</div>';
    roomsToCompare.forEach(room => {
      const img = escapeHTML((room.images && room.images[0]) || (defaultImages[room.type] || 'assets/images/room-standard.webp'));
      html += `
        <div class="text-center">
          <img src="${img}" alt="${escapeHTML(room.name)}" class="w-full h-32 object-cover rounded-lg mb-2">
          <div class="font-bold text-gray-900 text-sm">${escapeHTML(room.name)}</div>
        </div>
      `;
    });
    html += '</div>';

    fields.forEach(field => {
      html += '<div class="col-span-4 grid grid-cols-4 gap-4 border-b py-3 items-center">';
      html += `<div class="font-semibold text-gray-600 text-sm">${field.label}</div>`;
      roomsToCompare.forEach(room => {
        let val = room[field.key];
        if (field.key === 'price') val = formatCurrency(val);
        if (field.key === 'amenities') val = (val || []).map(escapeHTML).join(', ');
        if (field.key === 'status') {
          const color = val === 'Available' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
          val = `<span class="px-2 py-0.5 rounded-full text-xs font-semibold ${color}">${escapeHTML(val)}</span>`;
        } else {
          val = escapeHTML(val || '\u2014');
        }
        html += `<div class="text-center text-sm ${field.key === 'price' ? 'font-bold text-red-600' : 'text-gray-700'}">${val}</div>`;
      });
      html += '</div>';
    });

    html += '<div class="col-span-4 grid grid-cols-4 gap-4 py-3">';
    html += '<div></div>';
    roomsToCompare.forEach(room => {
      html += `
        <div class="text-center">
          <a href="room-detail.html?id=${escapeHTML(room.id)}" class="btn-primary btn-sm inline-block">View Details</a>
        </div>
      `;
    });
    html += '</div>';
    html += '</div>';
    
    if (content) content.innerHTML = html;
    modal?.classList.add('active');
  };

  window.closeCompareModal = () => {
    document.getElementById('compare-modal')?.classList.remove('active');
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeCompareModal();
  });

  updateCompareBar();

  // Wishlist actions handler
  window.toggleWishlist = (roomId, btn) => {
    const index = wishlist.indexOf(roomId);
    const icon = btn.querySelector('svg');
    if (index === -1) {
      wishlist.push(roomId);
      icon?.classList.remove('text-gray-400');
      icon?.classList.add('text-red-500', 'fill-current');
      btn.classList.add('border-red-300', 'bg-red-50');
      showToast('Added to wishlist ❤️', 'success');
    } else {
      wishlist.splice(index, 1);
      icon?.classList.remove('text-red-500', 'fill-current');
      icon?.classList.add('text-gray-400');
      btn.classList.remove('border-red-300', 'bg-red-50');
      showToast('Removed from wishlist', 'info');
    }
    cacheService.setItem('brm_wishlist', wishlist);
  };

  // Initial load
  await loadRooms();

  // Cleanup subscription on page unload
  window.addEventListener('unload', () => {
    unsubscribeRooms();
  });
});
