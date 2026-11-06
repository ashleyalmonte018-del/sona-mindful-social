-- Ensure every waiting Circle match creates one actionable notification.
-- This is intentionally idempotent so projects that missed the original
-- invitation migration can repair the feature safely.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  kind text not null,
  title text not null,
  body text not null,
  match_id uuid references public.match_sessions(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('game_invite', 'game_turn'));

grant select, update on public.notifications to authenticated;
alter table public.notifications enable row level security;

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "Users can mark their notifications read" on public.notifications;
create policy "Users can mark their notifications read"
  on public.notifications for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create unique index if not exists notifications_one_game_invite_key
  on public.notifications (match_id, kind)
  where kind = 'game_invite' and match_id is not null;

create or replace function public.notify_game_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'waiting' and new.guest_id is not null then
    insert into public.notifications (recipient_id, kind, title, body, match_id)
    values (
      new.guest_id,
      'game_invite',
      'New Circle game invitation',
      'Someone in your Circle invited you to a game match.',
      new.id
    )
    on conflict (match_id, kind) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists match_game_invite_notification on public.match_sessions;
create trigger match_game_invite_notification
after insert on public.match_sessions
for each row execute function public.notify_game_invite();

-- Recover notifications for invitations created before this repair ran.
insert into public.notifications (recipient_id, kind, title, body, match_id)
select m.guest_id,
  'game_invite',
  'New Circle game invitation',
  'Someone in your Circle invited you to a game match.',
  m.id
from public.match_sessions m
where m.status = 'waiting'
  and m.guest_id is not null
on conflict (match_id, kind) do nothing;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
