// ============================================================
// Page Controller — Room Details
// ============================================================

import { renderNavbar, renderFooter, updateNavbarAuth } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { escapeHTML, getParam, getTodayISO, getTomorrowISO } from '../utils/dom.js';
import { formatCurrency } from '../utils/formatters.js';
import { getGSTInfo, calculateNights, calculatePricing } from '../../core/entities/Pricing.js';
import { GetRoomDetailsUseCase } from '../../core/use-cases/rooms/GetRoomDetailsUseCase.js';
import { SupabaseRoomRepository } from '../../adapters/repositories/SupabaseRoomRepository.js';
import { SupabaseAuthService } from '../../adapters/services/SupabaseAuthService.js';
import { BrowserStorageCache } from '../../adapters/services/BrowserStorageCache.js';

document.addEventListener('DOMContentLoaded', async () => {
  const roomRepository = new SupabaseRoomRepository();
  const authService = new SupabaseAuthService();
  const cacheService = new BrowserStorageCache();
  const getRoomDetailsUseCase = new GetRoomDetailsUseCase(roomRepository, cacheService);

  // Render Layout Components
  renderNavbar('rooms');
  renderFooter();

  const container = document.getElementById('room-detail-content');
  const roomId = getParam('id');

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
    console.error('Auth verification failed on detail page:', err);
  }

  // Pre-configured Fallback Images
  const defaultImages = {
    'Single': 'assets/images/room-standard.webp',
    'Double': 'assets/images/room-premium.webp',
    'Suite': 'assets/images/room-deluxe.webp',
    'Deluxe': 'assets/images/room-deluxe.webp'
  };

  // Wishlist Action
  window.toggleWishlistDetail = (id, btn) => {
    const index = wishlist.indexOf(id);
    const icon = btn.querySelector('svg');
    if (index === -1) {
      wishlist.push(id);
      icon?.classList.remove('text-gray-400', 'fill-none');
      icon?.classList.add('text-red-500', 'fill-current');
      btn.classList.add('bg-red-50', 'border-red-200');
      showToast('Added to wishlist ❤️', 'success');
    } else {
      wishlist.splice(index, 1);
      icon?.classList.remove('text-red-500', 'fill-current');
      icon?.classList.add('text-gray-400', 'fill-none');
      btn.classList.remove('bg-red-50', 'border-red-200');
      showToast('Removed from wishlist', 'info');
    }
    cacheService.setItem('brm_wishlist', wishlist);
  };

  // Load Room Details
  if (!roomId) {
    if (container) {
      container.innerHTML = `
        <div class="text-center py-20">
          <div class="text-5xl mb-4"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
          <h2 class="font-display text-2xl mb-2">No Room Selected</h2>
          <p class="text-gray-400 mb-6">Please select a room from our collection.</p>
          <a href="rooms.html" class="btn-primary">Browse Rooms</a>
        </div>
      `;
    }
  } else {
    await loadRoom();
  }

  async function loadRoom() {
    try {
      const room = await getRoomDetailsUseCase.execute(roomId);

      if (!room) {
        if (container) {
          container.innerHTML = `
            <div class="text-center py-20">
              <div class="text-5xl mb-4"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div>
              <h2 class="font-display text-2xl mb-2">Room Not Found</h2>
              <p class="text-gray-400 mb-6">This room may have been removed or the link is incorrect.</p>
              <a href="rooms.html" class="btn-primary">Browse Rooms</a>
            </div>
          `;
        }
        return;
      }

      const images = room.images && room.images.length > 0
        ? room.images
        : [defaultImages[room.type] || 'assets/images/room-standard.webp'];

      const mainImg = images[0];
      const sideImgs = images.length > 1 ? images.slice(1, 3) : [mainImg, mainImg];
      const roomName = escapeHTML(room.name);
      const roomType = escapeHTML(room.type);
      const roomCity = escapeHTML(room.city || 'India');
      const roomStatus = escapeHTML(room.status || 'Available');
      const roomDescription = escapeHTML(room.description || 'Experience ultimate comfort in this beautifully designed room. Features premium bedding, elegant decor, and all the modern amenities you need for a relaxing stay.');
      
      const safeRoomId = encodeURIComponent(roomId);
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete('id');
      const bookingParams = searchParams.toString();
      const bookingHref = `booking.html?roomId=${safeRoomId}${bookingParams ? `&${bookingParams}` : ''}`;

      const bookDisabled = room.status !== 'Available' ? 'pointer-events: none; opacity: 0.5;' : '';
      const gstInfo = getGSTInfo(room.price);
      const gstAmount = Math.round(room.price * gstInfo.rate);
      const gstBadgeColor = gstInfo.rate === 0 ? '#10b981' : (gstInfo.rate === 0.05 ? '#f59e0b' : '#ef4444');
      const gstBadgeText = gstInfo.rate === 0 ? 'No GST' : `+ ${gstInfo.percent} GST`;
      const isSaved = wishlist.includes(roomId);

      let guestOptions = '';
      const maxCapacity = room.capacity || 2;
      const initialGuests = parseInt(searchParams.get('guests') || '2', 10) || 2;
      for (let i = 1; i <= maxCapacity; i++) {
        const isSelected = i === Math.min(initialGuests, maxCapacity) ? 'selected' : '';
        guestOptions += `<option value="${i}" ${isSelected}>${i} Guest${i > 1 ? 's' : ''}</option>`;
      }

      if (container) {
        container.innerHTML = `
          <!-- Breadcrumb -->
          <div class="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <a href="index.html" class="hover:text-primary transition-colors">Home</a>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            <a href="rooms.html" class="hover:text-primary transition-colors">Rooms</a>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            <span class="text-gray-900 font-medium">${roomName}</span>
          </div>

          <!-- Header -->
          <div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-full">${roomType}</span>
                <span class="text-sm font-medium text-gray-500 flex items-center">
                  <svg class="w-4 h-4 mr-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  ${roomCity}
                </span>
                <span class="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.056 3.056 0 001.622-.873l1.038-.89a3.055 3.055 0 011.01 4.38l-.89 1.038a3.056 3.056 0 00-.873 1.622l1.038.89a3.055 3.055 0 01-4.38 1.01l-.89-1.038a3.056 3.056 0 00-1.622.873l-1.038.89a3.055 3.055 0 01-1.01-4.38l.89-1.038a3.056 3.056 0 00.873-1.622l-1.038-.89a3.055 3.055 0 014.38-1.01l.89 1.038a3.056 3.056 0 001.622-.873l1.038-.89a3.055 3.055 0 011.01-4.38l-.89-1.038a3.056 3.056 0 00-.873-1.622l-1.038-.89a3.055 3.055 0 014.38-1.01l.89 1.038a3.056 3.056 0 001.622-.873l1.038-.89a3.055 3.055 0 011.01-4.38l-.89-1.038a3.056 3.056 0 00-.873-1.622L8.9 4.97a3.056 3.056 0 01.873-1.622l1.038-.89a3.055 3.055 0 011.01-4.38l.89 1.038a3.056 3.056 0 001.622.873l1.038.89a3.055 3.055 0 01-1.01 4.38l-.89 1.038a3.056 3.056 0 00-.873-1.622l-1.038-.89a3.055 3.055 0 01-4.38 1.01l.89-1.038a3.056 3.056 0 00-1.622.873l-1.038.89a3.055 3.055 0 01-1.01-4.38l.89-1.038a3.056 3.056 0 00.873-1.622L2.3 8.08a3.056 3.056 0 01-.873-1.622l1.038-.89a3.055 3.055 0 011.01-4.38l-.89-1.038a3.056 3.056 0 00-.873-1.622l-1.038-.89a3.055 3.055 0 014.38-1.01l.89 1.038a3.056 3.056 0 001.622-.873l1.038-.89a3.055 3.055 0 011.01-4.38l-.89-1.038a3.056 3.056 0 00-.873-1.622l-1.038-.89a3.055 3.055 0 014.38-1.01l.89 1.038a3.056 3.056 0 001.622-.873l1.038-.89a3.055 3.055 0 011.01-4.38l-.89-1.038a3.056 3.056 0 00-.873-1.622l-1.038-.89a3.078 3.078 0 014.38-1.01l.89 1.038z" clip-rule="evenodd"></path></svg>
                  BookMyRoom Verified
                </span>
              </div>
              <h1 class="font-display text-3xl md:text-4xl font-bold text-gray-900">${roomName}</h1>
            </div>
            <div>
              <div class="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-100">
                <span class="font-bold text-lg">4.8</span>
                <div class="flex text-green-500">
                  <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                </div>
                <span class="text-sm font-medium ml-1">Excellent</span>
              </div>
            </div>
          </div>

          <!-- Image Grid Gallery -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 h-[500px] rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <div class="md:col-span-2 h-full relative group">
              <img src="${escapeHTML(mainImg)}" alt="${roomName}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
              <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
            </div>
            <div class="grid-rows-2 gap-4 h-full hidden md:grid">
              <div class="relative group overflow-hidden">
                <img src="${escapeHTML(sideImgs[0])}" alt="${roomName} view 2" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
              </div>
              <div class="relative group overflow-hidden">
                <img src="${escapeHTML(sideImgs[1] || sideImgs[0])}" alt="${roomName} view 3" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
              </div>
            </div>
            <div class="grid-rows-2 gap-4 h-full hidden md:grid">
              <div class="relative group overflow-hidden">
                <img src="${escapeHTML(sideImgs[0])}" alt="${roomName} view 4" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
              </div>
              <div class="relative group overflow-hidden bg-gray-900">
                <img src="${escapeHTML(sideImgs[1] || sideImgs[0])}" alt="${roomName} view 5" class="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500">
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span class="px-6 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-white font-semibold rounded-full">+ More Photos</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Grid -->
          <div class="flex flex-col lg:flex-row gap-10">
            <!-- Details -->
            <div class="w-full lg:w-2/3">
              <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-8">
                <h2 class="text-2xl font-display font-bold text-gray-900 mb-4">About this room</h2>
                <p class="text-gray-600 leading-relaxed">${roomDescription}</p>
              </div>

              <!-- Highlights -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div class="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-center">
                  <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-blue-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  </div>
                  <div class="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Room Type</div>
                  <div class="font-bold text-gray-900">${roomType}</div>
                </div>
                
                <div class="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 text-center">
                  <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-orange-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  </div>
                  <div class="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Capacity</div>
                  <div class="font-bold text-gray-900">Up to ${room.capacity || 2} Guests</div>
                </div>
                
                <div class="bg-green-50/50 border border-green-100 rounded-2xl p-4 text-center">
                  <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-green-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <div class="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Status</div>
                  <div class="font-bold text-gray-900">${roomStatus}</div>
                </div>
                
                <div class="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 text-center">
                  <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-purple-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                  </div>
                  <div class="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Cleaning</div>
                  <div class="font-bold text-gray-900">Sanitized</div>
                </div>
              </div>

              <!-- Offers -->
              <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h2 class="text-2xl font-display font-bold text-gray-900 mb-6 flex items-center">
                  <svg class="w-6 h-6 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                  What this room offers
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  ${(room.amenities || []).map(a => `
                    <div class="flex items-center text-gray-700 py-2 border-b border-gray-50">
                      <svg class="w-5 h-5 text-green-500 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      <span class="font-medium">${escapeHTML(a)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Booking Widget -->
            <div class="w-full lg:w-1/3">
              <div class="sticky top-24">
                <div class="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative overflow-hidden">
                  <div class="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-primary to-orange-400"></div>
                  
                  <div class="flex justify-between items-start mb-6">
                    <div>
                      <div class="flex items-baseline">
                        <span class="text-4xl font-bold text-gray-900 font-display">${formatCurrency(room.price)}</span>
                        <span class="text-gray-500 ml-1">/ night</span>
                      </div>
                      <div class="mt-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style="background:${gstBadgeColor}15; color:${gstBadgeColor}">
                          ${gstBadgeText}
                        </span>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 ml-2">
                          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                          Best Price
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="border border-gray-200 rounded-2xl mb-6 overflow-hidden">
                    <div class="flex border-b border-gray-200">
                      <div class="w-1/2 p-3 border-r border-gray-200 hover:bg-gray-50 transition-colors">
                        <label for="detail-checkin" class="block text-[10px] uppercase font-bold text-gray-500 mb-1">Check-in</label>
                        <input type="date" id="detail-checkin" class="w-full bg-transparent font-medium text-sm text-gray-900 border-none outline-none p-0 cursor-pointer focus:ring-0" style="color-scheme: light;">
                      </div>
                      <div class="w-1/2 p-3 hover:bg-gray-50 transition-colors">
                        <label for="detail-checkout" class="block text-[10px] uppercase font-bold text-gray-500 mb-1">Check-out</label>
                        <input type="date" id="detail-checkout" class="w-full bg-transparent font-medium text-sm text-gray-900 border-none outline-none p-0 cursor-pointer focus:ring-0" style="color-scheme: light;">
                      </div>
                    </div>
                    <div class="p-3 hover:bg-gray-50 transition-colors flex justify-between items-center relative">
                      <div class="w-full pr-6">
                        <label for="detail-guests" class="block text-[10px] uppercase font-bold text-gray-500 mb-1">Guests</label>
                        <select id="detail-guests" class="w-full bg-transparent font-medium text-sm text-gray-900 border-none outline-none p-0 cursor-pointer appearance-none focus:ring-0">
                          ${guestOptions}
                        </select>
                      </div>
                      <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <a href="${bookingHref}" id="detail-reserve-btn" class="block w-full py-4 bg-primary hover:bg-primary-dark text-white text-center font-bold text-lg rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 mb-4 ${bookDisabled}">
                    ${roomStatus === 'Available' ? 'Reserve Now' : 'Sold Out'}
                  </a>

                  <!-- Actions -->
                  <div class="flex gap-2 mb-6">
                    <button onclick="toggleWishlistDetail('${safeRoomId}', this)" id="btn-wishlist-detail" class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border ${isSaved ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200 text-gray-600 hover:border-red-200 hover:bg-red-50'} rounded-xl font-semibold text-sm transition-all">
                      <svg class="w-5 h-5 ${isSaved ? 'fill-current' : 'fill-none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                      ${isSaved ? 'Saved' : 'Save'}
                    </button>
                    <a href="https://wa.me/?text=I%20found%20this%20great%20room%20—%20${encodeURIComponent(room.name)}%20in%20${encodeURIComponent(room.city)}%20for%20${formatCurrency(room.price)}/night%20on%20BookMyRoom:%20${window.location.origin}${window.location.pathname}?id=${safeRoomId}" target="_blank" class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 text-green-600 hover:bg-green-100 rounded-xl font-semibold text-sm transition-all">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Share
                    </a>
                  </div>

                  <div class="text-center text-sm text-gray-500 font-medium mb-6">
                    <svg class="w-4 h-4 inline-block mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    You won't be charged yet
                  </div>

                  <div class="space-y-3 pt-4 border-t border-gray-100">
                    <div class="flex justify-between text-gray-600">
                      <span id="detail-base-label" class="underline decoration-dotted cursor-help" title="Room Base Price">${formatCurrency(room.price)} x 1 night</span>
                      <span id="detail-base-cost">${formatCurrency(room.price)}</span>
                    </div>
                    <div class="flex justify-between text-gray-600">
                      <span id="detail-gst-label" class="underline decoration-dotted cursor-help" title="GST as per Indian hotel tariff rules">GST (${gstInfo.percent})</span>
                      <span id="detail-gst-cost">${gstAmount > 0 ? formatCurrency(gstAmount) : 'FREE'}</span>
                    </div>
                    <div class="flex justify-between text-gray-900 font-bold pt-3 border-t border-gray-100 text-lg">
                      <span>Total</span>
                      <span id="detail-total-cost">${formatCurrency(room.price + gstAmount)}</span>
                    </div>
                    <div class="text-center text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                      ✓ Best price guaranteed • No hidden charges • Free cancellation
                    </div>
                  </div>
                </div>
                
                <!-- Promo banner -->
                <div class="mt-6 bg-linear-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5 flex items-start gap-4">
                  <div class="bg-white p-2 rounded-xl shadow-sm text-indigo-600 shrink-0">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path></svg>
                  </div>
                  <div>
                    <h4 class="font-bold text-indigo-900 text-sm">Save 20% on this stay</h4>
                    <p class="text-indigo-700 text-xs mt-1 leading-snug">Use code <span class="font-bold bg-white px-1.5 py-0.5 rounded text-indigo-800 border border-indigo-200">WELCOME20</span> at checkout for new users.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        // Setup interactive booking widget bindings
        const checkinInput = document.getElementById('detail-checkin');
        const checkoutInput = document.getElementById('detail-checkout');
        const guestsSelect = document.getElementById('detail-guests');
        const reserveBtn = document.getElementById('detail-reserve-btn');

        if (checkinInput && checkoutInput && guestsSelect) {
          const urlParams = new URLSearchParams(window.location.search);
          const initialCheckin = urlParams.get('checkin') || getTodayISO();
          const initialCheckout = urlParams.get('checkout') || getTomorrowISO();
          const initialGuests = urlParams.get('guests') || '2';

          checkinInput.value = initialCheckin;
          checkinInput.min = getTodayISO();
          checkoutInput.value = initialCheckout;

          const updateCheckoutMin = (ciVal) => {
            const nextDay = new Date(ciVal);
            nextDay.setDate(nextDay.getDate() + 1);
            checkoutInput.min = nextDay.toISOString().split('T')[0];
          };

          updateCheckoutMin(initialCheckin);

          const updateBookingWidget = () => {
            const ci = checkinInput.value;
            let co = checkoutInput.value;
            const gu = guestsSelect.value;

            if (co <= ci) {
              const nextDay = new Date(ci);
              nextDay.setDate(nextDay.getDate() + 1);
              co = nextDay.toISOString().split('T')[0];
              checkoutInput.value = co;
            }

            const nights = calculateNights(ci, co);
            const pricing = calculatePricing(room.price, nights);

            const baseLabelEl = document.getElementById('detail-base-label');
            const baseCostEl = document.getElementById('detail-base-cost');
            const gstLabelEl = document.getElementById('detail-gst-label');
            const gstCostEl = document.getElementById('detail-gst-cost');
            const totalCostEl = document.getElementById('detail-total-cost');

            if (baseLabelEl) baseLabelEl.textContent = `${formatCurrency(room.price)} x ${nights} night${nights > 1 ? 's' : ''}`;
            if (baseCostEl) baseCostEl.textContent = formatCurrency(pricing.roomCharges);
            if (gstLabelEl) gstLabelEl.textContent = `GST (${pricing.gstPercent})`;
            if (gstCostEl) gstCostEl.textContent = pricing.taxAmount > 0 ? formatCurrency(pricing.taxAmount) : 'FREE';
            if (totalCostEl) totalCostEl.textContent = formatCurrency(pricing.total);

            if (reserveBtn) {
              reserveBtn.href = `booking.html?roomId=${safeRoomId}&checkin=${ci}&checkout=${co}&guests=${gu}&rooms=1`;
            }
          };

          checkinInput.addEventListener('change', () => {
            updateCheckoutMin(checkinInput.value);
            updateBookingWidget();
          });
          checkoutInput.addEventListener('change', updateBookingWidget);
          guestsSelect.addEventListener('change', updateBookingWidget);

          updateBookingWidget();
        }
      }
    } catch (error) {
      console.error('Error loading room:', error);
      if (container) {
        container.innerHTML = `
          <div class="text-center py-20">
            <div class="text-5xl mb-4"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div>
            <h2 class="font-display text-2xl mb-2">Connection Error</h2>
            <p class="text-gray-400 mb-6">Could not load room details. Check your Supabase config.</p>
            <a href="rooms.html" class="btn-primary">Back to Rooms</a>
          </div>
        `;
      }
    }
  }
});
