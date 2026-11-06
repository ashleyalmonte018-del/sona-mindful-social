-- Allow the inviter to resend the notification for the existing waiting
-- match without creating another match or duplicate notification.
create or replace function public.send_game_invite_notification(_match_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare recipient uuid;
begin
  select guest_id into recipient
  from public.match_sessions
  where id = _match_id
    and host_id = auth.uid()
    and status = 'waiting';

  if recipient is null then
    return false;
  end if;

  insert into public.notifications (recipient_id, kind, title, body, match_id)
  values (
    recipient,
    'game_invite',
    'New Circle game invitation',
    'Someone in your Circle invited you to a game match.',
    _match_id
  )
  on conflict (match_id, kind) where kind = 'game_invite' and match_id is not null do update
    set read_at = null, created_at = now();

  return true;
end;
$$;

grant execute on function public.send_game_invite_notification(uuid) to authenticated;
notify pgrst, 'reload schema';
