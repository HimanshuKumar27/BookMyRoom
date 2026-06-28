// ============================================================
// Infrastructure — Unified Environment Configurations
// ============================================================

import { ENV as rootEnv } from '../../env.js';

export const ENV = {
  SUPABASE_URL: rootEnv.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: rootEnv.SUPABASE_ANON_KEY || '',
  EMAILJS_PUBLIC_KEY: rootEnv.EMAILJS_PUBLIC_KEY || '',
  EMAILJS_SERVICE_ID: rootEnv.EMAILJS_SERVICE_ID || '',
  EMAILJS_TEMPLATE_ID: rootEnv.EMAILJS_TEMPLATE_ID || '',
  ADMIN_EMAIL: rootEnv.ADMIN_EMAIL || '',
};
