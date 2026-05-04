import type { AppStatus } from './types';

type BadgeVariant = 'pending' | 'approved' | 'rejected' | 'waitlisted' | 'draft';

const STATUS_VARIANT: Record<AppStatus, BadgeVariant> = {
  draft:      'draft',
  submitted:  'pending',
  in_review:  'pending',
  waitlisted: 'waitlisted',
  accepted:   'approved',
  rejected:   'rejected',
  enrolled:   'approved',
  withdrawn:  'rejected',
};

export function statusToVariant(status: AppStatus): BadgeVariant {
  return STATUS_VARIANT[status];
}
