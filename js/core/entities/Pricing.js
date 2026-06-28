// ============================================================
// Domain Entity — Pricing Rules
// ============================================================

/**
 * Calculate the number of nights between check-in and check-out date strings.
 * @param {string} checkIn - Check-in date (YYYY-MM-DD)
 * @param {string} checkOut - Check-out date (YYYY-MM-DD)
 * @returns {number} The number of nights (minimum 0)
 */
export function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diff = d2.getTime() - d1.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Get GST rate, label, and percent string based on per-night room tariff.
 * Indian Hotel GST Slabs:
 * - Up to ₹1,000/night   → 0% GST (Exempt)
 * - ₹1,001 – ₹7,500/night → 5% GST (No ITC)
 * - Above ₹7,500/night    → 18% GST (ITC allowed)
 * 
 * @param {number} pricePerNight - Base price per night
 * @returns {Object} { rate, label, percent }
 */
export function getGSTInfo(pricePerNight) {
  const price = Number(pricePerNight) || 0;
  if (price <= 1000) {
    return { rate: 0, label: 'No GST (Exempt)', percent: '0%' };
  }
  if (price <= 7500) {
    return { rate: 0.05, label: 'GST @ 5%', percent: '5%' };
  }
  return { rate: 0.18, label: 'GST @ 18%', percent: '18%' };
}

/**
 * Calculate full pricing breakdown with GST slab + optional coupon discount.
 * 
 * @param {number} pricePerNight - Room price per night
 * @param {number} nights - Total stay nights
 * @param {number} discountPercent - Discount percentage (e.g. 20)
 * @returns {Object} Price details breakdown
 */
export function calculatePricing(pricePerNight, nights, discountPercent = 0) {
  const basePrice = Number(pricePerNight) || 0;
  const stayNights = Number(nights) || 0;
  const pct = Number(discountPercent) || 0;

  const gst = getGSTInfo(basePrice);
  const roomCharges = basePrice * stayNights;
  const discount = pct > 0 ? Math.round(roomCharges * (pct / 100)) : 0;
  const chargesAfterDiscount = roomCharges - discount;
  const taxAmount = Math.round(chargesAfterDiscount * gst.rate);
  const total = chargesAfterDiscount + taxAmount;

  return {
    pricePerNight: basePrice,
    nights: stayNights,
    roomCharges,
    discount,
    discountPercent: pct,
    chargesAfterDiscount,
    gstRate: gst.rate,
    gstLabel: gst.label,
    gstPercent: gst.percent,
    taxAmount,
    total
  };
}
