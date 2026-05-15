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
  const stepMap = { 1: 1, 2: 1, 3: 3, 4: 2, 5: 3 };
  const stepperStep = stepMap[sectionNumber] || 1;
  for (let i = 1; i <= 3; i++) {
    const step = q('[wized="progress-step-' + i + '"]');
    if (!step) continue;
    step.classList.remove('completed', 'current');
    if (i < stepperStep) step.classList.add('completed');
    else if (i === stepperStep) step.classList.add('current');
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
  [...clone.classList]
    .filter(c => c.endsWith('-tpl') || /^inline-(div|p)-\d/.test(c))
    .forEach(c => clone.classList.remove(c));
  return clone;
}

// ─── PAGE ENTRY POINT ────────────────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeSvgBase(size) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  return svg;
}

function makePath(d) {
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  return p;
}

function makeLine(x1, y1, x2, y2) {
  const l = document.createElementNS(SVG_NS, 'line');
  l.setAttribute('x1', x1); l.setAttribute('y1', y1);
  l.setAttribute('x2', x2); l.setAttribute('y2', y2);
  return l;
}

function makePolyline(points) {
  const pl = document.createElementNS(SVG_NS, 'polyline');
  pl.setAttribute('points', points);
  return pl;
}

function makeUploadArrowSvg() {
  const svg = makeSvgBase('32');
  svg.appendChild(makePath('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'));
  svg.appendChild(makePolyline('17 8 12 3 7 8'));
  svg.appendChild(makeLine('12', '3', '12', '15'));
  return svg;
}

function makeDropArrowSvg() {
  const svg = makeSvgBase('32');
  svg.appendChild(makePath('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'));
  svg.appendChild(makePolyline('7 10 12 15 17 10'));
  svg.appendChild(makeLine('12', '15', '12', '3'));
  return svg;
}

function makeWarnSvg() {
  const svg = makeSvgBase('32');
  svg.appendChild(makePath('M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'));
  svg.appendChild(makeLine('12', '9', '12', '13'));
  svg.appendChild(makeLine('12', '17', '12.01', '17'));
  return svg;
}

const UPLOAD_ALLOWED_EXTS = ['.pdf', '.doc', '.docx'];
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const UPLOAD_HINT_DEFAULT = 'PDF or DOC — max 10 MB';

function buildUploadZone(zone, onFile) {
  const iconEl  = document.createElement('span');
  const labelEl = document.createElement('span');
  const hintEl  = document.createElement('span');
  iconEl.className  = 'upload-icon';
  labelEl.className = 'upload-label';
  hintEl.className  = 'upload-hint';
  labelEl.textContent = 'Drag & drop your CV or click to browse';
  hintEl.textContent  = UPLOAD_HINT_DEFAULT;
  iconEl.appendChild(makeUploadArrowSvg());

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.doc,.docx';
  input.style.display = 'none';

  zone.replaceChildren(iconEl, labelEl, hintEl, input);

  function resetDefault() {
    zone.classList.remove('upload-zone--active', 'upload-zone--error');
    iconEl.replaceChildren(makeUploadArrowSvg());
    hintEl.textContent = UPLOAD_HINT_DEFAULT;
  }

  function setError(msg) {
    zone.classList.remove('upload-zone--active');
    zone.classList.add('upload-zone--error');
    iconEl.replaceChildren(makeWarnSvg());
    hintEl.textContent = msg;
  }

  function validate(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!UPLOAD_ALLOWED_EXTS.includes(ext)) {
      setError('Invalid file type. Upload a PDF or DOC file.');
      return false;
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      setError('File too large. Maximum size is 10 MB.');
      return false;
    }
    return true;
  }

  zone.addEventListener('click', (e) => {
    if (e.target === input) return;
    input.click();
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('upload-zone--active');
    iconEl.replaceChildren(makeDropArrowSvg());
    hintEl.textContent = 'Drop to upload';
  });

  zone.addEventListener('dragleave', (e) => {
    if (zone.contains(e.relatedTarget)) return;
    resetDefault();
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    resetDefault();
    const file = e.dataTransfer?.files[0];
    if (file && validate(file)) onFile(file);
  });

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && validate(file)) onFile(file);
  });

  return input;
}

