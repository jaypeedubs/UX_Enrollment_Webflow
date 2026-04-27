-- ============================================================
-- ICIT Application System — Storage: cvs bucket
-- Run after 002_rls.sql
-- ============================================================

-- Create the private bucket for CV uploads.
-- public = false: files are never exposed via a public URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cvs',
  'cvs',
  false,
  10485760,   -- 10 MB per file
  ARRAY['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may upload to their own folder only: cvs/{user_id}/*
DROP POLICY IF EXISTS "cvs_authenticated_upload" ON storage.objects;
CREATE POLICY "cvs_authenticated_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users may read their own files only.
DROP POLICY IF EXISTS "cvs_authenticated_read" ON storage.objects;
CREATE POLICY "cvs_authenticated_read" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users may replace (update) their own files.
DROP POLICY IF EXISTS "cvs_authenticated_update" ON storage.objects;
CREATE POLICY "cvs_authenticated_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users may delete their own files (e.g. re-upload before submission).
-- Files lock after application submission — enforced at application layer, not here.
DROP POLICY IF EXISTS "cvs_authenticated_delete" ON storage.objects;
CREATE POLICY "cvs_authenticated_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
