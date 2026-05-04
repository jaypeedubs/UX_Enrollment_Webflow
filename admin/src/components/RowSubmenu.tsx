import { useState, useRef, useEffect } from 'react';
import type { Application, AppStatus } from '../lib/types';

type SubmenuAction = 'accept' | 'waitlist' | 'request_more_info' | 'reject';

interface Props {
  application: Application;
  onOpen: () => void;
  onAction: (action: SubmenuAction) => void;
}

const HIDDEN_BY_STATUS: Partial<Record<AppStatus, SubmenuAction[]>> = {
  accepted:   ['accept', 'request_more_info'],
  enrolled:   ['accept', 'request_more_info'],
  waitlisted: ['waitlist'],
  rejected:   ['accept', 'waitlist', 'request_more_info'],
  withdrawn:  ['accept', 'waitlist', 'request_more_info', 'reject'],
};

export function RowSubmenu({ application, onOpen, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = `submenu-${application.id}`;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const hidden = HIDDEN_BY_STATUS[application.status] ?? [];

  function handleAction(action: SubmenuAction) {
    setOpen(false);
    onAction(action);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label="Row actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="16" cy="10" r="1.5" />
        </svg>
      </button>

      {open && (
        <div id={menuId} className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          <button
            type="button"
            onClick={() => { setOpen(false); onOpen(); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Open application
          </button>

          <hr className="my-1 border-gray-100" />

          {!hidden.includes('accept') && (
            <button
              type="button"
              onClick={() => handleAction('accept')}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Accept
            </button>
          )}
          {!hidden.includes('waitlist') && (
            <button
              type="button"
              onClick={() => handleAction('waitlist')}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Waitlist
            </button>
          )}
          {!hidden.includes('request_more_info') && (
            <button
              type="button"
              onClick={() => handleAction('request_more_info')}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Request more info
            </button>
          )}

          <hr className="my-1 border-gray-100" />

          {!hidden.includes('reject') && (
            <button
              type="button"
              onClick={() => handleAction('reject')}
              className="w-full text-left px-3 py-1.5 text-sm text-white bg-red-700 hover:bg-red-800 rounded-b-lg"
            >
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}
