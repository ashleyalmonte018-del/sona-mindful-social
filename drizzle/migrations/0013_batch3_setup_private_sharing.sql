UPDATE public.profiles SET settings = COALESCE(settings, '{}'::jsonb) || '{"setupCompleted":true}'::jsonb WHERE NOT (COALESCE(settings, '{}'::jsonb) ? 'setupCompleted');
CREATE TABLE public.post_shares (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES public.user_posts(id) ON DELETE CASCADE, shared_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(post_id,shared_by));
GRANT SELECT,DELETE ON public.post_shares TO authenticated;
GRANT ALL ON public.post_shares TO service_role;
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read eligible shares" ON public.post_shares FOR SELECT TO authenticated USING (shared_by=auth.uid() OR public.are_friends(shared_by,auth.uid()));
CREATE POLICY "Remove own shares" ON public.post_shares FOR DELETE TO authenticated USING (shared_by=auth.uid());
CREATE OR REPLACE FUNCTION public.share_post(_post uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE source public.user_posts%ROWTYPE; result uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to share'; END IF;
 SELECT * INTO source FROM public.user_posts WHERE id=_post;
 IF NOT FOUND OR NOT source.is_shareable OR NOT public.can_view_gallery(source.user_id,auth.uid()) OR (source.audience='circle' AND source.user_id<>auth.uid() AND NOT public.are_friends(source.user_id,auth.uid())) THEN RAISE EXCEPTION 'This post cannot be shared'; END IF;
 INSERT INTO public.post_shares(post_id,shared_by) VALUES(source.id,auth.uid()) ON CONFLICT(post_id,shared_by) DO UPDATE SET created_at=now() RETURNING id INTO result;
 RETURN result;
END; $$;
REVOKE EXECUTE ON FUNCTION public.share_post(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.share_post(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.shared_feed_posts(_limit integer DEFAULT 15) RETURNS SETOF public.user_posts LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT DISTINCT ON (p.id) p.* FROM public.post_shares s JOIN public.user_posts p ON p.id=s.post_id WHERE p.is_shareable AND (s.shared_by=auth.uid() OR public.are_friends(s.shared_by,auth.uid())) AND public.reaches_public_feed(p.user_id,auth.uid()) ORDER BY p.id,s.created_at DESC LIMIT LEAST(GREATEST(_limit,1),50)
$$;
REVOKE EXECUTE ON FUNCTION public.shared_feed_posts(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.shared_feed_posts(integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.public_post_link(_post uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_posts p JOIN public.profiles a ON a.id=p.user_id WHERE p.id=_post AND p.is_shareable AND p.audience='public' AND a.is_public)
$$;
REVOKE EXECUTE ON FUNCTION public.public_post_link(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.public_post_link(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.shared_post_card(_post uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('post',to_jsonb(p),'author',jsonb_build_object('id',a.id,'display_name',a.display_name,'handle',a.handle)) FROM public.user_posts p JOIN public.profiles a ON a.id=p.user_id WHERE p.id=_post AND p.is_shareable AND p.audience='public' AND a.is_public
$$;
REVOKE EXECUTE ON FUNCTION public.shared_post_card(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shared_post_card(uuid) TO anon,authenticated;
CREATE POLICY "Shareable public post media" ON storage.objects FOR SELECT TO anon,authenticated USING (bucket_id='post-media' AND EXISTS (SELECT 1 FROM public.user_posts p JOIN public.profiles a ON a.id=p.user_id WHERE p.image_path=name AND p.is_shareable AND p.audience='public' AND a.is_public));
