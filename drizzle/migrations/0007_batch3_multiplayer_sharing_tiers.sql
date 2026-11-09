-- ---------- Notifications: recipients can read + mark read; live delivery ----------
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS post_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_id uuid;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
CREATE POLICY "Recipients read notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "Recipients mark notifications read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON public.notifications (recipient_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ---------- Matches: moves only through validated functions ----------
DROP POLICY IF EXISTS "Match participants update" ON public.match_sessions;
DROP POLICY IF EXISTS "Circle members create matches" ON public.match_sessions;

CREATE TABLE public.match_hidden_picks (
  match_id uuid NOT NULL REFERENCES public.match_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  pick text NOT NULL,
  PRIMARY KEY (match_id, player_id)
);
GRANT ALL ON public.match_hidden_picks TO service_role;
ALTER TABLE public.match_hidden_picks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.notify_match(_match uuid, _to uuid, _kind text, _title text, _body text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.notifications WHERE match_id = _match AND recipient_id = _to AND kind = 'your_turn' AND read_at IS NULL;
  INSERT INTO public.notifications (recipient_id, kind, title, body, match_id, actor_id)
  VALUES (_to, _kind, _title, _body, _match, auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.notify_match(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_match(_game text, _guest uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); mid uuid; init jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in to play'; END IF;
  IF _game NOT IN ('ttt','rps') THEN RAISE EXCEPTION 'That game is not multiplayer yet'; END IF;
  IF _guest IS NULL OR _guest = me OR NOT public.are_friends(me, _guest) THEN RAISE EXCEPTION 'You can only invite people in your circle'; END IF;
  init := CASE WHEN _game = 'ttt'
    THEN jsonb_build_object('board', '[null,null,null,null,null,null,null,null,null]'::jsonb, 'turn', me, 'winner', null)
    ELSE jsonb_build_object('round', 1, 'picked', '[]'::jsonb, 'history', '[]'::jsonb, 'host', 0, 'guest', 0, 'target', 3, 'winner', null) END;
  INSERT INTO public.match_sessions (game, host_id, guest_id, state, status) VALUES (_game, me, _guest, init, 'waiting') RETURNING id INTO mid;
  INSERT INTO public.notifications (recipient_id, kind, title, body, match_id, actor_id)
  VALUES (_guest, 'game_invite', 'New game invite', CASE WHEN _game='ttt' THEN 'Tic Tac Toe — want to play?' ELSE 'Rock Paper Scissors — want to play?' END, mid, me);
  RETURN mid;
END $$;

CREATE OR REPLACE FUNCTION public.join_match(_match uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.match_sessions SET status = 'active', updated_at = now()
  WHERE id = _match AND guest_id = auth.uid() AND status = 'waiting';
  UPDATE public.notifications SET read_at = now() WHERE match_id = _match AND recipient_id = auth.uid() AND read_at IS NULL;
END $$;

CREATE OR REPLACE FUNCTION public.decline_match(_match uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.match_sessions SET status = 'cancelled', updated_at = now()
  WHERE id = _match AND (guest_id = auth.uid() OR host_id = auth.uid()) AND status IN ('waiting','active');
  UPDATE public.notifications SET read_at = now() WHERE match_id = _match AND recipient_id = auth.uid() AND read_at IS NULL;
END $$;

CREATE OR REPLACE FUNCTION public.ttt_winner(b jsonb)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE l int[]; lines int[][] := ARRAY[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
BEGIN
  FOREACH l SLICE 1 IN ARRAY lines LOOP
    IF b->>l[1] IS NOT NULL AND b->>l[1] = b->>l[2] AND b->>l[1] = b->>l[3] THEN RETURN b->>l[1]; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(b) e WHERE e = 'null'::jsonb) THEN RETURN 'draw'; END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.match_move(_match uuid, _move text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); m public.match_sessions%ROWTYPE; other uuid; s jsonb; idx int; w text;
  hp text; gp text; res text;
BEGIN
  SELECT * INTO m FROM public.match_sessions WHERE id = _match FOR UPDATE;
  IF NOT FOUND OR me IS NULL OR (me <> m.host_id AND me IS DISTINCT FROM m.guest_id) THEN RAISE EXCEPTION 'Not your match'; END IF;
  IF m.status = 'waiting' AND me = m.guest_id THEN m.status := 'active'; END IF;
  IF m.status NOT IN ('waiting','active') THEN RAISE EXCEPTION 'This match is over'; END IF;
  other := CASE WHEN me = m.host_id THEN m.guest_id ELSE m.host_id END;
  s := m.state;

  IF m.game = 'ttt' THEN
    IF s->>'turn' <> me::text THEN RAISE EXCEPTION 'Wait for your turn'; END IF;
    idx := _move::int;
    IF idx < 0 OR idx > 8 OR s->'board'->>idx IS NOT NULL THEN RAISE EXCEPTION 'That square is taken'; END IF;
    s := jsonb_set(s, ARRAY['board', idx::text], to_jsonb(CASE WHEN me = m.host_id THEN 'X' ELSE 'O' END));
    w := public.ttt_winner(s->'board');
    s := jsonb_set(s, '{turn}', to_jsonb(other::text));
    s := jsonb_set(s, '{winner}', COALESCE(to_jsonb(w), 'null'::jsonb));
    IF w IS NOT NULL THEN m.status := 'done'; END IF;
    PERFORM public.notify_match(_match, other, 'your_turn', CASE WHEN w IS NULL THEN 'Your move' ELSE 'Game over' END, 'Tic Tac Toe');

  ELSIF m.game = 'rps' THEN
    IF _move NOT IN ('rock','paper','scissors') THEN RAISE EXCEPTION 'Pick rock, paper or scissors'; END IF;
    IF EXISTS (SELECT 1 FROM public.match_hidden_picks WHERE match_id = _match AND player_id = me) THEN RAISE EXCEPTION 'Already picked — waiting on them'; END IF;
    INSERT INTO public.match_hidden_picks VALUES (_match, me, _move);
    SELECT pick INTO hp FROM public.match_hidden_picks WHERE match_id = _match AND player_id = m.host_id;
    SELECT pick INTO gp FROM public.match_hidden_picks WHERE match_id = _match AND player_id = m.guest_id;
    IF hp IS NULL OR gp IS NULL THEN
      s := jsonb_set(s, '{picked}', to_jsonb(ARRAY[me::text]));
      PERFORM public.notify_match(_match, other, 'your_turn', 'Your move', 'Rock Paper Scissors — they picked, now you');
    ELSE
      res := CASE WHEN hp = gp THEN 'draw'
        WHEN (hp='rock' AND gp='scissors') OR (hp='paper' AND gp='rock') OR (hp='scissors' AND gp='paper') THEN 'host' ELSE 'guest' END;
      s := jsonb_set(s, '{history}', (s->'history') || jsonb_build_array(jsonb_build_object('host', hp, 'guest', gp, 'result', res)));
      IF res = 'host' THEN s := jsonb_set(s, '{host}', to_jsonb((s->>'host')::int + 1)); END IF;
      IF res = 'guest' THEN s := jsonb_set(s, '{guest}', to_jsonb((s->>'guest')::int + 1)); END IF;
      s := jsonb_set(s, '{picked}', '[]'::jsonb);
      s := jsonb_set(s, '{round}', to_jsonb((s->>'round')::int + 1));
      DELETE FROM public.match_hidden_picks WHERE match_id = _match;
      IF (s->>'host')::int >= (s->>'target')::int THEN s := jsonb_set(s, '{winner}', '"host"'); m.status := 'done';
      ELSIF (s->>'guest')::int >= (s->>'target')::int THEN s := jsonb_set(s, '{winner}', '"guest"'); m.status := 'done'; END IF;
      PERFORM public.notify_match(_match, other, 'your_turn', CASE WHEN m.status = 'done' THEN 'Game over' ELSE 'Round done — your move' END, 'Rock Paper Scissors');
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown game';
  END IF;

  UPDATE public.notifications SET read_at = now() WHERE match_id = _match AND recipient_id = me AND read_at IS NULL;
  UPDATE public.match_sessions SET state = s, status = m.status, updated_at = now() WHERE id = _match;
  IF m.status = 'done' THEN
    INSERT INTO public.game_results (game, winner_id, loser_id, player_a_id, player_b_id, match_id)
    VALUES (m.game,
      CASE WHEN (m.game='ttt' AND w='X') OR s->>'winner'='host' THEN m.host_id WHEN (m.game='ttt' AND w='O') OR s->>'winner'='guest' THEN m.guest_id END,
      CASE WHEN (m.game='ttt' AND w='X') OR s->>'winner'='host' THEN m.guest_id WHEN (m.game='ttt' AND w='O') OR s->>'winner'='guest' THEN m.host_id END,
      m.host_id, m.guest_id, _match);
  END IF;
  RETURN s;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_match(text, uuid), public.join_match(uuid), public.decline_match(uuid), public.match_move(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_match(text, uuid), public.join_match(uuid), public.decline_match(uuid), public.match_move(uuid, text) TO authenticated;

-- ---------- Per-post tier visibility (owner-only table so viewers never learn their tier) ----------
CREATE TABLE public.post_tiers (
  post_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  tier text NOT NULL CHECK (tier IN ('inner','family','work','acquaintances','niche','local')),
  PRIMARY KEY (post_id, tier)
);
GRANT SELECT, INSERT, DELETE ON public.post_tiers TO authenticated;
GRANT ALL ON public.post_tiers TO service_role;
ALTER TABLE public.post_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own post tiers read" ON public.post_tiers FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Own post tiers add" ON public.post_tiers FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Own post tiers remove" ON public.post_tiers FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.post_tier_ok(_post uuid, _owner uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner = _viewer
    OR NOT EXISTS (SELECT 1 FROM public.post_tiers WHERE post_id = _post AND owner_id = _owner)
    OR EXISTS (SELECT 1 FROM public.post_tiers t JOIN public.circle_tier_members c
               ON c.owner_id = t.owner_id AND c.tier = t.tier AND c.member_id = _viewer
               WHERE t.post_id = _post AND t.owner_id = _owner)
$$;

DROP POLICY IF EXISTS "Posts visible to allowed viewers" ON public.user_posts;
CREATE POLICY "Posts visible to allowed viewers" ON public.user_posts FOR SELECT TO authenticated USING (
  (auth.uid() = user_id)
  OR (public.post_tier_ok(id, user_id, auth.uid()) AND (
       ((audience = 'circle') AND public.are_friends(user_id, auth.uid()))
    OR ((audience = 'public') AND public.can_view_gallery(user_id, auth.uid()))))
);

-- ---------- Sharing ----------
ALTER TABLE public.post_shares ADD COLUMN IF NOT EXISTS recipient_id uuid;

CREATE OR REPLACE FUNCTION public.can_see_post(_post uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_posts p JOIN public.profiles a ON a.id = p.user_id
    WHERE p.id = _post AND (
      p.user_id = _viewer OR (
        public.post_tier_ok(p.id, p.user_id, _viewer)
        AND (a.is_public OR public.is_approved_follower(p.user_id, _viewer))
        AND public.can_view_gallery(p.user_id, _viewer)
        AND (p.audience <> 'circle' OR public.are_friends(p.user_id, _viewer)))))
$$;

CREATE OR REPLACE FUNCTION public.share_post(_post uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE source public.user_posts%ROWTYPE; result uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to share'; END IF;
  SELECT * INTO source FROM public.user_posts WHERE id = _post;
  IF NOT FOUND OR NOT source.is_shareable OR NOT public.can_see_post(_post, auth.uid()) THEN RAISE EXCEPTION 'This post cannot be shared'; END IF;
  INSERT INTO public.post_shares(post_id, shared_by) VALUES (source.id, auth.uid())
  ON CONFLICT (post_id, shared_by) DO UPDATE SET created_at = now() RETURNING id INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.share_post_to(_post uuid, _recipient uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); source public.user_posts%ROWTYPE; who text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in to share'; END IF;
  SELECT * INTO source FROM public.user_posts WHERE id = _post;
  IF NOT FOUND OR NOT source.is_shareable OR NOT public.can_see_post(_post, me) THEN RAISE EXCEPTION 'This post cannot be shared'; END IF;
  IF _recipient IS NULL OR _recipient = me THEN RAISE EXCEPTION 'Pick someone to send it to'; END IF;
  IF NOT (public.is_approved_follower(me, _recipient) OR public.is_approved_follower(_recipient, me)) THEN
    RAISE EXCEPTION 'You can only share with people you follow or who follow you';
  END IF;
  IF NOT public.can_see_post(_post, _recipient) THEN
    RAISE EXCEPTION 'They can''t see this post — the poster''s privacy settings keep it from them';
  END IF;
  SELECT display_name INTO who FROM public.profiles WHERE id = me;
  INSERT INTO public.notifications (recipient_id, kind, title, body, post_id, actor_id)
  VALUES (_recipient, 'post_share', COALESCE(who, 'Someone') || ' shared a post with you', left(COALESCE(NULLIF(source.body, ''), 'Tap to see it'), 120), _post, me);
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.share_post_to(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_post_to(uuid, uuid) TO authenticated;

-- Public links: only public accounts, Public Feed posts, shareable, not tier-limited.
CREATE OR REPLACE FUNCTION public.shared_post_card(_post uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'post', jsonb_build_object('id', p.id, 'user_id', p.user_id, 'body', p.body, 'media_type', p.media_type, 'image_path', p.image_path,
      'audience', p.audience, 'disclosures', p.disclosures, 'disclosure_note', p.disclosure_note, 'labels', p.labels, 'created_at', p.created_at),
    'author', jsonb_build_object('id', a.id, 'display_name', a.display_name, 'handle', a.handle))
  FROM public.user_posts p JOIN public.profiles a ON a.id = p.user_id
  WHERE p.id = _post AND p.is_shareable AND p.audience = 'public' AND a.is_public
    AND NOT EXISTS (SELECT 1 FROM public.post_tiers t WHERE t.post_id = p.id)
$$;
GRANT EXECUTE ON FUNCTION public.shared_post_card(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_post_link(_post uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.shared_post_card(_post) IS NOT NULL
$$;