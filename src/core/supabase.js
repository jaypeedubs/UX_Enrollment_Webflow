import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants.js';

// `window.supabase` is the UMD build loaded from CDN in Webflow's <head>.
// esbuild treats this as a browser global — no npm import needed.
export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global sign-out listener: redirect to /login whenever the session ends.
// Fires only on SIGNED_OUT — INITIAL_SESSION is intentionally ignored.
db.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
});
