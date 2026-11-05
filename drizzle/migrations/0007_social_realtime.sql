-- Patch 1: tier-aware posts, real reshares, multiplayer matches and Circle chat.
ALTER TABLE public.user_posts ADD COLUMN IF NOT EXISTS circle_tiers text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.user_posts ADD COLUMN IF NOT EXISTS reshared_from uuid REFERENCES public.user_posts(id) ON DELETE SET NULL;
ALTER TABLE public.user_posts ADD COLUMN IF NOT EXISTS shared_by uuid;
CREATE INDEX IF NOT EXISTS user_posts_reshared_idx ON public.user_posts (reshared_from, created_at DESC);

CREATE OR REPLACE FUNCTION public.can_view_post(_post public.user_posts, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _post.user_id = _viewer
    OR (_post.audience = 'public' AND public.reaches_public_feed(_post.user_id, _viewer))
    OR (_post.audience = 'circle'
      AND public.are_friends(_post.user_id, _viewer)
      AND (cardinality(_post.circle_tiers) = 0 OR EXISTS (
        SELECT 1 FROM public.circle_tier_members tm
        WHERE tm.owner_id = _post.user_id AND tm.member_id = _viewer AND tm.tier = ANY(_post.circle_tiers)
      )))
$$;

DROP POLICY IF EXISTS "Posts visible to allowed viewers" ON public.user_posts;
CREATE POLICY "Posts visible to allowed viewers" ON public.user_posts FOR SELECT TO authenticated USING (public.can_view_post(user_posts, auth.uid()));
DROP POLICY IF EXISTS "Own posts delete" ON public.user_posts;
CREATE POLICY "Own posts delete" ON public.user_posts FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.uid() = shared_by);

CREATE OR REPLACE FUNCTION public.share_post(_post uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE source public.user_posts%ROWTYPE; created uuid;
BEGIN
  SELECT * INTO source FROM public.user_posts WHERE id = _post;
  IF NOT FOUND OR NOT source.is_shareable OR NOT public.can_view_post(source, auth.uid()) THEN
    RAISE EXCEPTION 'This post cannot be shared';
  END IF;
  INSERT INTO public.user_posts (user_id, body, image_path, category, topics, disclosures, labels, media_type, audience, disclosure_note, is_shareable, circle_tiers, reshared_from, shared_by)
  VALUES (source.user_id, source.body, source.image_path, source.category, source.topics, source.disclosures, source.labels, source.media_type, source.audience, source.disclosure_note, false, source.circle_tiers, source.id, auth.uid())
  RETURNING id INTO created;
  RETURN created;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.share_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_post(uuid) TO authenticated;

CREATE TABLE public.circle_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT circle_messages_not_self CHECK (sender_id <> recipient_id)
);
GRANT SELECT, INSERT ON public.circle_messages TO authenticated;
ALTER TABLE public.circle_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Friends can read messages" ON public.circle_messages FOR SELECT TO authenticated USING (
  (auth.uid() = sender_id OR auth.uid() = recipient_id) AND public.are_friends(sender_id, recipient_id)
);
CREATE POLICY "Friends can send messages" ON public.circle_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND public.are_friends(sender_id, recipient_id)
);
CREATE INDEX circle_messages_pair_idx ON public.circle_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX circle_messages_recipient_idx ON public.circle_messages (recipient_id, created_at DESC);

CREATE TABLE public.match_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL CHECK (game IN ('tic-tac-toe', 'rps')),
  host_id uuid NOT NULL,
  guest_id uuid,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.join_match(_match uuid)
RETURNS public.match_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.match_sessions;
BEGIN
  UPDATE public.match_sessions m SET guest_id = auth.uid(), status = 'active', updated_at = now()
  WHERE m.id = _match AND m.status = 'waiting' AND m.host_id <> auth.uid() AND public.are_friends(m.host_id, auth.uid());
  SELECT * INTO result FROM public.match_sessions WHERE id = _match AND (host_id = auth.uid() OR guest_id = auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Match unavailable'; END IF;
  RETURN result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.join_match(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_match(uuid) TO authenticated;

CREATE TABLE public.match_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.match_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  move jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.match_sessions TO authenticated;
GRANT SELECT, INSERT ON public.match_moves TO authenticated;
ALTER TABLE public.match_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match participants read" ON public.match_sessions FOR SELECT TO authenticated USING (auth.uid() = host_id OR auth.uid() = guest_id);
CREATE POLICY "Circle members create matches" ON public.match_sessions FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = host_id
);
CREATE POLICY "Match participants update" ON public.match_sessions FOR UPDATE TO authenticated USING (auth.uid() = host_id OR auth.uid() = guest_id);
CREATE POLICY "Match participants moves read" ON public.match_moves FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.match_sessions m WHERE m.id = match_id AND (auth.uid() = m.host_id OR auth.uid() = m.guest_id)));
CREATE POLICY "Match participants moves insert" ON public.match_moves FOR INSERT TO authenticated WITH CHECK (auth.uid() = player_id AND EXISTS (SELECT 1 FROM public.match_sessions m WHERE m.id = match_id AND (auth.uid() = m.host_id OR auth.uid() = m.guest_id)));
CREATE INDEX match_moves_match_idx ON public.match_moves (match_id, created_at);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.match_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
