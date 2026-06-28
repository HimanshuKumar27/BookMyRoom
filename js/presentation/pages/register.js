// ============================================================
// Page Controller — Register Screen
// ============================================================

import { renderNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { sanitize, validateForm, showFormErrors } from '../utils/validators.js';
import { RegisterUseCase } from '../../core/use-cases/auth/RegisterUseCase.js';
import { SupabaseAuthService } from '../../adapters/services/SupabaseAuthService.js';
import { rateLimiters } from '../../infrastructure/security/rate-limiter.js';

document.addEventListener('DOMContentLoaded', () => {
  const authService = new SupabaseAuthService();
  const registerUseCase = new RegisterUseCase(authService);

  // Render components
  renderNavbar('');

  const form = document.getElementById('register-form');
  const errorDiv = document.getElementById('register-error');
  const btnRegister = document.getElementById('btn-register');

  // Toggle Password Visibilities Helper (exposed globally for HTML onclick compatibility)
  window.togglePassword = (fieldId, btn) => {
    const input = document.getElementById(fieldId);
    if (!input) return;
    
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
  };

  // Submit Handler
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullname = sanitize(document.getElementById('fullname').value);
      const email = sanitize(document.getElementById('email').value);
      const phone = sanitize(document.getElementById('phone').value);
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      // Validate inputs
      const validation = validateForm({
        'Full Name': { value: fullname, rules: ['required', 'name'] },
        'Email': { value: email, rules: ['required', 'email'] },
        'Phone': { value: phone, rules: ['required', 'phone'] },
        'Password': { value: password, rules: ['required', 'password'] }
      });

      if (password !== confirmPassword) {
        validation.errors.push('Passwords do not match.');
        validation.valid = false;
      }

      if (!validation.valid) {
        showFormErrors(validation.errors, 'form-errors');
        return;
      }
      showFormErrors([], 'form-errors');

      // Rate limiting checks
      const rateCheck = rateLimiters.register.check();
      if (!rateCheck.allowed) {
        if (errorDiv) {
          const waitSec = rateLimiters.register.getRemainingTime();
          errorDiv.textContent = `Too many registration attempts. Please try again in ${Math.ceil(waitSec / 60)} minutes.`;
          errorDiv.classList.remove('hidden');
        }
        return;
      }

      if (btnRegister) {
        btnRegister.disabled = true;
        btnRegister.textContent = 'Creating Account...';
      }
      if (errorDiv) errorDiv.classList.add('hidden');

      try {
        await registerUseCase.execute(email, password, fullname, phone);
        rateLimiters.register.reset();

        showToast('Account created! Welcome to BookMyRoom', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1200);
      } catch (error) {
        console.error('Registration failed:', error);
        let msg = 'Registration failed. Please try again.';
        if (error.message?.includes('already registered')) {
          msg = 'An account with this email already exists.';
        } else if (error.message?.includes('password')) {
          msg = 'Password is too weak. Use at least 6 characters.';
        } else if (error.message) {
          msg = error.message;
        }

        if (errorDiv) {
          errorDiv.textContent = msg;
          errorDiv.classList.remove('hidden');
        }
        if (btnRegister) {
          btnRegister.disabled = false;
          btnRegister.textContent = 'Create Account';
        }
      }
    });
  }
});
