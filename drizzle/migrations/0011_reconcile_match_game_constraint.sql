ALTER TABLE public.match_sessions DROP CONSTRAINT IF EXISTS match_sessions_game_check;
UPDATE public.match_sessions SET game = 'ttt' WHERE game = 'tic-tac-toe';
ALTER TABLE public.match_sessions ADD CONSTRAINT match_sessions_game_check CHECK (game IN ('ttt', 'rps', 'oe', 'dots'));
