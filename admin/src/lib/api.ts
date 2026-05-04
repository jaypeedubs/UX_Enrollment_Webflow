import { supabase } from './supabase';
import type { Application, Program } from './types';

async function invokeAdminRead(resource?: string): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No active session');
  const url = new URL(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/admin-read`);
  if (resource) url.searchParams.set('resource', resource);
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getApplications(): Promise<Application[]> {
  return invokeAdminRead();
}

export async function getPrograms(): Promise<Program[]> {
  return invokeAdminRead('programs');
}
