import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Application } from '../lib/types';

type DialogVariant = 'accept' | 'waitlist' | 'request_more_info' | 'reject';

interface VariantConfig {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass: string;
  messageLabel: string;
  messageRequired: boolean;
  cardBorderClass: string;
  headerBgClass: string;
  footerBgClass: string;
  warningBanner: string | null;
  icon: ReactNode;
}

const CONFIGS: Record<DialogVariant, VariantConfig> = {
  accept: {
    title: 'Confirm acceptance',
    description: 'The applicant will be accepted and sent a notification.',
    confirmLabel: 'Confirm acceptance',
    confirmClass: 'bg-[#123161] hover:bg-[#0e2550] text-white',
    messageLabel: 'Personal note (optional)',
    messageRequired: false,
    cardBorderClass: 'border-gray-200',
    headerBgClass: 'bg-white',
    footerBgClass: 'bg-gray-50',
    warningBanner: null,
    icon: (
      <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
      </svg>
    ),
  },
  waitlist: {
    title: 'Add to waitlist',
    description: 'The applicant will be waitlisted and sent a notification.',
    confirmLabel: 'Add to waitlist',
    confirmClass: 'bg-purple-700 hover:bg-purple-800 text-white',
    messageLabel: 'Personal note (optional)',
    messageRequired: false,
    cardBorderClass: 'border-gray-200',
    headerBgClass: 'bg-white',
    footerBgClass: 'bg-gray-50',
    warningBanner: null,
    icon: (
      <svg className="w-6 h-6 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
      </svg>
    ),
  },
  request_more_info: {
    title: 'Request more information',
    description: 'The applicant will be notified and asked to respond. No status change.',
    confirmLabel: 'Send request',
    confirmClass: 'bg-[#123161] hover:bg-[#0e2550] text-white',
    messageLabel: 'Message to applicant',
    messageRequired: true,
    cardBorderClass: 'border-gray-200',
    headerBgClass: 'bg-white',
    footerBgClass: 'bg-gray-50',
    warningBanner: null,
    icon: (
      <svg className="w-6 h-6 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.454 1.272 1.454 3.329 0 4.601-.42.367-.87.62-1.337.768v.43a.75.75 0 01-1.5 0v-.745a.75.75 0 01.75-.75c.68 0 1.253-.309 1.628-.636.625-.547.625-1.393 0-1.94zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  reject: {
    title: 'Confirm rejection',
    description: 'The applicant will be rejected and sent a notification.',
    confirmLabel: 'Confirm rejection',
    confirmClass: 'bg-[#b91c1c] hover:bg-red-800 text-white',
    messageLabel: 'Reason (optional, recommended)',
    messageRequired: false,
    cardBorderClass: 'border-[#fca5a5]',
    headerBgClass: 'bg-[#fff5f5]',
    footerBgClass: 'bg-[#fff5f5]',
    warningBanner: 'Rejection cannot be undone from this panel. Contact a Supabase admin to reverse.',
    icon: (
      <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
      </svg>
    ),
  },
};

interface Props {
  variant: DialogVariant;
  application: Application;
  onConfirm: (message: string) => void;
  onCancel: () => void;
}

export function ConfirmDialog({ variant, application, onConfirm, onCancel }: Props) {
  const [message, setMessage] = useState('');
  const config = CONFIGS[variant];
  const canConfirm = !config.messageRequired || message.trim().length > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    textareaRef.current?.focus();

    function getFocusable(): HTMLElement[] {
      if (!dialogRef.current) return [];
      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div ref={dialogRef} className={`w-full max-w-md rounded-xl border shadow-xl overflow-hidden ${config.cardBorderClass}`}>
        {/* Header */}
        <div className={`px-6 py-4 flex items-center gap-3 ${config.headerBgClass}`}>
          {config.icon}
          <h2 id="dialog-title" className="text-base font-semibold text-gray-900">
            {config.title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4 bg-white space-y-4">
          {/* Identity strip */}
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-sm font-medium text-gray-900">
              {application.first_name} {application.last_name}
            </p>
            <p className="text-xs text-gray-500">{application.email} · {application.course_code}</p>
          </div>

          <p className="text-sm text-gray-600">{config.description}</p>

          {config.warningBanner && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              {config.warningBanner}
            </div>
          )}

          {/* Message field */}
          <div>
            <label htmlFor="dialog-message" className="block text-sm font-medium text-gray-700 mb-1">
              {config.messageLabel}
              {config.messageRequired && (
                <span className="ml-1 text-red-600">*</span>
              )}
            </label>
            <textarea
              id="dialog-message"
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder={config.messageRequired ? 'Required' : 'Optional'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#123161] focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 flex justify-end gap-3 ${config.footerBgClass}`}>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(message)}
            disabled={!canConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${config.confirmClass}`}
          >
            {config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
