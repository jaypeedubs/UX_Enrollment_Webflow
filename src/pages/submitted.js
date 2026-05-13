import { requireAuth } from '../core/auth.js';
import { db } from '../core/supabase.js';
import { q, setText, revealPage } from '../core/ui.js';

export async function initSubmitted() {
  const session = await requireAuth();

  let programName = '';
  const cached = sessionStorage.getItem('icit-selected-course');
  if (cached) {
    try { programName = JSON.parse(cached).programName || ''; } catch (_) {}
    sessionStorage.removeItem('icit-selected-course');
  }

  if (!programName) {
    // Fallback: read program name from most recent submitted application
    const { data } = await db
      .from('applications')
      .select('programs ( name )')
      .eq('applicant_id', session.user.id)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    programName = data?.programs?.name || '';
  }

  setText(q('[wized="submitted-program-name"]'), programName);
  revealPage();
}
