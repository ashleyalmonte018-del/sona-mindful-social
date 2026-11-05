-- Online Sona games. This mirrors the Drizzle migration so Lovable/Supabase
-- projects that use the standard Supabase migration directory receive it too.
create table if not exists public.match_sessions (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('tic-tac-toe', 'rps')),
  host_id uuid not null,
  guest_id uuid,
  state jsonb not null default '{}'::jsonb,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.match_sessions to authenticated;
alter table public.match_sessions enable row level security;
drop policy if exists "Match participants read" on public.match_sessions;
create policy "Match participants read" on public.match_sessions for select to authenticated using (auth.uid() = host_id or auth.uid() = guest_id);
drop policy if exists "Circle members create matches" on public.match_sessions;
create policy "Circle members create matches" on public.match_sessions for insert to authenticated with check (auth.uid() = host_id and (guest_id is null or public.are_friends(host_id, guest_id)));
drop policy if exists "Match participants update" on public.match_sessions;
create policy "Match participants update" on public.match_sessions for update to authenticated using (auth.uid() = host_id or auth.uid() = guest_id);
do $$ begin
  alter publication supabase_realtime add table public.match_sessions;
exception when duplicate_object then null;
end $$;
notify pgrst, 'reload schema';
