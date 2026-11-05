-- Keep a private, persistent notification when a turn-based match becomes yours.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  kind text not null check (kind in ('game_turn')),
  title text not null,
  body text not null,
  match_id uuid references public.match_sessions(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, update on public.notifications to authenticated;
alter table public.notifications enable row level security;

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications" on public.notifications for select to authenticated using (auth.uid() = recipient_id);
drop policy if exists "Users can mark their notifications read" on public.notifications;
create policy "Users can mark their notifications read" on public.notifications for update to authenticated using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

create index if not exists notifications_recipient_unread_idx on public.notifications (recipient_id, created_at desc) where read_at is null;

create or replace function public.notify_game_turn()
returns trigger language plpgsql security definer set search_path = public
as $$
declare next_player uuid;
begin
  next_player := nullif(new.state->>'turn', '')::uuid;
  if new.status = 'active' and next_player is not null and old.state->>'turn' is distinct from new.state->>'turn' then
    insert into public.notifications (recipient_id, kind, title, body, match_id)
    values (next_player, 'game_turn', 'It is your turn', 'Your Circle game is waiting for you.', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists match_turn_notification on public.match_sessions;
create trigger match_turn_notification after update of state, status on public.match_sessions for each row execute function public.notify_game_turn();

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
