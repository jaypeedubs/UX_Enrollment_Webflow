import { db } from '../core/supabase.js';
import { requireAuth } from '../core/auth.js';
import { q, show, hide, setText, setCvProgress, revealPage, applyDesignSystemClasses } from '../core/ui.js';

// ─── PAGE-PRIVATE DATA ───────────────────────────────────────────────────────

async function loadApplication(session) {
  const { data, error } = await db
    .from('applications')
    .select(`
      id, program_id, status, submitted_at, updated_at,
      cv_url, locked_fields, program_answers,
      email_consent, phone, address, city, state, zip_code,
      country, credentials, current_role, institution,
      programs ( id, name, price_cents, program_questions )
    `)
    .eq('applicant_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadPrograms() {
  const { data, error } = await db
    .from('programs')
    .select('id, name, deadline, price_cents, program_questions')
    .in('status', ['active', 'upcoming']);
  if (error) throw error;
  return data;
}

// fields: { id?, programId, firstName, lastName, programAnswers?,
//           emailConsent, phone, address, city, state, zipCode,
//           country, credentials, currentRole, institution }
async function saveDraft(session, fields) {
  await db.auth.updateUser({
    data: { first_name: fields.firstName, last_name: fields.lastName },
  });

  const payload = {
    applicant_id: session.user.id,
    program_id: fields.programId,
    status: 'draft',
    locked_fields: { program: true, first_name: true, last_name: true },
    email_consent: !!fields.emailConsent,
    phone: fields.phone || null,
    address: fields.address || null,
    city: fields.city || null,
    state: fields.state || null,
    zip_code: fields.zipCode || null,
    country: fields.country || null,
    credentials: fields.credentials || null,
    current_role: fields.currentRole || null,
    institution: fields.institution || null,
  };
  if (fields.id) payload.id = fields.id;
  if (fields.programAnswers) payload.program_answers = fields.programAnswers;

  const { data, error } = await db
    .from('applications')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;

  await db
    .from('application_events')
    .insert({ application_id: data.id, event_type: 'draft_saved' });

  return data;
}

async function uploadCV(session, applicationId, file) {
  const ext = file.name.split('.').pop();
  const path = session.user.id + '/' + applicationId + '.' + ext;
  const { error: upErr } = await db.storage
    .from('cvs')
    .upload(path, file, { upsert: true });
  if (upErr) throw upErr;

  const { error: dbErr } = await db
    .from('applications')
    .update({ cv_url: path })
    .eq('id', applicationId);
  if (dbErr) throw dbErr;

  return path;
}

async function removeCV(session, applicationId) {
  const { error } = await db
    .from('applications')
    .update({ cv_url: null })
    .eq('id', applicationId)
    .eq('applicant_id', session.user.id);
  if (error) throw error;
}

// Guards against double-submission with .eq('status', 'draft').
async function submitApplication(session, applicationId) {
  const { data: updated, error: upErr } = await db
    .from('applications')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      locked_fields: { all: true },
    })
    .eq('id', applicationId)
    .eq('status', 'draft')
    .select('id');
  if (upErr) throw upErr;
  if (!updated || updated.length === 0) {
    throw new Error('Application is no longer a draft and cannot be submitted.');
  }

  const { error: evErr } = await db
    .from('application_events')
    .insert({ application_id: applicationId, event_type: 'submitted' });
  if (evErr) throw evErr;
}

// ─── PAGE-PRIVATE HELPERS ────────────────────────────────────────────────────

