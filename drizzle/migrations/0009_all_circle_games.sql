ALTER TABLE public.match_sessions DROP CONSTRAINT IF EXISTS match_sessions_game_check;
UPDATE public.match_sessions SET game = 'ttt' WHERE game = 'tic-tac-toe';
ALTER TABLE public.match_sessions ADD CONSTRAINT match_sessions_game_check CHECK (game IN ('ttt', 'rps', 'oe', 'dots'));
CREATE TABLE IF NOT EXISTS public.game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL CHECK (game IN ('ttt', 'rps', 'oe', 'dots')),
  winner_id uuid,
  loser_id uuid,
  player_a_id uuid NOT NULL,
  player_b_id uuid NOT NULL,
  match_id uuid REFERENCES public.match_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.game_results TO authenticated;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players can read their game results" ON public.game_results;
CREATE POLICY "Players can read their game results" ON public.game_results FOR SELECT TO authenticated USING (auth.uid() = player_a_id OR auth.uid() = player_b_id);
DROP POLICY IF EXISTS "Players can record their game results" ON public.game_results;
CREATE POLICY "Players can record their game results" ON public.game_results FOR INSERT TO authenticated WITH CHECK ((auth.uid() = player_a_id OR auth.uid() = player_b_id) AND public.are_friends(player_a_id, player_b_id));
