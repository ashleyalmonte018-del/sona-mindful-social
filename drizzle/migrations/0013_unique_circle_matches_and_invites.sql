-- Keep Circle invitations singular and prevent a user from joining more than
-- one waiting/active match for the same game.
with occupied as (
  select id, game, host_id as user_id, created_at
  from public.match_sessions
  where status in ('waiting', 'active') and guest_id is not null
  union all
  select id, game, guest_id as user_id, created_at
  from public.match_sessions
  where status in ('waiting', 'active') and guest_id is not null
), ranked as (
  select id,
    row_number() over (partition by game, user_id order by created_at, id) as position
  from occupied
), duplicates as (
  select distinct id from ranked where position > 1
)
update public.match_sessions
set status = 'cancelled', updated_at = now()
where id in (select id from duplicates);

create unique index if not exists match_sessions_one_host_game_key
  on public.match_sessions (game, host_id)
  where status in ('waiting', 'active');
create unique index if not exists match_sessions_one_guest_game_key
  on public.match_sessions (game, guest_id)
  where status in ('waiting', 'active') and guest_id is not null;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('game_invite', 'game_turn'));
create unique index if not exists notifications_one_game_invite_key
  on public.notifications (match_id, kind)
  where kind = 'game_invite' and match_id is not null;

create or replace function public.notify_game_invite()
returns trigger language plpgsql security definer set search_path = public
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
    on conflict (match_id, kind) where kind = 'game_invite' do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists match_game_invite_notification on public.match_sessions;
create trigger match_game_invite_notification after insert on public.match_sessions
for each row execute function public.notify_game_invite();
