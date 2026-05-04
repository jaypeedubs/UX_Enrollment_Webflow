export const SUPABASE_URL = 'https://xvweanlqcbgbiyxqhwux.supabase.co';

// This key is safe to commit — it is the public anon key, not the service-role key.
// Update manually if the Supabase project changes (Webflow cannot read .env).
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2d2VhbmxxY2JnYml5eHFod3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTY0NjcsImV4cCI6MjA5MjYzMjQ2N30.Fs819XQjDXoT8l0qZreFEjeu_Xf2zjzqBG87BjGTQM4';

export const EDGE_FN_BASE = SUPABASE_URL + '/functions/v1';

// Applicant-side: 'draft' is included because applicants can cancel a draft.
// Admin-side (admin/src/lib/constants.ts) intentionally excludes 'draft' —
// admins never withdraw drafts; that is an applicant-only action.
export const WITHDRAW_ALLOWED = ['draft', 'submitted', 'in_review', 'waitlisted', 'accepted'];

// All valid application statuses, in lifecycle order.
export const STATUSES = [
  'draft', 'submitted', 'in_review', 'waitlisted',
  'accepted', 'rejected', 'enrolled', 'withdrawn',
];
