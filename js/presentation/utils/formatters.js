// ============================================================
// Presentation Utility — Formatters
// ============================================================

/**
 * Format a number as Indian Rupees
 * @param {number} amount 
 * @returns {string} Formatted currency
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format a date string (YYYY-MM-DD) for display
 * @param {string} dateStr 
 * @returns {string} Formatted date (e.g. 15 Aug 2026)
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
