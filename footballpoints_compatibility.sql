-- Run after footballpoints_upgrade.sql.
do $$ begin
  if to_regclass('public.players') is not null then
    create unique index if not exists players_external_player_id_uq on public.players(external_player_id) where external_player_id is not null;
  end if;
  if to_regclass('public.fixtures') is not null then
    alter table public.fixtures add column if not exists external_id text;
    create unique index if not exists fixtures_external_id_uq on public.fixtures(external_id) where external_id is not null;
  end if;
end $$;
