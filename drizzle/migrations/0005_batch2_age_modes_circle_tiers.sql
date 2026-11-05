-- Age modes renamed: Sapling (under 13), Sprout (teens), Bloom (18+).
-- Old ids: sprout = under 13, bloom = teens, open = 18+.
UPDATE public.profiles SET age_mode = CASE age_mode
  WHEN 'sprout' THEN 'sapling'
  WHEN 'bloom' THEN 'sprout'
  WHEN 'open' THEN 'bloom'
  ELSE 'sprout' END;
ALTER TABLE public.profiles ALTER COLUMN age_mode SET DEFAULT 'sprout';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_age_mode_check CHECK (age_mode IN ('sapling', 'sprout', 'bloom'));

-- Circle tiers: the owner privately sorts circle members (mutual follows) into tiers.
CREATE TABLE public.circle_tier_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  member_id uuid NOT NULL,
  tier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT circle_tier_members_tier_check CHECK (tier IN ('work', 'acquaintances', 'family', 'inner', 'niche', 'local')),
  CONSTRAINT circle_tier_members_not_self CHECK (owner_id <> member_id),
  CONSTRAINT circle_tier_members_unique UNIQUE (owner_id, member_id, tier)
);
GRANT SELECT, INSERT, DELETE ON public.circle_tier_members TO authenticated;
GRANT ALL ON public.circle_tier_members TO service_role;
ALTER TABLE public.circle_tier_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX circle_tier_members_owner_idx ON public.circle_tier_members (owner_id);

CREATE POLICY "Own tiers read" ON public.circle_tier_members FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Own tiers add circle members" ON public.circle_tier_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id AND public.are_friends(owner_id, member_id));
CREATE POLICY "Own tiers remove" ON public.circle_tier_members FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- The caller's circle (mutual follows) with each member's Sona and what they chose to share.
-- Quiet mode hides the song, artist and mood.
CREATE OR REPLACE FUNCTION public.circle_sonas()
RETURNS TABLE (id uuid, display_name text, handle text, avatar_path text, accent_color text, sona jsonb, song text, artist text, mood text, quiet boolean, allows_play boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.handle, p.avatar_path, p.accent_color, p.sona,
    CASE WHEN COALESCE((p.settings->>'quietMode')::boolean, false) THEN NULL ELSE p.settings->'share'->>'song' END,
    CASE WHEN COALESCE((p.settings->>'quietMode')::boolean, false) THEN NULL ELSE p.settings->'share'->>'artist' END,
    CASE WHEN COALESCE((p.settings->>'quietMode')::boolean, false) THEN NULL ELSE p.settings->'share'->>'mood' END,
    COALESCE((p.settings->>'quietMode')::boolean, false),
    COALESCE((p.settings->>'allowInteractions')::boolean, true) AND COALESCE((p.settings->>'sonaEnabled')::boolean, true)
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.id <> auth.uid() AND public.are_friends(p.id, auth.uid())
  ORDER BY p.display_name
  LIMIT 100
$$;
REVOKE EXECUTE ON FUNCTION public.circle_sonas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.circle_sonas() TO authenticated;