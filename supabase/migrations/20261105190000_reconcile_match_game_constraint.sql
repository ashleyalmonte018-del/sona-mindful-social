-- Repair databases where the original match constraint is still active.
alter table public.match_sessions drop constraint if exists match_sessions_game_check;
update public.match_sessions set game = 'ttt' where game = 'tic-tac-toe';
alter table public.match_sessions add constraint match_sessions_game_check check (game in ('ttt', 'rps', 'oe', 'dots'));
notify pgrst, 'reload schema';
