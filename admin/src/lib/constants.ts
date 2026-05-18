import type { AppStatus } from './types';

export const STATUSES: AppStatus[] = [
  'draft', 'submitted', 'in_review',
  'waitlisted', 'accepted', 'rejected',
  'enrolled', 'withdrawn',
];

// Admin intentionally excludes 'draft' — withdrawing a draft is an applicant action,
// not an admin action. Applicant-side (src/core/constants.js) includes 'draft'.
export const WITHDRAW_ALLOWED: AppStatus[] = [
  'submitted', 'in_review', 'waitlisted', 'accepted',
];

// Must stay in sync with the COURSES constant in DashboardPage.tsx and ApplicationsPage.tsx.
// Source of truth: enrollment program offerings.
export const COURSES = ['ASC', 'ISC', 'AAC', 'FAC', 'IFAC', 'CITEC'] as const;
export type CourseCode = typeof COURSES[number];
