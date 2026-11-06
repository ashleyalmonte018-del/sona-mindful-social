-- Final, repeat-safe repair for Circle multiplayer games.
-- This is intentionally self-contained because older previews may have only
-- applied part of the earlier game migrations.

create table if not exists public.match_sessions (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  host_id uuid not null,
  guest_id uuid,
  state jsonb not null default '{}'::jsonb,
  status text not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.match_sessions drop constraint if exists match_sessions_game_check;
alter table public.match_sessions drop constraint if exists match_sessions_status_check;
update public.match_sessions set game = 'ttt' where game = 'tic-tac-toe';
update public.match_sessions set status = 'waiting' where status is null;
alter table public.match_sessions add constraint match_sessions_game_check check (game in ('ttt', 'rps', 'oe', 'dots'));
alter table public.match_sessions add constraint match_sessions_status_check check (status in ('waiting', 'active', 'finished', 'cancelled'));

grant select, insert, update on public.match_sessions to authenticated;
alter table public.match_sessions enable row level security;

drop policy if exists "Match participants read" on public.match_sessions;
create policy "Match participants read" on public.match_sessions
  for select to authenticated
  using (auth.uid() = host_id or auth.uid() = guest_id);

drop policy if exists "Circle members create matches" on public.match_sessions;
create policy "Circle members create matches" on public.match_sessions
  for insert to authenticated
  with check (auth.uid() = host_id and guest_id is not null and public.are_friends(host_id, guest_id));

drop policy if exists "Match participants update" on public.match_sessions;
create policy "Match participants update" on public.match_sessions
  for update to authenticated
  using (auth.uid() = host_id or auth.uid() = guest_id)
  with check (auth.uid() = host_id or auth.uid() = guest_id);

create index if not exists match_sessions_guest_status_idx
  on public.match_sessions (guest_id, status, created_at desc);

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
create policy "Players can read their game results" on public.game_results
  for select to authenticated
  using (auth.uid() = player_a_id or auth.uid() = player_b_id);

drop policy if exists "Players can record their game results" on public.game_results;
create policy "Players can record their game results" on public.game_results
  for insert to authenticated
  with check (
    (auth.uid() = player_a_id or auth.uid() = player_b_id)
    and public.are_friends(player_a_id, player_b_id)
  );

create unique index if not exists game_results_match_id_key
  on public.game_results (match_id);
create index if not exists game_results_player_idx
  on public.game_results (player_a_id, player_b_id, created_at desc);

do $$ begin
  alter publication supabase_realtime add table public.match_sessions;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
