import { useState, useEffect } from 'react';
import { getPrograms, createProgram, updateProgram, archiveProgram } from '../lib/api';
import { COURSES } from '../lib/constants';
import type { Program } from '../lib/types';

const BLANK_PROGRAM: Omit<Program, 'id' | 'created_at'> = {
  name: '',
  deadline: '',
  status: 'active',
  price_cents: 0,
  program_questions: [],
  course_code: COURSES[0],
  moodle_course_id: '',
};

export function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Program> & { id?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPrograms().then(setPrograms).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      if (editing.id) {
        const updated = await updateProgram(editing.id, editing);
        setPrograms(ps => ps.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await createProgram(editing as Omit<Program, 'id' | 'created_at'>);
        setPrograms(ps => [created, ...ps]);
      }
      setEditing(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this program? Existing applications are not affected.')) return;
    await archiveProgram(id);
    setPrograms(ps => ps.map(p => p.id === id ? { ...p, status: 'archived' } : p));
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading programs…</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Programs</h1>
        <button
          onClick={() => setEditing({ ...BLANK_PROGRAM })}
          className="px-3 py-1.5 text-sm bg-[#1a3a5c] text-white rounded hover:bg-[#123161]"
        >
          New Program
        </button>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Course</th>
            <th className="py-2 pr-4">Moodle ID</th>
            <th className="py-2 pr-4">Deadline</th>
            <th className="py-2 pr-4">Price</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {programs.map(p => (
            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 pr-4 font-medium">{p.name}</td>
              <td className="py-2 pr-4 text-gray-500">{p.course_code}</td>
              <td className="py-2 pr-4 text-gray-500">{p.moodle_course_id || '—'}</td>
              <td className="py-2 pr-4 text-gray-500">{p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}</td>
              <td className="py-2 pr-4 text-gray-500">{(p.price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
              <td className="py-2 pr-4">
                <span className={p.status === 'active' ? 'text-green-600' : 'text-gray-400'}>
                  {p.status}
                </span>
              </td>
              <td className="py-2 flex gap-2">
                <button onClick={() => setEditing({ ...p })} className="text-xs text-blue-600 hover:underline">Edit</button>
                {p.status === 'active' && (
                  <button onClick={() => handleArchive(p.id)} className="text-xs text-red-500 hover:underline">Archive</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold mb-4">{editing.id ? 'Edit Program' : 'New Program'}</h2>
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-gray-600">Name</span>
                <input value={editing.name ?? ''} onChange={e => setEditing(ed => ({ ...ed!, name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Course Code</span>
                <select value={editing.course_code ?? COURSES[0]} onChange={e => setEditing(ed => ({ ...ed!, course_code: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {COURSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Deadline</span>
                <input type="datetime-local" value={editing.deadline?.slice(0, 16) ?? ''}
                  onChange={e => setEditing(ed => ({ ...ed!, deadline: new Date(e.target.value).toISOString() }))}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Price (cents)</span>
                <input type="number" value={editing.price_cents ?? 0}
                  onChange={e => setEditing(ed => ({ ...ed!, price_cents: Number(e.target.value) }))}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Status</span>
                <select value={editing.status ?? 'active'} onChange={e => setEditing(ed => ({ ...ed!, status: e.target.value as Program['status'] }))}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="active">active</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Moodle Course ID</span>
                <input value={editing.moodle_course_id ?? ''} onChange={e => setEditing(ed => ({ ...ed!, moodle_course_id: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-3 py-1.5 text-sm bg-[#1a3a5c] text-white rounded hover:bg-[#123161] disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
