// ============================================================
// Page Controller — Login Screen
// ============================================================

import { renderNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { sanitize, validateForm, showFormErrors } from '../utils/validators.js';
import { LoginUseCase } from '../../core/use-cases/auth/LoginUseCase.js';
import { SupabaseAuthService } from '../../adapters/services/SupabaseAuthService.js';
import { BrowserStorageCache } from '../../adapters/services/BrowserStorageCache.js';
import { rateLimiters } from '../../infrastructure/security/rate-limiter.js';

document.addEventListener('DOMContentLoaded', () => {
  const authService = new SupabaseAuthService();
  const cacheService = new BrowserStorageCache();
  const sessionCache = new BrowserStorageCache('session');
  const loginUseCase = new LoginUseCase(authService, cacheService);

  // Render components
  renderNavbar('');

  const form = document.getElementById('login-form');
  const errorDiv = document.getElementById('login-error');
  const btnLogin = document.getElementById('btn-login');
  const rememberMe = document.getElementById('remember-me');
  const emailInput = document.getElementById('email');

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

  // Restore remembered email on start
  if (emailInput && rememberMe) {
    const savedEmail = cacheService.getItem('brm_remembered_email');
    if (savedEmail) {
      emailInput.value = savedEmail;
      rememberMe.checked = true;
    }
  }

  // Submit Handler
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = sanitize(document.getElementById('email').value);
      const password = document.getElementById('password').value;

      // Validate Fields
      const validation = validateForm({
        'Email': { value: email, rules: ['required', 'email'] },
        'Password': { value: password, rules: ['required'] }
      });

      if (!validation.valid) {
        showFormErrors(validation.errors, 'form-errors');
        return;
      }
      showFormErrors([], 'form-errors');

      // Rate limit check
      const rateCheck = rateLimiters.login.check();
      if (!rateCheck.allowed) {
        if (errorDiv) {
          const waitSec = rateLimiters.login.getRemainingTime();
          errorDiv.textContent = `Too many login attempts. Please try again in ${waitSec} seconds.`;
          errorDiv.classList.remove('hidden');
        }
        return;
      }

      if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.textContent = 'Logging In...';
      }
      if (errorDiv) errorDiv.classList.add('hidden');

      try {
        await loginUseCase.execute(email, password, rememberMe?.checked || false);
        rateLimiters.login.reset();

        showToast('Welcome back! Redirecting...', 'success');

        // Redirect check
        const redirect = sessionCache.getItem('authRedirect') || 'index.html';
        sessionCache.removeItem('authRedirect');
        setTimeout(() => { window.location.href = redirect; }, 1000);
      } catch (error) {
        console.error('Login failed:', error);
        let msg = 'Login failed. Please try again.';
        if (error.message?.includes('Invalid login credentials')) {
          msg = 'Invalid email or password.';
        } else if (error.message?.includes('Email not confirmed')) {
          msg = 'Please confirm your email address first.';
        }
        
        if (errorDiv) {
          errorDiv.textContent = msg;
          errorDiv.classList.remove('hidden');
        }
        if (btnLogin) {
          btnLogin.disabled = false;
          btnLogin.textContent = 'Login';
        }
      }
    });
  }
});
