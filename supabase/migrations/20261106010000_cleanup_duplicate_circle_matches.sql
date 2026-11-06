-- Clean up duplicate active/waiting matches created before the uniqueness
-- guard was installed. Keep the oldest match, and hide invitations for the
-- cancelled duplicates so nobody is left with an empty invitation.
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
  select distinct id
  from ranked
  where position > 1
)
update public.match_sessions
set status = 'cancelled', updated_at = now()
where id in (select id from duplicates);

update public.notifications
set read_at = coalesce(read_at, now())
where kind = 'game_invite'
  and match_id in (
    select id from public.match_sessions where status = 'cancelled'
  );

notify pgrst, 'reload schema';
