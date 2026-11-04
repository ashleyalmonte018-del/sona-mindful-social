ALTER TABLE public.user_posts
  ADD COLUMN IF NOT EXISTS is_shareable boolean NOT NULL DEFAULT true;

