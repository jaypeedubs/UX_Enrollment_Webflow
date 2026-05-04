import type { Application, AppStatus } from '../lib/types';
import { StatusBadge } from './StatusBadge';

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

interface Props {
  applications: Application[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ApplicationList({ applications, selectedId, onSelect }: Props) {
  return (
    <ul className="divide-y divide-gray-100 overflow-y-auto h-full">
      {applications.map((app) => {
        const isSelected = app.id === selectedId;
        return (
          <li key={app.id}>
            <button
              type="button"
              onClick={() => onSelect(app.id)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {app.first_name} {app.last_name}
                </span>
                <StatusBadge variant={STATUS_VARIANT[app.status]}>
                  {app.status.replace('_', ' ')}
                </StatusBadge>
              </div>
              <div className="mt-0.5 text-xs text-gray-500 truncate">{app.email}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                <span>{app.course_code}</span>
                <span>·</span>
                <span className="truncate">{app.program_name}</span>
                {app.submitted_at && (
                  <>
                    <span>·</span>
                    <span>{new Date(app.submitted_at).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
