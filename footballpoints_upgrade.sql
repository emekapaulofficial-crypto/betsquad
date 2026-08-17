-- FootballPoints multi-league / robot / security / support upgrade
-- Run this file in Supabase SQL Editor before enabling the new GitHub workflows.

create extension if not exists pgcrypto;

create table if not exists public.fp_leagues (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'api-football',
  provider_league_id integer not null,
  name text not null,
  country text,
  logo_url text,
  season integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_league_id, season)
);

create table if not exists public.fp_teams (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'api-football',
  provider_team_id integer not null,
  name text not null,
  country text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_team_id)
);

create table if not exists public.fp_players (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'api-football',
  provider_player_id integer not null,
  team_id uuid references public.fp_teams(id) on delete set null,
  name text not null,
  position text,
  number integer,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_player_id, team_id)
);

create table if not exists public.fp_fixtures (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'api-football',
  provider_fixture_id integer not null unique,
  league_id uuid references public.fp_leagues(id) on delete set null,
  home_team_id uuid references public.fp_teams(id) on delete set null,
  away_team_id uuid references public.fp_teams(id) on delete set null,
  kickoff_at timestamptz not null,
  status_code text not null,
  status_label text,
  home_score integer,
  away_score integer,
  venue text,
  last_provider_update timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fp_fixtures_kickoff_idx on public.fp_fixtures(kickoff_at);
create index if not exists fp_fixtures_status_idx on public.fp_fixtures(status_code);
create index if not exists fp_fixtures_league_idx on public.fp_fixtures(league_id);
create index if not exists fp_players_team_idx on public.fp_players(team_id);

create table if not exists public.fp_robot_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  ok boolean not null,
  message text,
  attempts integer not null default 1,
  fixtures_seen integer not null default 0,
  fixtures_changed integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists fp_robot_runs_created_idx on public.fp_robot_runs(created_at desc);

create table if not exists public.fp_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists fp_security_events_user_idx on public.fp_security_events(user_id, created_at desc);
create index if not exists fp_security_events_type_idx on public.fp_security_events(event_type, created_at desc);

create table if not exists public.fp_support_escalations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null,
  subject text not null,
  message text not null,
  status text not null default 'open' check(status in ('open','pending','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe compatibility columns for the existing application tables, when present.
do $$ begin
  if to_regclass('public.players') is not null then
    alter table public.players add column if not exists photo_url text;
    alter table public.players add column if not exists external_player_id integer;
    alter table public.players add column if not exists team_provider_id integer;
  end if;
  if to_regclass('public.fixtures') is not null then
    alter table public.fixtures add column if not exists league_name text;
    alter table public.fixtures add column if not exists league_provider_id integer;
    alter table public.fixtures add column if not exists league_logo_url text;
    alter table public.fixtures add column if not exists home_team_provider_id integer;
    alter table public.fixtures add column if not exists away_team_provider_id integer;
    alter table public.fixtures add column if not exists status_code text;
    alter table public.fixtures add column if not exists status_detail text;
    alter table public.fixtures add column if not exists last_synced_at timestamptz;
  end if;
end $$;

-- Public football data is read-only to normal users. Robot writes use service_role.
alter table public.fp_leagues enable row level security;
alter table public.fp_teams enable row level security;
alter table public.fp_players enable row level security;
alter table public.fp_fixtures enable row level security;
alter table public.fp_robot_runs enable row level security;
alter table public.fp_security_events enable row level security;
alter table public.fp_support_escalations enable row level security;

drop policy if exists fp_leagues_read on public.fp_leagues;
create policy fp_leagues_read on public.fp_leagues for select to anon, authenticated using(active = true);
drop policy if exists fp_teams_read on public.fp_teams;
create policy fp_teams_read on public.fp_teams for select to anon, authenticated using(true);
drop policy if exists fp_players_read on public.fp_players;
create policy fp_players_read on public.fp_players for select to anon, authenticated using(active = true);
drop policy if exists fp_fixtures_read on public.fp_fixtures;
create policy fp_fixtures_read on public.fp_fixtures for select to anon, authenticated using(true);

drop policy if exists fp_support_owner on public.fp_support_escalations;
create policy fp_support_owner on public.fp_support_escalations for insert to authenticated with check(user_id = auth.uid());

drop policy if exists fp_security_owner_read on public.fp_security_events;
create policy fp_security_owner_read on public.fp_security_events for select to authenticated using(user_id = auth.uid());

-- Admin protection helper. The existing project may already have is_admin().
create or replace function public.fp_is_admin() returns boolean
language sql security definer stable set search_path=public as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid() and active = true);
$$;
grant execute on function public.fp_is_admin() to authenticated;

-- Admins can read robot and security monitoring data.
drop policy if exists fp_robot_admin_read on public.fp_robot_runs;
create policy fp_robot_admin_read on public.fp_robot_runs for select to authenticated using(public.fp_is_admin());
drop policy if exists fp_security_admin_read on public.fp_security_events;
create policy fp_security_admin_read on public.fp_security_events for select to authenticated using(public.fp_is_admin());
drop policy if exists fp_support_admin_read on public.fp_support_escalations;
create policy fp_support_admin_read on public.fp_support_escalations for select to authenticated using(public.fp_is_admin());
drop policy if exists fp_support_admin_update on public.fp_support_escalations;
create policy fp_support_admin_update on public.fp_support_escalations for update to authenticated using(public.fp_is_admin()) with check(public.fp_is_admin());
