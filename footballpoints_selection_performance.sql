-- FootballPoints selection + performance rules
-- Applied to the connected Supabase project as migration:
-- footballpoints_selection_and_performance_rules
-- footballpoints_room_team_rules_v2
--
-- Rules:
-- * Same player cannot be submitted twice in one entry.
-- * League/1v1 teams contain 7 different players.
-- * max_holders_per_player defaults to 2, so at most two entrants can share a player.
-- * Room teams contain 4 different players and the database limits a player to two room users.
-- * Match selection uses fixture-specific starting XI rows only.
-- * Performance points come from verified match stats; draws do not receive a fake winner bonus.

create unique index if not exists entry_players_entry_player_unique
  on public.entry_players(entry_id, player_id);

alter table public.rounds
  alter column max_holders_per_player set default 2;

create table if not exists public.fp_fixture_lineups (
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  is_starting boolean not null default true,
  source text not null default 'manual_document',
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (fixture_id, player_id)
);

create table if not exists public.fp_player_match_stats (
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  minutes integer not null default 0,
  goals integer not null default 0,
  assists integer not null default 0,
  clean_sheet boolean not null default false,
  team_win boolean not null default false,
  yellow_cards integer not null default 0,
  red_cards integer not null default 0,
  performance_rating numeric(4,2),
  performance_points integer not null default 0,
  source text not null default 'manual_document',
  updated_at timestamptz not null default now(),
  primary key (fixture_id, player_id)
);

create table if not exists public.room_entries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.match_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(room_id, user_id)
);

create table if not exists public.room_entry_players (
  entry_id uuid not null references public.room_entries(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  slot_position text,
  created_at timestamptz not null default now(),
  primary key(entry_id, player_id)
);

create or replace function public.fp_calculate_player_points(
  p_goals integer,
  p_assists integer,
  p_clean_sheet boolean,
  p_team_win boolean,
  p_yellow_cards integer,
  p_red_cards integer,
  p_performance_points integer default 0
) returns integer
language sql immutable as $$
  select coalesce(p_goals,0) * 5
       + coalesce(p_assists,0) * 3
       + case when coalesce(p_clean_sheet,false) then 4 else 0 end
       + case when coalesce(p_team_win,false) then 2 else 0 end
       - coalesce(p_yellow_cards,0)
       - coalesce(p_red_cards,0) * 3
       + coalesce(p_performance_points,0);
$$;
