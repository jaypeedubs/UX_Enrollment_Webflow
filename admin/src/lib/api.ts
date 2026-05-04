import { supabase } from './supabase';
import type { Application, Program } from './types';

export async function getApplications(): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id,
      applicant_id,
      status,
      first_name,
      last_name,
      email,
      admin_notes,
      locked_fields,
      submitted_at,
      updated_at,
      programs ( name, course_code )
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    program_name: row.programs?.name ?? '',
    course_code: row.programs?.course_code ?? '',
  }));
}

export async function getPrograms(): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('id, name, course_code')
    .order('name');

  if (error) throw error;
  return data ?? [];
}
