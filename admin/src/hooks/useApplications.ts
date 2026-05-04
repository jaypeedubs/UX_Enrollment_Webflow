import { useState, useEffect, useRef, useCallback } from 'react';
import type { Application } from '../lib/types';
import { getApplications } from '../lib/api';

interface Filters {
  course: string;
  status: string;
  search: string;
}

interface UseApplicationsReturn {
  applications: Application[];
  loading: boolean;
  error: string | null;
  filters: Filters;
  setFilter: (key: keyof Filters, value: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  currentIndex: number;
  total: number;
  selectPrev: () => void;
  selectNext: () => void;
  refresh: () => void;
}

function readUrlFilters(): Filters & { id: string } {
  if (typeof window === 'undefined') {
    return { course: '', status: '', search: '', id: '' };
  }
  const p = new URLSearchParams(window.location.search);
  return {
    course: p.get('course') ?? '',
    status: p.get('status') ?? '',
    search: p.get('search') ?? '',
    id:     p.get('id')     ?? '',
  };
}

function writeUrl(filters: Filters, id: string | null) {
  if (typeof window === 'undefined') return;
  const p = new URLSearchParams();
  if (filters.course) p.set('course', filters.course);
  if (filters.status) p.set('status', filters.status);
  if (filters.search) p.set('search', filters.search);
  if (id)             p.set('id', id);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

function applyFilters(all: Application[], filters: Filters): Application[] {
  return all.filter((app) => {
    if (filters.course && app.course_code !== filters.course) return false;
    if (filters.status && app.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const name = `${app.first_name} ${app.last_name}`.toLowerCase();
      if (!name.includes(q) && !app.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function useApplications(): UseApplicationsReturn {
  const [all, setAll] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(() => {
    const { course, status, search } = readUrlFilters();
    return { course, status, search };
  });
  const [selectedId, setSelectedIdState] = useState<string | null>(() => {
    return readUrlFilters().id || null;
  });

  // Ref so reconciliation effect can read current selectedId without depending on it
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    getApplications()
      .then(setAll)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reconcile selection when list or filters change
  useEffect(() => {
    const filtered = applyFilters(all, filters);
    const found = filtered.some((a) => a.id === selectedIdRef.current);
    if (!found) {
      const next = filtered[0]?.id ?? null;
      setSelectedIdState(next);
      writeUrl(filters, next);
    }
  }, [all, filters]);

  const setFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      writeUrl(next, selectedIdRef.current);
      return next;
    });
  }, []);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    setFilters((prev) => {
      writeUrl(prev, id);
      return prev;
    });
  }, []);

  const applications = applyFilters(all, filters);
  const total = applications.length;
  const currentIndex = selectedId
    ? applications.findIndex((a) => a.id === selectedId) + 1
    : 0;

  const selectPrev = useCallback(() => {
    if (currentIndex <= 1) return;
    setSelectedId(applications[currentIndex - 2].id);
  }, [applications, currentIndex, setSelectedId]);

  const selectNext = useCallback(() => {
    if (currentIndex >= total) return;
    setSelectedId(applications[currentIndex].id);
  }, [applications, currentIndex, total, setSelectedId]);

  return {
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
  };
}
