import { db } from './supabase.js';

export async function getSession() {
  const { data } = await db.auth.getSession();
  return data.session; // null if not signed in
}

// Returns session or redirects to /login and hangs (never resolves).
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login';
    return new Promise(() => {}); // intentionally never resolves
  }
  return session;
}

// Redirects to /dashboard if a session exists. Hangs if redirect fires.
export async function requireGuest() {
  const session = await getSession();
  if (session) {
    window.location.href = '/dashboard';
    return new Promise(() => {}); // intentionally never resolves
  }
}

export function isLoginAuthReturn() {
  if (window.location.pathname !== '/login') return false;
  const search = new URLSearchParams(window.location.search || '');
  const hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  return search.has('code') || search.has('token_hash') || search.has('type') ||
    hash.has('access_token') || hash.has('refresh_token') || hash.has('type') || hash.has('error');
}

export async function completeLoginAuthReturn() {
  if (!isLoginAuthReturn()) return false;
  const session = await getSession();
  if (session) await signOut();
  window.history.replaceState({}, '', '/login');
  return true;
}

export async function signIn(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(email, password, firstName, lastName) {
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + '/login',
      data: { first_name: firstName, last_name: lastName },
    },
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await db.auth.signOut();
  if (error) throw error;
}
