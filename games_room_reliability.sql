-- BetSquad game-room reliability migration.
-- Apply this migration to Supabase before using Whot, Dice or Snooker.
create unique index if not exists game_room_players_user_room_uidx on public.game_room_players(room_id,user_id) where user_id is not null;
create index if not exists game_rooms_waiting_type_created_idx on public.game_rooms(game_type,status,created_at);
create index if not exists game_room_players_room_idx on public.game_room_players(room_id,joined_at);

create or replace function public.game_settle_room(p_room_id uuid, p_winner_ids uuid[])
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare r public.game_rooms%rowtype; me uuid:=auth.uid(); player_count integer; total_stake numeric; admin_fee numeric; prize_pool numeric; w1 numeric; w2 numeric;
begin
  if me is null then raise exception 'You must be signed in'; end if;
  select * into r from public.game_rooms where id=p_room_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','room_not_found'); end if;
  if r.status='finished' then return jsonb_build_object('ok',false,'reason','already_settled'); end if;
  if not exists(select 1 from public.game_room_players where room_id=p_room_id and user_id=me) then return jsonb_build_object('ok',false,'reason','not_a_participant'); end if;
  select count(*) into player_count from public.game_room_players where room_id=p_room_id and user_id is not null;
  total_stake:=player_count*r.stake;
  admin_fee:=round(total_stake*0.10,2);
  prize_pool:=greatest(total_stake-admin_fee,0);
  w1:=round(prize_pool*0.65,2);
  w2:=round(prize_pool-w1,2);
  if p_winner_ids is not null and array_length(p_winner_ids,1)>=1 and p_winner_ids[1] is not null then
    update public.game_wallets set cash_balance=cash_balance+w1,updated_at=now() where user_id=p_winner_ids[1];
    update public.game_room_players set result='winner',prize=w1 where room_id=p_room_id and user_id=p_winner_ids[1];
  end if;
  if p_winner_ids is not null and array_length(p_winner_ids,1)>=2 and p_winner_ids[2] is not null then
    update public.game_wallets set cash_balance=cash_balance+w2,updated_at=now() where user_id=p_winner_ids[2];
    update public.game_room_players set result='runner_up',prize=w2 where room_id=p_room_id and user_id=p_winner_ids[2];
  end if;
  update public.game_rooms set status='finished',finished_at=now() where id=p_room_id;
  return jsonb_build_object('ok',true,'prize_pool',prize_pool,'first',w1,'second',w2);
end;
$function$;
