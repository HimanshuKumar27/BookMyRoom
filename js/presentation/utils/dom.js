// ============================================================
// Presentation Utility — DOM and Browser Helpers
// ============================================================

/**
 * Escape dynamic text before placing it inside HTML templates.
 */
export function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get URL query parameter
 */
export function getParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
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
 * Checks if a string is a valid ISO date (YYYY-MM-DD)
 */
export function isISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(new Date(value).getTime());
}

/**
 * Parses parameters into a standard Search Criteria object
 */
export function parseSearchCriteria(params = new URLSearchParams(window.location.search)) {
  const checkin = params.get('checkin') || '';
  const checkout = params.get('checkout') || '';
  const guests = Math.max(1, parseInt(params.get('guests') || '1', 10) || 1);
  const rooms = Math.max(1, parseInt(params.get('rooms') || '1', 10) || 1);
  const hasDateRange = isISODate(checkin) && isISODate(checkout) && checkout > checkin;

  return { checkin, checkout, guests, rooms, hasDateRange };
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