function populateReview(session, programId, programName, programAnswers, programs) {
  const container = q('[wized="review-content"]');
  if (!container) return;

  const meta = session.user.user_metadata || {};
  const firstName   = q('[wized="applicant-first-name"]')?.value || meta.first_name || '';
  const lastName    = q('[wized="applicant-last-name"]')?.value  || meta.last_name  || '';
  const phone       = q('[wized="applicant-phone"]')?.value || '';
  const role        = q('[wized="applicant-current-role"]')?.value || '';
  const institution = q('[wized="applicant-institution"]')?.value || '';
  const credentials = q('[wized="applicant-credentials"]')?.value || '';
  const city        = q('[wized="applicant-city"]')?.value || '';
  const state       = q('[wized="applicant-state"]')?.value || '';
  const zip         = q('[wized="applicant-zip-code"]')?.value || '';
  const country     = q('[wized="applicant-country"]')?.value || '';
  const location    = [city, state, zip, country].filter(Boolean).join(', ');

  function makeRow(label, value) {
    const row = document.createElement('div');
    row.className = 'review-row';
    const lbl = document.createElement('span');
    lbl.className = 'review-label';
    lbl.textContent = label;
    const val = document.createElement('span');
    val.className = 'review-value';
    val.textContent = value;
    row.appendChild(lbl);
    row.appendChild(val);
    return row;
  }

  function makeSection(header, rows) {
    const visible = rows.filter(([, v]) => v);
    if (visible.length === 0) return null;
    const section = document.createElement('div');
    section.className = 'review-section';
    const hdr = document.createElement('div');
    hdr.className = 'review-section-header';
    hdr.textContent = header;
    section.appendChild(hdr);
    visible.forEach(([label, value]) => section.appendChild(makeRow(label, value)));
    return section;
  }

  container.replaceChildren();

  [
    makeSection('PERSONAL INFORMATION', [
      ['First name', firstName],
      ['Last name',  lastName],
      ['Email',      session.user.email || ''],
      ['Phone',      phone],
    ]),
    makeSection('PROFESSIONAL BACKGROUND', [
      ['Current role', role],
      ['Institution',  institution],
      ['Credentials',  credentials],
      ['Location',     location],
    ]),
    makeSection('PROGRAM SELECTION', [
      ['Program', programName],
    ]),
  ].forEach((s) => { if (s) container.appendChild(s); });

  const prog = programs.find((p) => p.id === programId);
  const questions = normalizeQuestions(prog && prog.program_questions);
  if (questions.length > 0) {
    const qSection = document.createElement('div');
    qSection.className = 'review-section';
    const qHdr = document.createElement('div');
    qHdr.className = 'review-section-header';
    qHdr.textContent = 'PROGRAM QUESTIONS';
    qSection.appendChild(qHdr);
    questions.forEach((question) => {
      qSection.appendChild(makeRow(question.label || question.id, programAnswers[question.id] || '—'));
    });
    container.appendChild(qSection);
  }
}

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

  // ── Determine programId (three-branch) ──────────────────────────────────────
  // Branch 1: sessionStorage present (new application from dashboard course select)
  // Branch 2: sessionStorage absent but draft has program_id (returning to existing draft)
  // Branch 3: neither → redirect to dashboard
  let programId = null;
  let programName = '';

  const cachedCourse = sessionStorage.getItem('icit-selected-course');
  if (cachedCourse) {
    try {
      const parsed = JSON.parse(cachedCourse);
      programId = parsed.programId || null;
      programName = parsed.programName || '';
    } catch (_) {}
  }

  if (!programId && draft && draft.program_id) {
    programId = draft.program_id;
    programName = draft.programs?.name || '';
  }

  if (!programId) {
    window.location.href = '/dashboard';
    return;
  }

  revealPage();
  applyDesignSystemClasses();

  let applicationId = draft ? draft.id : null;
  let cvUploaded = !!(draft && draft.cv_url);
  let cvFilename = draft?.cv_url || null;
  let currentSection = 1;
  let programAnswers = {};

  // Section 1: pre-fill course name and description
  setText(q('[wized="confirm-course-name"]'), programName);
  const prog = programs.find((p) => p.id === programId);
  setText(q('[wized="confirm-course-desc"]'), prog ? (prog.description || '') : '');

  const changeCourseBtn = q('[wized="change-course-btn"]');
  if (changeCourseBtn) changeCourseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem('icit-selected-course');
    window.location.href = '/dashboard';
  });

  function goToSection(n) {
    for (let i = 1; i <= 5; i++) {
      hide(q('[wized="form-section-' + i + '"]'));
    }
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

  if (programs.length === 0) {
    hide(q('[wized="questions-loading"]'));
    show(q('[wized="questions-empty"]'));
    setText(q('[wized="form-error-msg"]'), 'No active programs are available yet. Add a program in Supabase to continue testing.');
    show(q('[wized="form-error"]'));
  }

  if (draft) {
    applicationId = draft.id;
    cvUploaded = !!draft.cv_url;

    if (draft.locked_fields?.first_name) {
      if (q('[wized="applicant-first-name"]')) q('[wized="applicant-first-name"]').disabled = true;
      if (q('[wized="applicant-last-name"]')) q('[wized="applicant-last-name"]').disabled = true;
      show(q('[wized="first-name-locked"]'));
      show(q('[wized="last-name-locked"]'));
    }
  }

  function syncCvUi() {
    if (cvUploaded) {
      hide(q('[wized="cv-upload-zone"]'));
      show(q('[wized="cv-upload-success"]'));
      show(q('[wized="cv-remove-btn"]'));
      setText(q('[wized="cv-filename"]'), filenameFromPath(cvFilename) || 'CV uploaded');
      setCvProgress(100);
    } else {
      show(q('[wized="cv-upload-zone"]'));
      hide(q('[wized="cv-upload-success"]'));
      hide(q('[wized="cv-remove-btn"]'));
      setText(q('[wized="cv-filename"]'), '');
      setCvProgress(0);
    }
  }
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

  function collectFields() {
    return {
      id: applicationId,
      programId: programId,
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

  // ── Section 2: Personal Info ────────────────────────────────────────────────
  const nextSection1Btn = q('[wized="next-section-1-btn"]');
  if (nextSection1Btn) nextSection1Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(2);
  });

  // Pre-fill name from user_metadata — always, even for first-time applicants
  const meta = session.user.user_metadata || {};
  if (q('[wized="applicant-first-name"]')) q('[wized="applicant-first-name"]').value = meta.first_name || '';
  if (q('[wized="applicant-last-name"]')) q('[wized="applicant-last-name"]').value = meta.last_name || '';

  if (draft) {
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

  const backSection2Btn = q('[wized="back-section-2-btn"]');
  if (backSection2Btn) backSection2Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(1);
  });

  const nextSection2Btn = q('[wized="next-section-2-btn"]');
  if (nextSection2Btn) nextSection2Btn.addEventListener('click', async (e) => {
    e.preventDefault();
    hide(q('[wized="form-error"]'));
    try { await doSaveDraft(); goToSection(4); } catch (err) {
      setText(q('[wized="form-error-msg"]'), err.message || 'Please complete this section before continuing.');
      show(q('[wized="form-error"]'));
    }
  });

  // ── Section 3: CV Upload ─────────────────────────────────────────────────────
  syncCvUi();

  const backSection3Btn = q('[wized="back-section-3-btn"]');
  if (backSection3Btn) backSection3Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(4);
  });

  const nextSection3Btn = q('[wized="next-section-3-btn"]');
  if (nextSection3Btn) nextSection3Btn.addEventListener('click', (e) => {
    e.preventDefault();
    populateReview(session, programId, programName, programAnswers, programs);
    goToSection(5);
  });

  const cvZone = q('[wized="cv-upload-zone"]');
  let builtFileInput = null;
  if (cvZone) {
    builtFileInput = buildUploadZone(cvZone, async (file) => {
      if (!applicationId) {
        setText(q('[wized="form-error-msg"]'), 'Please save your draft before uploading a CV.');
        show(q('[wized="form-error"]'));
        return;
      }
      try {
        setCvProgress(0);
        cvFilename = await uploadCV(session, applicationId, file);
        cvUploaded = true;
        syncCvUi();
      } catch (err) { console.error('CV upload failed:', err); }
    });
  }

  const cvRemoveBtn = q('[wized="cv-remove-btn"]');
  if (cvRemoveBtn) cvRemoveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!applicationId) return;
    try {
      await removeCV(session, applicationId);
      cvUploaded = false;
      cvFilename = null;
      if (builtFileInput) builtFileInput.value = '';
      syncCvUi();
    } catch (err) { console.error(err); }
  });

  // ── Section 4: Program Questions ─────────────────────────────────────────────
  if (draft && draft.program_id) {
    renderQuestions(draft.program_id, draft.program_answers);
    if (draft.program_answers && typeof draft.program_answers === 'object') {
      programAnswers = Object.assign({}, draft.program_answers);
      Object.entries(draft.program_answers).forEach(([id, val]) => {
        const input = q('[data-question-id="' + id + '"]');
        if (input) input.value = val;
      });
    }
  } else {
    renderQuestions(programId, {});
  }

  const backSection4Btn = q('[wized="back-section-4-btn"]');
  if (backSection4Btn) backSection4Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(2);
  });

  const nextSection4Btn = q('[wized="next-section-4-btn"]');
  if (nextSection4Btn) nextSection4Btn.addEventListener('click', async (e) => {
    e.preventDefault();
    hide(q('[wized="form-error"]'));
    try {
      await doSaveDraft();
      goToSection(3);
    } catch (err) {
      setText(q('[wized="form-error-msg"]'), err.message || 'Please complete this section before continuing.');
      show(q('[wized="form-error"]'));
    }
  });

  // ── Section 5: Review & Submit ───────────────────────────────────────────────
  const backSection5Btn = q('[wized="back-section-5-btn"]');
  if (backSection5Btn) backSection5Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(3);
  });

  const submitAppBtn = q('[wized="submit-application-btn"]');
  if (submitAppBtn) submitAppBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    hide(q('[wized="form-error"]'));
    if (!cvUploaded) {
      goToSection(3);
      setText(q('[wized="form-error-msg"]'), 'Please upload your CV before submitting.');
      show(q('[wized="form-error"]'));
      return;
    }
    try {
      await doSaveDraft();
      await submitApplication(session, applicationId);
      sessionStorage.removeItem('icit-selected-course');
      window.location.href = '/application-submitted';
    } catch (err) {
      console.error('Submit failed:', err);
      setText(q('[wized="form-error-msg"]'), err.message || 'Submission failed. Please try again.');
      show(q('[wized="form-error"]'));
    }
  });
}