function normalizeQuestions(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function updateApplyStepper(sectionNumber) {
  const percent = String(Math.round(sectionNumber * 33.3333)) + '%';
  q('[wized="form-progress-fill"]')?.style.setProperty('width', percent, 'important');
  for (let n = 1; n <= 3; n++) {
    const label = q('[wized="step-label-' + n + '"]');
    if (!label) continue;
    if (n === sectionNumber) {
      label.classList.add('progress-step-active');
    } else {
      label.classList.remove('progress-step-active');
    }
  }
}

function clearGeneratedQuestions() {
  document.querySelectorAll('[data-icit-generated-question]').forEach((el) => el.remove());
}

function questionHost(template) {
  if (template?.parentElement) return template.parentElement;
  const dynamicQ = q('[wized="dynamic-questions"]');
  if (dynamicQ) return dynamicQ;
  const section = q('[wized="form-section-2"]') || document.body;
  let host = document.getElementById('icit-generated-questions');
  if (!host) {
    host = document.createElement('div');
    host.id = 'icit-generated-questions';
    host.style.margin = '16px 0';
    const before = q('[wized="questions-empty"]') || q('[wized="save-draft-2-btn"]')?.parentElement;
    if (before?.parentElement === section) {
      section.insertBefore(host, before);
    } else {
      section.appendChild(host);
    }
  }
  return host;
}

function createGeneratedQuestion(question, currentValue) {
  const row = document.createElement('div');
  row.dataset.icitGeneratedQuestion = '1';
  row.className = 'form-group-1';

  const label = document.createElement('label');
  label.textContent = question.label || question.id;
  label.htmlFor = 'icit-' + question.id;
  label.className = 'form-label';
  row.appendChild(label);

  let control;
  if (question.type === 'select') {
    control = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select an option';
    control.appendChild(placeholder);
    (question.options || []).forEach((opt) => {
      const el = document.createElement('option');
      el.value = opt;
      el.textContent = opt;
      control.appendChild(el);
    });
  } else {
    control = document.createElement(question.type === 'textarea' ? 'textarea' : 'input');
    if (control.tagName === 'INPUT') control.type = question.type === 'email' ? 'email' : 'text';
  }

  control.id = 'icit-' + question.id;
  control.name = question.id;
  control.dataset.questionId = question.id;
  control.value = currentValue || '';
  control.className = 'form-input-1';
  row.appendChild(control);

  return { row, control };
}

function filenameFromPath(path) {
  if (!path) return '';
  return String(path).split('/').pop() || '';
}

function cloneRow(template) {
  const clone = template.cloneNode(true);
  clone.style.display = '';
  [...clone.classList].filter(c => c.endsWith('-tpl')).forEach(c => clone.classList.remove(c));
  return clone;
}

// ─── PAGE ENTRY POINT ────────────────────────────────────────────────────────

export async function initApply() {
  const session = await requireAuth();

  const [programs, draft] = await Promise.all([
    loadPrograms(),
    loadApplication(session),
  ]);

  if (draft && draft.status !== 'draft') {
    window.location.href = '/dashboard';
    return;
  }

  revealPage();
  applyDesignSystemClasses();

  let applicationId = draft ? draft.id : null;
  let cvUploaded = !!(draft && draft.cv_url);
  let currentSection = 1;
  let programAnswers = {};

  function goToSection(n) {
    ['form-section-1', 'form-section-2', 'form-section-3'].forEach((wid) => {
      hide(q('[wized="' + wid + '"]'));
    });
    show(q('[wized="form-section-' + n + '"]'));
    currentSection = n;
    updateApplyStepper(n);
  }
  goToSection(1);

  const sec1 = q('[wized="form-section-1"]');
  if (sec1 && !sec1.querySelector('[data-icit-back]')) {
    const back = document.createElement('a');
    back.href = '/dashboard';
    back.dataset.icitBack = '1';
    back.textContent = '← Back to Dashboard';
    back.className = 'btn-secondary-1-2';
    back.style.cssText = 'display:inline-block;margin-bottom:20px;';
    sec1.insertBefore(back, sec1.firstChild);
  }

  const programSelect = q('[wized="program-select"]');
  if (programSelect) {
    if (programSelect.options && programSelect.options.length === 0) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select a program';
      programSelect.appendChild(placeholder);
    }
    programs.forEach((prog) => {
      const opt = document.createElement('option');
      opt.value = prog.id;
      opt.textContent = prog.name;
      programSelect.appendChild(opt);
    });
  }

  if (programs.length === 0) {
    hide(q('[wized="questions-loading"]'));
    show(q('[wized="questions-empty"]'));
    setText(q('[wized="form-error-msg"]'), 'No active programs are available yet. Add a program in Supabase to continue testing.');
    show(q('[wized="form-error-msg"]'));
  }

  if (draft) {
    applicationId = draft.id;
    cvUploaded = !!draft.cv_url;

    if (programSelect && draft.program_id) programSelect.value = draft.program_id;
    if (programSelect && draft.locked_fields?.program) {
      programSelect.disabled = true;
      show(q('[wized="program-locked"]'));
    }

    const meta = session.user.user_metadata || {};
    if (q('[wized="applicant-first-name"]')) q('[wized="applicant-first-name"]').value = meta.first_name || '';
    if (q('[wized="applicant-last-name"]')) q('[wized="applicant-last-name"]').value = meta.last_name || '';
    if (q('[wized="applicant-email"]')) q('[wized="applicant-email"]').value = session.user.email || '';

    if (draft.locked_fields?.first_name) {
      if (q('[wized="applicant-first-name"]')) q('[wized="applicant-first-name"]').disabled = true;
      if (q('[wized="applicant-last-name"]')) q('[wized="applicant-last-name"]').disabled = true;
      show(q('[wized="first-name-locked"]'));
      show(q('[wized="last-name-locked"]'));
    }

    // Pre-fill contact fields (elements may not exist in Webflow yet — null-safe)
    if (q('[wized="applicant-email-consent"]')) q('[wized="applicant-email-consent"]').checked = !!draft.email_consent;
    if (q('[wized="applicant-phone"]')) q('[wized="applicant-phone"]').value = draft.phone || '';
    if (q('[wized="applicant-address"]')) q('[wized="applicant-address"]').value = draft.address || '';
    if (q('[wized="applicant-city"]')) q('[wized="applicant-city"]').value = draft.city || '';
    if (q('[wized="applicant-state"]')) q('[wized="applicant-state"]').value = draft.state || '';
    if (q('[wized="applicant-zip-code"]')) q('[wized="applicant-zip-code"]').value = draft.zip_code || '';
    if (q('[wized="applicant-country"]')) q('[wized="applicant-country"]').value = draft.country || '';
    if (q('[wized="applicant-credentials"]')) q('[wized="applicant-credentials"]').value = draft.credentials || '';
    if (q('[wized="applicant-current-role"]')) q('[wized="applicant-current-role"]').value = draft.current_role || '';
    if (q('[wized="applicant-institution"]')) q('[wized="applicant-institution"]').value = draft.institution || '';
  }

  if (q('[wized="applicant-email"]')) {
    q('[wized="applicant-email"]').value = session.user.email || '';
    q('[wized="applicant-email"]').disabled = true;
  }

  function syncCvUi() {
    if (cvUploaded) {
      hide(q('[wized="cv-upload-zone"]'));
      show(q('[wized="cv-upload-success"]'));
      show(q('[wized="cv-remove-btn"]'));
      setText(q('[wized="cv-filename"]'), filenameFromPath(draft?.cv_url) || 'CV uploaded');
      setCvProgress(100);
    } else {
      show(q('[wized="cv-upload-zone"]'));
      hide(q('[wized="cv-upload-success"]'));
      hide(q('[wized="cv-remove-btn"]'));
      setText(q('[wized="cv-filename"]'), '');
      setCvProgress(0);
    }
  }
  syncCvUi();

  function renderQuestions(programId, existingAnswers) {
    programAnswers = Object.assign({}, existingAnswers || {});
    const prog = programs.find((p) => p.id === programId);
    const questions = normalizeQuestions(prog && prog.program_questions);
    const template = q('[wized="question-item"]');

    clearGeneratedQuestions();
    if (template) {
      template.parentElement.querySelectorAll('[data-icit-clone]').forEach((el) => el.remove());
      hide(template);
    }

    if (questions.length === 0) {
      show(q('[wized="questions-empty"]'));
      hide(q('[wized="questions-loading"]'));
      return;
    }

    hide(q('[wized="questions-empty"]'));
    hide(q('[wized="questions-loading"]'));
    const host = questionHost(template);
    questions.forEach((question) => {
      let row;
      let control;
      if (template) {
        row = cloneRow(template);
        row.dataset.icitClone = '1';
        const label = row.querySelector('label') || row.querySelector('[data-question-label]');
        if (label) label.textContent = question.label;
        const input = row.querySelector('input, select, textarea');
        if (input) {
          control = input;
          if (question.type === 'select' && input.tagName !== 'SELECT') {
            control = document.createElement('select');
            control.className = input.className;
            input.replaceWith(control);
          } else if (question.type === 'textarea' && input.tagName !== 'TEXTAREA') {
            control = document.createElement('textarea');
            control.className = input.className;
            control.placeholder = input.placeholder || '';
            input.replaceWith(control);
          } else if (question.type && question.type !== 'select' && input.tagName === 'INPUT') {
            input.type = question.type === 'email' ? 'email' : 'text';
          }
        }
      } else {
        const generated = createGeneratedQuestion(question, programAnswers[question.id]);
        row = generated.row;
        control = generated.control;
      }

      if (control) {
        control.name = question.id;
        control.dataset.questionId = question.id;
        if (question.type === 'select' && question.options && template) {
          control.innerHTML = '';
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'Select an option';
          control.appendChild(placeholder);
          question.options.forEach((opt) => {
            const el = document.createElement('option');
            el.value = opt;
            el.textContent = opt;
            control.appendChild(el);
          });
        }
        control.value = programAnswers[question.id] || '';
        control.addEventListener('change', (e) => { programAnswers[question.id] = e.target.value; });
        control.addEventListener('input', (e) => { programAnswers[question.id] = e.target.value; });
      }
      host.appendChild(row);
    });
  }

  if (draft && draft.program_id) {
    renderQuestions(draft.program_id, draft.program_answers);
    if (draft.program_answers && typeof draft.program_answers === 'object') {
      programAnswers = Object.assign({}, draft.program_answers);
      Object.entries(draft.program_answers).forEach(([id, val]) => {
        const input = q('[data-question-id="' + id + '"]');
        if (input) input.value = val;
      });
    }
  }

  if (programSelect) {
    programSelect.addEventListener('change', () => { renderQuestions(programSelect.value); });
    if (!draft && programSelect.value) renderQuestions(programSelect.value);
  }

  function collectFields() {
    return {
      id: applicationId,
      programId: programSelect ? programSelect.value : '',
      firstName: (q('[wized="applicant-first-name"]') || {}).value || '',
      lastName: (q('[wized="applicant-last-name"]') || {}).value || '',
      programAnswers: Object.keys(programAnswers).length ? programAnswers : undefined,
      emailConsent: !!(q('[wized="applicant-email-consent"]') || {}).checked,
      phone: (q('[wized="applicant-phone"]') || {}).value || '',
      address: (q('[wized="applicant-address"]') || {}).value || '',
      city: (q('[wized="applicant-city"]') || {}).value || '',
      state: (q('[wized="applicant-state"]') || {}).value || '',
      zipCode: (q('[wized="applicant-zip-code"]') || {}).value || '',
      country: (q('[wized="applicant-country"]') || {}).value || '',
      credentials: (q('[wized="applicant-credentials"]') || {}).value || '',
      currentRole: (q('[wized="applicant-current-role"]') || {}).value || '',
      institution: (q('[wized="applicant-institution"]') || {}).value || '',
    };
  }

  async function doSaveDraft() {
    const fields = collectFields();
    if (!fields.programId) {
      throw new Error('Please select a program before saving your draft.');
    }
    const saved = await saveDraft(session, fields);
    applicationId = saved.id;
    const indicator = q('[wized="form-draft-status"]');
    show(indicator);
    setTimeout(() => hide(indicator), 3000);
    return saved;
  }

  const saveDraftBtn = q('[wized="save-draft-btn"]');
  if (saveDraftBtn) saveDraftBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await doSaveDraft(); } catch (err) {
      console.error(err);
      setText(q('[wized="form-error-msg"]'), err.message || 'Failed to save draft. Please try again.');
      show(q('[wized="form-error-msg"]'));
    }
  });

  const nextSection1Btn = q('[wized="next-section-1-btn"]');
  if (nextSection1Btn) nextSection1Btn.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await doSaveDraft(); goToSection(2); } catch (err) {
      console.error(err);
      setText(q('[wized="form-error-msg"]'), err.message || 'Please complete this section before continuing.');
      show(q('[wized="form-error-msg"]'));
    }
  });

  const saveDraft2Btn = q('[wized="save-draft-2-btn"]');
  if (saveDraft2Btn) saveDraft2Btn.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await doSaveDraft(); } catch (err) {
      console.error(err);
      setText(q('[wized="form-error-msg"]'), err.message || 'Failed to save draft. Please try again.');
      show(q('[wized="form-error-msg"]'));
    }
  });

  const backSection2Btn = q('[wized="back-section-2-btn"]');
  if (backSection2Btn) backSection2Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(1);
  });

  const nextSection2Btn = q('[wized="next-section-2-btn"]');
  if (nextSection2Btn) nextSection2Btn.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await doSaveDraft(); goToSection(3); } catch (err) {
      console.error(err);
      setText(q('[wized="form-error-msg"]'), err.message || 'Please complete this section before continuing.');
      show(q('[wized="form-error-msg"]'));
    }
  });

  const cvFileInput = q('[wized="cv-file-input"]');
  if (cvFileInput) cvFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!applicationId) {
      setText(q('[wized="form-error-msg"]'), 'Please save your draft before uploading a CV.');
      show(q('[wized="form-error-msg"]'));
      return;
    }
    try {
      setCvProgress(0);
      await uploadCV(session, applicationId, file);
      cvUploaded = true;
      hide(q('[wized="cv-upload-zone"]'));
      show(q('[wized="cv-upload-success"]'));
      show(q('[wized="cv-remove-btn"]'));
      const display = q('[wized="cv-filename"]');
      if (display) setText(display, file.name);
      setCvProgress(100);
    } catch (err) { console.error('CV upload failed:', err); }
  });

  const cvRemoveBtn = q('[wized="cv-remove-btn"]');
  if (cvRemoveBtn) cvRemoveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!applicationId) return;
    try {
      await removeCV(session, applicationId);
      cvUploaded = false;
      show(q('[wized="cv-upload-zone"]'));
      hide(q('[wized="cv-upload-success"]'));
      hide(q('[wized="cv-remove-btn"]'));
      if (q('[wized="cv-file-input"]')) q('[wized="cv-file-input"]').value = '';
      const display = q('[wized="cv-filename"]');
      if (display) setText(display, '');
      setCvProgress(0);
    } catch (err) { console.error(err); }
  });

  const saveDraft3Btn = q('[wized="save-draft-3-btn"]');
  if (saveDraft3Btn) saveDraft3Btn.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await doSaveDraft(); } catch (err) {
      console.error(err);
      setText(q('[wized="form-error-msg"]'), err.message || 'Failed to save draft. Please try again.');
      show(q('[wized="form-error-msg"]'));
    }
  });

  const backSection3Btn = q('[wized="back-section-3-btn"]');
  if (backSection3Btn) backSection3Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(2);
  });

  const submitAppBtn = q('[wized="submit-application-btn"]');
  if (submitAppBtn) submitAppBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!cvUploaded) {
      alert('Please upload your CV before submitting.');
      return;
    }
    try {
      await doSaveDraft();
      await submitApplication(session, applicationId);
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Submit failed:', err);
      setText(q('[wized="form-error-msg"]'), err.message || 'Submission failed. Please try again.');
      show(q('[wized="form-error-msg"]'));
    }
  });
}
