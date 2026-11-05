-- Repair a partially applied Circle game migration.
alter table public.match_sessions drop constraint if exists match_sessions_game_check;
update public.match_sessions set game = 'ttt' where game = 'tic-tac-toe';
alter table public.match_sessions add constraint match_sessions_game_check check (game in ('ttt', 'rps', 'oe', 'dots'));

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('ttt', 'rps', 'oe', 'dots')),
  winner_id uuid,
  loser_id uuid,
  player_a_id uuid not null,
  player_b_id uuid not null,
  match_id uuid references public.match_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert on public.game_results to authenticated;
alter table public.game_results enable row level security;
drop policy if exists "Players can read their game results" on public.game_results;
create policy "Players can read their game results" on public.game_results for select to authenticated using (auth.uid() = player_a_id or auth.uid() = player_b_id);
drop policy if exists "Players can record their game results" on public.game_results;
create policy "Players can record their game results" on public.game_results for insert to authenticated with check ((auth.uid() = player_a_id or auth.uid() = player_b_id) and public.are_friends(player_a_id, player_b_id));
create index if not exists game_results_player_idx on public.game_results (player_a_id, player_b_id, created_at desc);
create unique index if not exists game_results_match_id_key on public.game_results (match_id);
notify pgrst, 'reload schema';
