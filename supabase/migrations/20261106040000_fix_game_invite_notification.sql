-- Make the "Notify friend" action reliable for waiting Circle matches.
-- Keep this as a forward-only repair so already-published Lovable history is
-- not rewritten.
-- This repair is intentionally self-contained because Lovable's SQL editor
-- may be used to apply only this file to an existing project.
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

create unique index if not exists notifications_one_game_invite_key
  on public.notifications (match_id, kind)
  where kind = 'game_invite' and match_id is not null;

create or replace function public.send_game_invite_notification(_match_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  select case when m.host_id = auth.uid() then m.guest_id else m.host_id end
    into recipient
  from public.match_sessions m
  where m.id = _match_id
    and (m.host_id = auth.uid() or m.guest_id = auth.uid())
    and m.status = 'waiting'
    and m.guest_id is not null
    and public.are_friends(m.host_id, m.guest_id);

  if recipient is null then
    return false;
  end if;

  -- Upsert instead of inserting a second row: a resend should make the
  -- existing invite visible again and deliver it through Realtime.
  insert into public.notifications (recipient_id, kind, title, body, match_id)
  values (
    recipient,
    'game_invite',
    'New Circle game invitation',
    'Someone in your Circle invited you to a game match.',
    _match_id
  )
  on conflict (match_id, kind) where kind = 'game_invite' and match_id is not null
  do update set recipient_id = excluded.recipient_id,
                read_at = null,
                created_at = now();

  return true;
end;
$$;

grant execute on function public.send_game_invite_notification(uuid) to authenticated;

-- Keep the browser flow recoverable while PostgREST catches up with the
-- function definition. This policy is just as restrictive as the function:
-- only a participant in a waiting match can notify the other participant.
grant insert on public.notifications to authenticated;
drop policy if exists "Participants can send game invite notifications" on public.notifications;
create policy "Participants can send game invite notifications"
  on public.notifications for insert to authenticated
  with check (
    kind = 'game_invite'
    and public.notifications.match_id is not null
    and exists (
      select 1
      from public.match_sessions m
      where m.id = public.notifications.match_id
        and m.status = 'waiting'
        and (m.host_id = auth.uid() or m.guest_id = auth.uid())
        and public.are_friends(m.host_id, m.guest_id)
        and public.notifications.recipient_id = case
          when m.host_id = auth.uid() then m.guest_id
          else m.host_id
        end
    )
  );

notify pgrst, 'reload schema';
