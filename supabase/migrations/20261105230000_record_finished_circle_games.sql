-- Record a finished match on the server so leaving the dialog immediately
-- cannot prevent the result from appearing in Circle history.
create or replace function public.record_finished_circle_game()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  result_value text;
  winner_value uuid;
  loser_value uuid;
begin
  if new.status <> 'finished' or old.status = 'finished' or new.guest_id is null then
    return new;
  end if;

  result_value := new.state->>'result';
  if result_value is null then
    return new;
  end if;

  if result_value = 'draw' then
    winner_value := null;
    loser_value := null;
  elsif result_value = new.host_id::text then
    winner_value := new.host_id;
    loser_value := new.guest_id;
  elsif result_value = new.guest_id::text then
    winner_value := new.guest_id;
    loser_value := new.host_id;
  else
    return new;
  end if;

  insert into public.game_results (game, winner_id, loser_id, player_a_id, player_b_id, match_id)
  values (new.game, winner_value, loser_value, new.host_id, new.guest_id, new.id)
  on conflict (match_id) do nothing;

  return new;
end;
$$;

drop trigger if exists record_finished_circle_game on public.match_sessions;
create trigger record_finished_circle_game
after update of state, status on public.match_sessions
for each row execute function public.record_finished_circle_game();

notify pgrst, 'reload schema';
