CREATE POLICY "Own post media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'post-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_public_profile(((storage.foldername(name))[1])::uuid)));
CREATE POLICY "Own post media insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own post media delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);