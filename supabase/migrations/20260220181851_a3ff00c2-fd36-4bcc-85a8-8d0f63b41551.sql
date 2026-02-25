
-- Create storage bucket for custom icon/banner uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('migration-assets', 'migration-assets', true);

-- Anyone can view migration assets (they're used as URLs during transfer)
CREATE POLICY "Migration assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'migration-assets');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload migration assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'migration-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own uploads
CREATE POLICY "Users can update own migration assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'migration-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own migration assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'migration-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
