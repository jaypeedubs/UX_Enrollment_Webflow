import { useState, useEffect } from 'react';
import type { Application, AppStatus } from '../lib/types';
import { StatusBadge } from './StatusBadge';
import { CircleBadge } from './CircleBadge';

type Tab = 'application' | 'cv' | 'admin_notes' | 'timeline';
type DetailAction = 'accept' | 'waitlist' | 'request_more_info' | 'reject';
type Variant = 'pending' | 'approved' | 'rejected' | 'waitlisted' | 'draft';

const STATUS_VARIANT: Record<AppStatus, Variant> = {
  draft:       'draft',
  submitted:   'pending',
  in_review:   'pending',
  waitlisted:  'waitlisted',
  accepted:    'approved',
  rejected:    'rejected',
  enrolled:    'approved',
  withdrawn:   'rejected',
};

const HIDDEN_ACTIONS: Partial<Record<AppStatus, DetailAction[]>> = {
  accepted:   ['accept', 'request_more_info'],
  enrolled:   ['accept', 'request_more_info'],
  waitlisted: ['waitlist'],
  rejected:   ['accept', 'waitlist', 'request_more_info', 'reject'],
  withdrawn:  ['accept', 'waitlist', 'request_more_info', 'reject'],
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'application', label: 'Application' },
  { id: 'cv',          label: 'CV' },
  { id: 'admin_notes', label: 'Admin Notes' },
  { id: 'timeline',    label: 'Timeline' },
];

function isLocked(app: Application, field: string): boolean {
  if (!app.locked_fields) return false;
  if (app.locked_fields.all === true) return true;
  return Boolean(app.locked_fields[field]);
}

interface Props {
  application: Application;
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onAction: (action: DetailAction) => void;
  onSaveNotes: (notes: string) => void;
}

export function ApplicationDetail({
  application,
  currentIndex,
  total,
  onPrev,
  onNext,
  onAction,
  onSaveNotes,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('application');
  const [notes, setNotes] = useState(application.admin_notes ?? '');

  useEffect(() => {
    setNotes(application.admin_notes ?? '');
  }, [application.id, application.admin_notes]);

  const hidden = HIDDEN_ACTIONS[application.status] ?? [];

  const fields: [string, string, string][] = [
    ['First name', application.first_name,   'first_name'],
    ['Last name',  application.last_name,    'last_name'],
    ['Email',      application.email,        'email'],
    ['Program',    application.program_name, 'program'],
    ['Submitted',  application.submitted_at
      ? new Date(application.submitted_at).toLocaleDateString()
      : '—',                                'submitted_at'],
  ];

  return (
    <div className="flex flex-col h-full bg-[#faf7f5]">
      {/* Always-visible header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 space-y-3">
        <div className="flex items-center gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-1 text-sm text-gray-500 flex-shrink-0">
            <button
              type="button"
              onClick={onPrev}
              disabled={currentIndex <= 1}
              aria-label="Previous application"
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ‹
            </button>
            <span className="tabular-nums">{currentIndex} / {total}</span>
            <button
              type="button"
              onClick={onNext}
              disabled={currentIndex >= total}
              aria-label="Next application"
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ›
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200 flex-shrink-0" />

          {/* Identity */}
          <CircleBadge
            value={application.course_code}
            className="!h-[42px] !w-[42px] text-xs flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-gray-900 truncate">
              {application.first_name} {application.last_name}
            </p>
            <p className="text-sm text-gray-500 truncate">{application.email}</p>
          </div>

          <StatusBadge variant={STATUS_VARIANT[application.status]} className="flex-shrink-0">
            {application.status.replace('_', ' ')}
          </StatusBadge>
        </div>

        {/* Action buttons */}
        {hidden.length < 4 && (
          <div className="flex items-center gap-2">
            {!hidden.includes('accept') && (
              <button
                type="button"
                onClick={() => onAction('accept')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[#123161] hover:bg-[#0e2550] transition-colors"
              >
                Accept
              </button>
            )}
            {!hidden.includes('waitlist') && (
              <button
                type="button"
                onClick={() => onAction('waitlist')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#123161] border border-[#123161] hover:bg-[#123161]/5 transition-colors"
              >
                Waitlist
              </button>
            )}
            {!hidden.includes('request_more_info') && (
              <button
                type="button"
                onClick={() => onAction('request_more_info')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#123161] border border-[#123161] hover:bg-[#123161]/5 transition-colors"
              >
                More Info
              </button>
            )}
            {!hidden.includes('reject') && (
              <button
                type="button"
                onClick={() => onAction('reject')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[#b91c1c] hover:bg-red-800 transition-colors"
              >
                Reject
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-6">
        <nav className="flex gap-6" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#123161] text-[#123161]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab panels */}
      <div className="flex-1 overflow-y-auto p-6">

        <div
          id="panel-application"
          role="tabpanel"
          aria-labelledby="tab-application"
          hidden={activeTab !== 'application'}
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {fields.map(([label, value, field]) => {
              const locked = isLocked(application, field);
              return (
                <div key={field}>
                  <dt className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {label}
                    {locked && (
                      <svg className="w-3 h-3 text-gray-300" viewBox="0 0 20 20" fill="currentColor" aria-label="locked">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                      </svg>
                    )}
                  </dt>
                  <dd className={`text-sm ${locked ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                    {value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        <div
          id="panel-cv"
          role="tabpanel"
          aria-labelledby="tab-cv"
          hidden={activeTab !== 'cv'}
        >
          <div className="flex items-center justify-center h-40 rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">
            CV viewer — requires signed URL via admin-read (not yet implemented)
          </div>
        </div>

        <div
          id="panel-admin_notes"
          role="tabpanel"
          aria-labelledby="tab-admin_notes"
          hidden={activeTab !== 'admin_notes'}
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Visible to ICIT reviewers only — applicants never see this.
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              placeholder="Add internal notes…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#123161] focus:border-transparent resize-none"
            />
            <button
              type="button"
              onClick={() => onSaveNotes(notes)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#123161] hover:bg-[#0e2550] transition-colors"
            >
              Save notes
            </button>
          </div>
        </div>

        <div
          id="panel-timeline"
          role="tabpanel"
          aria-labelledby="tab-timeline"
          hidden={activeTab !== 'timeline'}
        >
          <div className="flex items-center justify-center h-40 rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">
            Timeline — requires application_events fetch (not yet implemented)
          </div>
        </div>

      </div>
    </div>
  );
}
