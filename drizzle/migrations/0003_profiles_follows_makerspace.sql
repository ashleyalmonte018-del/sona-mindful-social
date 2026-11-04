-- Profile customization + private-account scope
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_path text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '#d7f75b';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS private_hides text NOT NULL DEFAULT 'everything';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_private_hides_check CHECK (private_hides IN ('followers', 'posts', 'everything'));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_accent_color_check CHECK (accent_color ~ '^#[0-9a-fA-F]{6}$');

-- Posts: type, audience, free-text edit note, required disclosures
ALTER TABLE public.user_posts ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'text';
ALTER TABLE public.user_posts ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'public';
ALTER TABLE public.user_posts ADD COLUMN IF NOT EXISTS disclosure_note text;
ALTER TABLE public.user_posts ADD CONSTRAINT user_posts_media_type_check CHECK (media_type IN ('text', 'photo', 'video'));
ALTER TABLE public.user_posts ADD CONSTRAINT user_posts_audience_check CHECK (audience IN ('public', 'circle'));
ALTER TABLE public.user_posts ADD CONSTRAINT user_posts_disclosures_check CHECK (
  jsonb_typeof(disclosures -> 'edited') = 'boolean'
  AND jsonb_typeof(disclosures -> 'filter') = 'boolean'
  AND jsonb_typeof(disclosures -> 'paid') = 'boolean'
);
ALTER TABLE public.user_posts ADD CONSTRAINT user_posts_labels_array_check CHECK (jsonb_typeof(labels) = 'array');
ALTER TABLE public.user_posts ADD CONSTRAINT user_posts_note_length_check CHECK (disclosure_note IS NULL OR char_length(disclosure_note) <= 280);
CREATE INDEX IF NOT EXISTS user_posts_feed_idx ON public.user_posts (audience, created_at DESC);

