import { supabase } from './supabase';
import type { Application, Program, ApplicationEvent } from './types';

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

async function invokeAdminWrite(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  params?: Record<string, string>,
  body?: any
): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No active session');

  const url = new URL(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/admin-write`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    ...(body && { body: JSON.stringify(body) }),
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

export async function createProgram(program: Omit<Program, 'id' | 'created_at'>): Promise<Program> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/admin-read?resource=programs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(program),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateProgram(id: string, fields: Partial<Program>): Promise<Program> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/admin-read?resource=programs&id=${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function archiveProgram(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/admin-read?resource=programs&id=${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function updateAdminNotes(applicationId: string, adminNotes: string): Promise<void> {
  await invokeAdminWrite('PATCH', {}, { application_id: applicationId, admin_notes: adminNotes });
}

export async function getCvSignedUrl(applicationId: string): Promise<string | null> {
  const data = await invokeAdminWrite('GET', { resource: 'cv-url', application_id: applicationId });
  return data.url;
}

export async function getTimeline(applicationId: string): Promise<ApplicationEvent[]> {
  return invokeAdminWrite('GET', { resource: 'timeline', application_id: applicationId });
}
