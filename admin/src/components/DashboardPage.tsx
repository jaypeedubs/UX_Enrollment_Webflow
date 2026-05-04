import { useMemo } from 'react';
import type { Application } from '../lib/types';
import { useApplications } from '../hooks/useApplications';

const COURSES = ['ASC', 'ISC', 'AAC', 'FAC', 'IFAC', 'CITEC'];

interface CourseRow {
  course: string;
  submitted: number;
  in_review: number;
  waitlisted: number;
  accepted: number;
}

function buildCourseBreakdown(applications: Application[]): CourseRow[] {
  const map: Record<string, CourseRow> = {};
  for (const app of applications) {
    if (!map[app.course_code]) {
      map[app.course_code] = { course: app.course_code, submitted: 0, in_review: 0, waitlisted: 0, accepted: 0 };
    }
    const row = map[app.course_code];
    if (app.status === 'submitted')  row.submitted++;
    if (app.status === 'in_review')  row.in_review++;
    if (app.status === 'waitlisted') row.waitlisted++;
    if (app.status === 'accepted')   row.accepted++;
  }
  return COURSES.filter((c) => map[c]).map((c) => map[c]);
}

export function DashboardPage() {
  const { applications, loading } = useApplications();

  const unreviewed = useMemo(
    () => applications.filter((a) => a.status === 'submitted').length,
    [applications]
  );

  const courseBreakdown = useMemo(
    () => buildCourseBreakdown(applications),
    [applications]
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
          <p className="text-sm font-medium text-gray-500">Unreviewed</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {loading ? '—' : unreviewed}
          </p>
          <p className="mt-1 text-xs text-gray-400">submitted, all courses</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
          <p className="text-sm font-medium text-gray-500">Awaiting response</p>
          <p className="mt-1 text-3xl font-semibold text-gray-300">—</p>
          <p className="mt-1 text-xs text-amber-600">
            Requires application_events query — not yet implemented
          </p>
        </div>
      </div>

      {/* Per-course breakdown */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Per-course breakdown</h2>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Course</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">New</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">In Review</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Waitlisted</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Accepted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td>
                </tr>
              ) : courseBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No applications</td>
                </tr>
              ) : (
                courseBreakdown.map((row) => (
                  <tr key={row.course} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.course}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.submitted}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.in_review}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.waitlisted}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.accepted}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick links</h2>
        <div className="flex flex-wrap gap-2">
          {COURSES.map((course) => (
            <a
              key={course}
              href={`/admin/applications?course=${course}&status=submitted`}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-[#123161] hover:bg-[#123161] hover:text-white transition-colors"
            >
              Review new {course} applications
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
