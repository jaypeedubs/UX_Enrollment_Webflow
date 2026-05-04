import { useState, useCallback } from 'react';
import type { Application } from '../lib/types';
import { useApplications } from '../hooks/useApplications';
import { ApplicationList } from './ApplicationList';
import { ApplicationDetail } from './ApplicationDetail';
import { ConfirmDialog } from './ConfirmDialog';
import { supabase } from '../lib/supabase';

type DialogVariant = 'accept' | 'waitlist' | 'request_more_info' | 'reject';

interface DialogState {
  variant: DialogVariant;
  application: Application;
}

const ACTION_EVENT: Record<DialogVariant, string> = {
  accept:            'accepted',
  waitlist:          'waitlisted',
  request_more_info: 'more_info_requested',
  reject:            'rejected',
};

const COURSE_TABS = [
  { value: '',      label: 'All Courses' },
  { value: 'ASC',   label: 'ASC' },
  { value: 'ISC',   label: 'ISC' },
  { value: 'AAC',   label: 'AAC' },
  { value: 'FAC',   label: 'FAC' },
  { value: 'IFAC',  label: 'IFAC' },
  { value: 'CITEC', label: 'CITEC' },
];

const STATUS_PILLS = [
  { value: '',           label: 'All' },
  { value: 'submitted',  label: 'New' },
  { value: 'in_review',  label: 'In Review' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'accepted',   label: 'Accepted' },
  { value: 'enrolled',   label: 'Enrolled' },
];

export function ApplicationsPage() {
  const {
    applications,
    loading,
    error,
    filters,
    setFilter,
    selectedId,
    setSelectedId,
    currentIndex,
    total,
    selectPrev,
    selectNext,
    refresh,
  } = useApplications();

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedApp = applications.find((a) => a.id === selectedId) ?? null;

  const handleAction = useCallback((variant: DialogVariant) => {
    if (!selectedApp) return;
    setDialog({ variant, application: selectedApp });
  }, [selectedApp]);

  const handleConfirm = useCallback(async (message: string) => {
    if (!dialog) return;
    const { variant, application } = dialog;
    setDialog(null);
    setActionError(null);

    const { error } = await supabase.functions.invoke('admin-transition', {
      body: {
        application_id: application.id,
        event_type: ACTION_EVENT[variant],
        ...(message.trim() && { applicant_message: message.trim() }),
      },
    });

    if (error) {
      setActionError(`Action failed: ${error.message}`);
    } else {
      refresh();
    }
  }, [dialog, refresh]);

  // Stubbed: requires admin-write Edge Function (not yet implemented)
  const handleSaveNotes = useCallback((_notes: string) => {
    console.warn('admin_notes save requires admin-write Edge Function — not yet implemented');
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Filter bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto">
          {COURSE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter('course', tab.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filters.course === tab.value
                  ? 'bg-[#123161] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STATUS_PILLS.map((pill) => (
              <button
                key={pill.value}
                type="button"
                onClick={() => setFilter('status', pill.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filters.status === pill.value
                    ? 'bg-[#123161] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search name or email"
            className="w-52 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#123161] focus:border-transparent"
          />
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 min-h-0">
        {/* Left pane */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
          {loading && (
            <p className="px-4 py-6 text-sm text-gray-400">Loading…</p>
          )}
          {error && (
            <p className="px-4 py-6 text-sm text-red-600">{error}</p>
          )}
          {!loading && !error && (
            <ApplicationList
              applications={applications}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {/* Right pane */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {actionError && (
            <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}
          {selectedApp ? (
            <ApplicationDetail
              application={selectedApp}
              currentIndex={currentIndex}
              total={total}
              onPrev={selectPrev}
              onNext={selectNext}
              onAction={handleAction}
              onSaveNotes={handleSaveNotes}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              Select an application to review
            </div>
          )}
        </div>
      </div>

      {dialog && (
        <ConfirmDialog
          variant={dialog.variant}
          application={dialog.application}
          onConfirm={handleConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
