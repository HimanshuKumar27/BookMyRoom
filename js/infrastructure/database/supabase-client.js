// ============================================================
// Infrastructure — Supabase SDK Client Initialization
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { ENV } from '../config/env.js';

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or Anon Key is missing from env.js configuration.');
}

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