-- Follows with approval
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  CONSTRAINT follows_pair_unique UNIQUE (follower_id, following_id),
  CONSTRAINT follows_not_self CHECK (follower_id <> following_id),
  CONSTRAINT follows_status_check CHECK (status IN ('pending', 'approved'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows visible to both sides" ON public.follows FOR SELECT TO authenticated USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY "Follow as yourself" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Approve your own requests" ON public.follows FOR UPDATE TO authenticated USING (auth.uid() = following_id) WITH CHECK (auth.uid() = following_id);
CREATE POLICY "Either side can remove" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE INDEX follows_following_idx ON public.follows (following_id, status);
CREATE INDEX follows_follower_idx ON public.follows (follower_id, status);

-- Public accounts auto-approve; private accounts start pending.
CREATE OR REPLACE FUNCTION public.follows_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.following_id) THEN
    RAISE EXCEPTION 'That account does not exist';
  END IF;
  IF COALESCE((SELECT is_public FROM public.profiles WHERE id = NEW.following_id), false) THEN
    NEW.status := 'approved';
    NEW.approved_at := now();
  ELSE
    NEW.status := 'pending';
    NEW.approved_at := NULL;
  END IF;
  NEW.created_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER follows_before_insert BEFORE INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.follows_before_insert();

-- Only status can change, and only pending -> approved.
CREATE OR REPLACE FUNCTION public.follows_before_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.follower_id <> OLD.follower_id OR NEW.following_id <> OLD.following_id OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Only the request status can change';
  END IF;
  IF NEW.status <> 'approved' THEN
    RAISE EXCEPTION 'A request can only be approved';
  END IF;
  IF OLD.status = 'pending' THEN
    NEW.approved_at := now();
  ELSE
    NEW.approved_at := OLD.approved_at;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER follows_before_update BEFORE UPDATE ON public.follows FOR EACH ROW EXECUTE FUNCTION public.follows_before_update();

-- Going public approves everyone who was waiting.
CREATE OR REPLACE FUNCTION public.profiles_after_public()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_public AND NOT OLD.is_public THEN
    UPDATE public.follows SET status = 'approved' WHERE following_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_after_public AFTER UPDATE OF is_public ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_after_public();

-- Visibility helpers
CREATE OR REPLACE FUNCTION public.is_approved_follower(_owner uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.follows WHERE follower_id = _viewer AND following_id = _owner AND status = 'approved')
$$;

CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_approved_follower(_a, _b) AND public.is_approved_follower(_b, _a)
$$;

-- Profile gallery: public accounts, approved followers, or private accounts that only hide their follower count.
CREATE OR REPLACE FUNCTION public.can_view_gallery(_owner uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner = _viewer
    OR COALESCE((SELECT is_public OR private_hides = 'followers' FROM public.profiles WHERE id = _owner), false)
    OR public.is_approved_follower(_owner, _viewer)
$$;

-- Public Feed reach: a private account never reaches beyond approved followers.
CREATE OR REPLACE FUNCTION public.reaches_public_feed(_owner uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner = _viewer
    OR COALESCE((SELECT is_public FROM public.profiles WHERE id = _owner), false)
    OR public.is_approved_follower(_owner, _viewer)
$$;

DROP POLICY IF EXISTS "Own posts read" ON public.user_posts;
CREATE POLICY "Posts visible to allowed viewers" ON public.user_posts FOR SELECT TO authenticated USING (
  auth.uid() = user_id
  OR (audience = 'circle' AND public.are_friends(user_id, auth.uid()))
  OR (audience = 'public' AND public.can_view_gallery(user_id, auth.uid()))
);

CREATE OR REPLACE FUNCTION public.public_feed_posts(_limit integer DEFAULT 15)
RETURNS SETOF public.user_posts LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM public.user_posts
  WHERE audience = 'public' AND public.reaches_public_feed(user_id, auth.uid())
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 50)
$$;

-- Limited public profile card; never exposes settings, care profile or passcode.
CREATE OR REPLACE FUNCTION public.profile_card(_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.profiles%ROWTYPE;
  me uuid := auth.uid();
  is_me boolean;
  follower boolean;
  full_access boolean;
  counts_ok boolean;
BEGIN
  IF me IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = _id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  is_me := p.id = me;
  follower := public.is_approved_follower(p.id, me);
  full_access := is_me OR p.is_public OR follower;
  counts_ok := full_access OR p.private_hides = 'posts';
  RETURN jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'handle', p.handle,
    'avatar_path', p.avatar_path,
    'sona', p.sona,
    'is_public', p.is_public,
    'private_hides', CASE WHEN p.is_public THEN NULL ELSE p.private_hides END,
    'bio', CASE WHEN full_access OR p.private_hides <> 'everything' THEN p.bio END,
    'banner_path', CASE WHEN full_access OR p.private_hides <> 'everything' THEN p.banner_path END,
    'accent_color', p.accent_color,
    'followers', CASE WHEN counts_ok THEN (SELECT count(*) FROM public.follows WHERE following_id = p.id AND status = 'approved') END,
    'following', CASE WHEN counts_ok THEN (SELECT count(*) FROM public.follows WHERE follower_id = p.id AND status = 'approved') END,
    'posts_visible', public.can_view_gallery(p.id, me),
    'my_follow', (SELECT status FROM public.follows WHERE follower_id = me AND following_id = p.id),
    'follows_me', (SELECT status FROM public.follows WHERE follower_id = p.id AND following_id = me),
    'is_me', is_me
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.search_profiles(_q text)
RETURNS TABLE (id uuid, display_name text, handle text, avatar_path text, is_public boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.handle, p.avatar_path, p.is_public
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND char_length(trim(_q)) >= 1
    AND (p.display_name ILIKE '%' || trim(_q) || '%' OR p.handle ILIKE '%' || trim(leading '@' from trim(_q)) || '%')
  ORDER BY p.display_name
  LIMIT 20
$$;

CREATE OR REPLACE FUNCTION public.people_cards(_ids uuid[])
RETURNS TABLE (id uuid, display_name text, handle text, avatar_path text, accent_color text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.handle, p.avatar_path, p.accent_color
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.id = ANY(_ids[1:100])
$$;

REVOKE EXECUTE ON FUNCTION public.profile_card(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_profiles(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.people_cards(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.public_feed_posts(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_card(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.people_cards(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_feed_posts(integer) TO authenticated;

-- Post media readable by anyone allowed to see that person's posts.
DROP POLICY IF EXISTS "Own post media read" ON storage.objects;
CREATE POLICY "Post media read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'post-media' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.can_view_gallery(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.are_friends(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

-- Profile media (avatars + banners) in the owner's folder.
CREATE POLICY "Profile media read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'profile-media');
CREATE POLICY "Profile media insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Profile media update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Profile media delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);