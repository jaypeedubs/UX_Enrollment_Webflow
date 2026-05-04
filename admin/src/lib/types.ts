export type AppStatus =
  | 'draft' | 'submitted' | 'in_review'
  | 'waitlisted' | 'accepted' | 'rejected'
  | 'enrolled' | 'withdrawn';

export interface Application {
  id: string;
  applicant_id: string;
  status: AppStatus;
  first_name: string;
  last_name: string;
  email: string;
  course_code: string;
  program_name: string;
  submitted_at: string | null;
  updated_at: string;
  admin_notes: string | null;
  locked_fields: Record<string, unknown> | null;
}

export interface ApplicationEvent {
  id: string;
  application_id: string;
  event_type: string;
  triggered_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Program {
  id: string;
  name: string;
  course_code: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
}
