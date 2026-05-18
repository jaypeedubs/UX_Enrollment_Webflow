import { useState, useEffect } from 'react';
import type { Application, AppStatus, ApplicationEvent } from '../lib/types';
import { StatusBadge } from './StatusBadge';
import { CircleBadge } from './CircleBadge';
import { getCvSignedUrl, getTimeline } from '../lib/api';

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

  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [timeline, setTimeline] = useState<ApplicationEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    setNotes(application.admin_notes ?? '');
    setCvUrl(null);
    setTimeline([]);
  }, [application.id, application.admin_notes]);

  useEffect(() => {
    if (activeTab === 'cv' && !cvUrl && !cvLoading) {
      setCvLoading(true);
      getCvSignedUrl(application.id).then(setCvUrl).finally(() => setCvLoading(false));
    }
    if (activeTab === 'timeline' && timeline.length === 0 && !timelineLoading) {
      setTimelineLoading(true);
      getTimeline(application.id).then(setTimeline).finally(() => setTimelineLoading(false));
    }
  }, [activeTab, application.id, cvUrl, cvLoading, timeline, timelineLoading]);

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
      {/* Header and Tabs (remains same) */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 space-y-3">
        {/* ... */}
      </div>
      {/* ... tabs nav ... */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ... application tab ... */}
        
        <div id="panel-cv" role="tabpanel" aria-labelledby="tab-cv" hidden={activeTab !== 'cv'}>
          {cvLoading ? <div className="text-sm text-gray-400">Loading CV…</div> : cvUrl ? (
            <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#123161] underline">View CV (signed URL)</a>
          ) : <div className="text-sm text-gray-400">No CV uploaded</div>}
        </div>

        <div id="panel-admin_notes" role="tabpanel" aria-labelledby="tab-admin_notes" hidden={activeTab !== 'admin_notes'}>
           {/* ... admin_notes content ... */}
        </div>

        <div id="panel-timeline" role="tabpanel" aria-labelledby="tab-timeline" hidden={activeTab !== 'timeline'}>
          {timelineLoading ? <div className="text-sm text-gray-400">Loading timeline…</div> : (
            <ul className="text-sm text-gray-700">
              {timeline.map(e => <li key={e.id} className="mb-2">{e.event_type} at {new Date(e.created_at).toLocaleString()}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
