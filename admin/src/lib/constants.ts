import type { AppStatus } from './types';

export const STATUSES: AppStatus[] = [
  'draft','submitted','in_review',
  'waitlisted','accepted','rejected',
  'enrolled','withdrawn',
];

export const WITHDRAW_ALLOWED: AppStatus[] = [
  'submitted','in_review','waitlisted','accepted',
];
