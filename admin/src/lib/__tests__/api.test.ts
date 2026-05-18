import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Environment variables ────────────────────────────────────────────────────
// api.ts reads import.meta.env at module load time via a helper, so stub them
// before the module is imported.
vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-anon-key');

// ── Supabase auth mock ───────────────────────────────────────────────────────
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

// ── import after mocks are in place ─────────────────────────────────────────
import {
  getApplications,
  getPrograms,
  createProgram,
  updateProgram,
  archiveProgram,
  updateAdminNotes,
  getCvSignedUrl,
  getTimeline,
} from '../api';

// ── Fetch mock helpers ───────────────────────────────────────────────────────
function mockFetch(payload: unknown, ok = true) {
  const text = ok ? '' : JSON.stringify(payload);
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(payload),
    text: vi.fn().mockResolvedValue(text),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getApplications ──────────────────────────────────────────────────────────
describe('getApplications', () => {
  it('calls admin-read with no resource param', async () => {
    mockFetch([]);
    await getApplications();

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/functions/v1/admin-read');
    expect(url).not.toContain('resource=');
    expect(init.headers as Record<string, string>).toMatchObject({
      Authorization: 'Bearer test-token',
    });
  });
});

// ── getPrograms ──────────────────────────────────────────────────────────────
describe('getPrograms', () => {
  it('calls admin-read with resource=programs', async () => {
    mockFetch([]);
    await getPrograms();

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/functions/v1/admin-read');
    expect(url).toContain('resource=programs');
  });
});

// ── createProgram ────────────────────────────────────────────────────────────
describe('createProgram', () => {
  it('POSTs to admin-read?resource=programs with the program body', async () => {
    const program = {
      name: 'Test Program',
      deadline: null,
      status: 'active' as const,
      price_cents: 1000,
      program_questions: [],
      course_code: 'TST101',
      moodle_course_id: null,
    };
    mockFetch({ id: '1', created_at: '2024-01-01', ...program });
    await createProgram(program);

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/functions/v1/admin-read');
    expect(url).toContain('resource=programs');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Test Program' });
  });
});

// ── updateProgram ────────────────────────────────────────────────────────────
describe('updateProgram', () => {
  it('PATCHes admin-read?resource=programs&id=<id> with fields', async () => {
    mockFetch({ id: 'prog-1' });
    await updateProgram('prog-1', { name: 'Updated' });

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/functions/v1/admin-read');
    expect(url).toContain('resource=programs');
    expect(url).toContain('id=prog-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Updated' });
  });
});

// ── archiveProgram ───────────────────────────────────────────────────────────
describe('archiveProgram', () => {
  it('DELETEs admin-read?resource=programs&id=<id>', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue('') });
    await archiveProgram('prog-1');

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/functions/v1/admin-read');
    expect(url).toContain('resource=programs');
    expect(url).toContain('id=prog-1');
    expect(init.method).toBe('DELETE');
  });
});

// ── updateAdminNotes ─────────────────────────────────────────────────────────
describe('updateAdminNotes', () => {
  it('PATCHes admin-write with application_id and admin_notes', async () => {
    mockFetch({});
    await updateAdminNotes('app-1', 'some notes');

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/functions/v1/admin-write');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toMatchObject({
      application_id: 'app-1',
      admin_notes: 'some notes',
    });
  });
});

// ── getCvSignedUrl ───────────────────────────────────────────────────────────
describe('getCvSignedUrl', () => {
  it('GETs admin-write with resource=cv-url and application_id', async () => {
    mockFetch({ url: 'https://storage.example.com/cv.pdf' });
    const result = await getCvSignedUrl('app-1');

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/functions/v1/admin-write');
    expect(url).toContain('resource=cv-url');
    expect(url).toContain('application_id=app-1');
    expect(init.method).toBe('GET');
    expect(result).toBe('https://storage.example.com/cv.pdf');
  });

  it('returns null when url is missing from response', async () => {
    mockFetch({});
    const result = await getCvSignedUrl('app-1');
    expect(result).toBeUndefined();
  });
});

// ── getTimeline ──────────────────────────────────────────────────────────────
describe('getTimeline', () => {
  it('GETs admin-write with resource=timeline and application_id', async () => {
    mockFetch([]);
    await getTimeline('app-1');

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/functions/v1/admin-write');
    expect(url).toContain('resource=timeline');
    expect(url).toContain('application_id=app-1');
    expect(init.method).toBe('GET');
  });
});

// ── error handling ───────────────────────────────────────────────────────────
describe('error handling', () => {
  it('throws when fetch response is not ok', async () => {
    mockFetch('Unauthorized', false);
    await expect(getApplications()).rejects.toThrow();
  });
});
