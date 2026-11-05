-- Patch 1 follow-up: a sender chooses the Circle opponent; no match code is needed.
DROP POLICY IF EXISTS "Circle members create matches" ON public.match_sessions;
CREATE POLICY "Circle members create matches" ON public.match_sessions FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = host_id AND (guest_id IS NULL OR public.are_friends(host_id, guest_id))
);
