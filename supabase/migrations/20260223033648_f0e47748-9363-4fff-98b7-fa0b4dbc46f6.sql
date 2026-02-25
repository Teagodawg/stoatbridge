
-- Fix storage bucket: make it private and tighten policies
UPDATE storage.buckets SET public = false WHERE id = 'migration-assets';

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can upload migration assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view migration assets" ON storage.objects;
DROP POLICY IF EXISTS "Public access to migration assets" ON storage.objects;

-- Create proper policies with user-scoped folders and file type restrictions
CREATE POLICY "Authenticated users can upload migration assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'migration-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (lower(name) ~ '\.(jpg|jpeg|png|gif|webp)$')
);

CREATE POLICY "Users can view their own migration assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'migration-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own migration assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'migration-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
