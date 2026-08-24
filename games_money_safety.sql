-- BetSquad real-money game safety upgrade.
-- Apply after games_room_reliability.sql.
-- Stakes are debited atomically, refunded for unfinished rooms, and paid once to winners.

create table if not exists public.game_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.game_rooms(id) on delete set null,
  kind text not null check (kind in ('game_stake','game_refund','game_prize')),
  amount numeric(14,2) not null check (amount >= 0),
  reference text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists game_wallet_transactions_user_idx
  on public.game_wallet_transactions(user_id, created_at desc);
create index if not exists game_wallet_transactions_room_idx
  on public.game_wallet_transactions(room_id, created_at desc);

alter table public.game_wallet_transactions enable row level security;
drop policy if exists game_wallet_transactions_owner_read on public.game_wallet_transactions;
create policy game_wallet_transactions_owner_read
  on public.game_wallet_transactions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.game_debit_stake(p_amount numeric)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare me uuid := auth.uid(); updated_count integer;
begin
  if me is null then raise exception 'You must be signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid stake'; end if;

  update public.game_wallets
     set cash_balance = cash_balance - p_amount,
         updated_at = now()
   where user_id = me and cash_balance >= p_amount;
  get diagnostics updated_count = row_count;
  if updated_count <> 1 then return false; end if;
  return true;
end;
$$;
grant execute on function public.game_debit_stake(numeric) to authenticated;

create or replace function public.game_refund_stake(p_room_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare me uuid := auth.uid(); r public.game_rooms%rowtype; p record; refunded numeric := 0;
begin
  if me is null then raise exception 'You must be signed in'; end if;
  select * into r from public.game_rooms where id = p_room_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','room_not_found'); end if;
  if not exists(select 1 from public.game_room_players where room_id=p_room_id and user_id=me) then
    return jsonb_build_object('ok',false,'reason','not_a_participant');
  end if;
  if r.status = 'finished' then return jsonb_build_object('ok',false,'reason','already_finished'); end if;

  for p in select user_id, coalesce(stake_amount,r.stake) as amount
           from public.game_room_players
          where room_id=p_room_id and user_id is not null
  loop
    if not exists(select 1 from public.game_wallet_transactions where reference='refund:'||p_room_id::text||':'||p.user_id::text) then
      update public.game_wallets set cash_balance=cash_balance+p.amount,updated_at=now() where user_id=p.user_id;
      insert into public.game_wallet_transactions(user_id,room_id,kind,amount,reference)
      values(p.user_id,p_room_id,'game_refund',p.amount,'refund:'||p_room_id::text||':'||p.user_id::text);
      refunded := refunded + p.amount;
    end if;
  end loop;

  update public.game_room_players set result='refunded', prize=coalesce(stake_amount,r.stake) where room_id=p_room_id and user_id is not null;
  update public.game_rooms set status='cancelled', finished_at=now() where id=p_room_id;
  return jsonb_build_object('ok',true,'refunded',refunded);
end;
$$;
grant execute on function public.game_refund_stake(uuid) to authenticated;

create or replace function public.game_settle_room(p_room_id uuid, p_winner_ids uuid[])
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  r public.game_rooms%rowtype;
  me uuid := auth.uid();
  total_stake numeric := 0;
  prize numeric := 0;
  winner uuid;
  already boolean;
begin
  if me is null then raise exception 'You must be signed in'; end if;
  select * into r from public.game_rooms where id=p_room_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','room_not_found'); end if;
  if not exists(select 1 from public.game_room_players where room_id=p_room_id and user_id=me) then
    return jsonb_build_object('ok',false,'reason','not_a_participant');
  end if;
  if r.status='finished' then return jsonb_build_object('ok',false,'reason','already_settled'); end if;
  if r.status='cancelled' then return jsonb_build_object('ok',false,'reason','cancelled'); end if;

  select coalesce(sum(coalesce(stake_amount,r.stake)),0) into total_stake
    from public.game_room_players
   where room_id=p_room_id and user_id is not null;
  prize := total_stake;
  winner := case when p_winner_ids is not null and array_length(p_winner_ids,1) >= 1 then p_winner_ids[1] else null end;

  if winner is not null then
    select exists(select 1 from public.game_room_players where room_id=p_room_id and user_id=winner) into already;
    if not already then return jsonb_build_object('ok',false,'reason','winner_not_in_room'); end if;
    if not exists(select 1 from public.game_wallet_transactions where reference='prize:'||p_room_id::text||':'||winner::text) then
      insert into public.game_wallet_transactions(user_id,room_id,kind,amount,reference)
      values(winner,p_room_id,'game_prize',prize,'prize:'||p_room_id::text||':'||winner::text);
      update public.game_wallets set cash_balance=cash_balance+prize,updated_at=now() where user_id=winner;
    end if;
    update public.game_room_players set result=case when user_id=winner then 'winner' else 'loser' end,
      prize=case when user_id=winner then prize else 0 end where room_id=p_room_id and user_id is not null;
  end if;

  update public.game_rooms set status='finished',finished_at=now() where id=p_room_id;
  return jsonb_build_object('ok',true,'prize_pool',prize,'winner',winner);
end;
$function$;
grant execute on function public.game_settle_room(uuid,uuid[]) to authenticated;
