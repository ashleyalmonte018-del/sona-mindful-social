-- A match has one shared result, even though both players may finish it at nearly the same time.
create unique index if not exists game_results_match_id_key on public.game_results (match_id);
notify pgrst, 'reload schema';
