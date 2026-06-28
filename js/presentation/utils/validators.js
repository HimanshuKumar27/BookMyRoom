// ============================================================
// Presentation Utility — Validation & Sanitization Helpers
// ============================================================

/**
 * Sanitize a string to prevent XSS — strips HTML tags and trims whitespace
 */
export function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // strip angle brackets
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Validate an email address
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim()) && email.length <= 254;
}

/**
 * Validate an Indian phone number
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  const re = /^(\+?91|0)?[6-9]\d{9}$/;
  return re.test(cleaned);
}

/**
 * Validate a name (2–100 chars, letters and spaces only)
 */
export function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100 && /^[a-zA-Z\s.'\-]+$/.test(trimmed);
}

/**
 * Validate a password (min 6 chars, at least 1 letter and 1 number)
 */
export function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6 && password.length <= 128 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

/**
 * Validate a date string (YYYY-MM-DD) and ensure it's not in the past
 */
export function isValidFutureDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dateStr)) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

/**
 * Validate check-in / check-out date pair
 */
export function isValidDateRange(checkIn, checkOut) {
  if (!isValidFutureDate(checkIn)) {
    return { valid: false, error: 'Check-in date must be today or later.' };
  }
  if (!checkOut || typeof checkOut !== 'string') {
    return { valid: false, error: 'Check-out date is required.' };
  }
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  if (isNaN(d2.getTime())) {
    return { valid: false, error: 'Invalid check-out date.' };
  }
  if (d2 <= d1) {
    return { valid: false, error: 'Check-out must be after check-in.' };
  }
  const maxNights = 30;
  const nights = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
  if (nights > maxNights) {
    return { valid: false, error: `Maximum stay is ${maxNights} nights.` };
  }
  return { valid: true, error: null };
}

/**
 * Validate a positive integer
 */
export function isValidPositiveInt(value, min = 1, max = 100000) {
  const num = parseInt(value, 10);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * Validate room price (₹500 to ₹100,000/night)
 */
export function isValidPrice(price) {
  return isValidPositiveInt(price, 500, 100000);
}

/**
 * Validate a general text field
 */
export function isValidText(text, minLen = 1, maxLen = 500) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.length >= minLen && trimmed.length <= maxLen;
}

/**
 * Validate a URL
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Comprehensive form validator
 */
export function validateForm(fields) {
  const errors = [];

  for (const [fieldName, config] of Object.entries(fields)) {
    const { value, rules = [] } = config;

    for (const rule of rules) {
      if (rule === 'required' && (!value || (typeof value === 'string' && !value.trim()))) {
        errors.push(`${fieldName} is required.`);
        break; // skip other rules if empty
      }
      if (rule === 'email' && value && !isValidEmail(value)) {
        errors.push(`${fieldName} must be a valid email address.`);
      }
      if (rule === 'phone' && value && !isValidPhone(value)) {
        errors.push(`${fieldName} must be a valid Indian phone number (10 digits starting with 6-9).`);
      }
      if (rule === 'name' && value && !isValidName(value)) {
        errors.push(`${fieldName} must be 2–100 characters and contain only letters.`);
      }
      if (rule === 'password' && value && !isValidPassword(value)) {
        errors.push(`${fieldName} must be at least 6 characters with at least 1 letter and 1 number.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Show validation errors on a form
 */
export function showFormErrors(errors, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (errors.length === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = `
    <div style="background:#fee2e2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <div style="color:#dc2626;font-weight:600;font-size:0.85rem;margin-bottom:4px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:4px;">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Please fix the following:
      </div>
      <ul style="color:#b91c1c;font-size:0.82rem;margin:0;padding-left:18px;">
        ${errors.map(e => `<li>${e}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Generate CSRF-like token
 */
export function generateFormToken(formId) {
  const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  sessionStorage.setItem(`formToken_${formId}`, token);
  return token;
}

/**
 * Verify CSRF-like token
 */
export function verifyFormToken(formId, token) {
  const stored = sessionStorage.getItem(`formToken_${formId}`);
  if (!stored || stored !== token) return false;
  sessionStorage.removeItem(`formToken_${formId}`);
  return true;
}
