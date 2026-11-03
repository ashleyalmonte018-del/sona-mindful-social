ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_passcode_hash text;

CREATE TABLE public.user_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  body text NOT NULL DEFAULT '',
  image_path text,
  category text NOT NULL DEFAULT 'inspiration',
  topics text[] NOT NULL DEFAULT '{}',
  disclosures jsonb NOT NULL DEFAULT '{}'::jsonb,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_posts TO authenticated;
GRANT ALL ON public.user_posts TO service_role;
ALTER TABLE public.user_posts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_public_profile(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_public FROM public.profiles WHERE id = _uid), false)
$$;

CREATE POLICY "Own posts read" ON public.user_posts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_public_profile(user_id));
CREATE POLICY "Own posts insert" ON public.user_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own posts update" ON public.user_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own posts delete" ON public.user_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX user_posts_user_idx ON public.user_posts (user_id, created_at DESC);

CREATE TABLE public.usage_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day date NOT NULL,
  seconds integer NOT NULL DEFAULT 0,
  hidden_count integer NOT NULL DEFAULT 0,
  category_seconds jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);
GRANT SELECT, INSERT, UPDATE ON public.usage_days TO authenticated;
GRANT ALL ON public.usage_days TO service_role;
ALTER TABLE public.usage_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own usage read" ON public.usage_days FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own usage insert" ON public.usage_days FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own usage update" ON public.usage_days FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);