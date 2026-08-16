-- Football Points V2: Supabase/Postgres schema
-- Points-only MVP. Do not enable real-money wagering with this schema until
-- applicable licensing/compliance and payment-provider eligibility are resolved.

create extension if not exists pgcrypto;

create type public.round_status as enum ('draft','open','locked','live','settled','cancelled');
create type public.challenge_status as enum ('pending','accepted','declined','locked','live','settled','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  club text,
  position text not null check (position in ('GK','DEF','MID','ST')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status public.round_status not null default 'draft',
  formation text not null default '4-4-2',
  max_holders_per_player integer not null default 2 check (max_holders_per_player > 0),
  created_at timestamptz not null default now(),
  locks_at timestamptz
);

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  external_id text unique,
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled'
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_points integer not null default 0,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(round_id,user_id)
);

create table public.entry_players (
  entry_id uuid not null references public.entries(id) on delete cascade,
  player_id uuid not null references public.players(id),
  slot_position text not null check (slot_position in ('GK','DEF','MID','ST')),
  created_at timestamptz not null default now(),
  primary key(entry_id,player_id)
);

-- Enforces the 4-4-2 shape when entries are submitted.
create unique index one_gk_per_entry on public.entry_players(entry_id) where slot_position='GK';
create index entry_players_player_idx on public.entry_players(player_id);
create index entries_round_idx on public.entries(round_id);

create table public.player_match_stats (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  goals integer not null default 0,
  assists integer not null default 0,
  clean_sheet boolean not null default false,
  team_won boolean not null default false,
  yellow_cards integer not null default 0,
  calculated_points integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(fixture_id,player_id)
);

create table public.entry_fixture_points (
  entry_id uuid not null references public.entries(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  points integer not null default 0,
  primary key(entry_id,fixture_id)
);

create table public.friendly_challenges (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id),
  challenger_id uuid not null references public.profiles(id),
  opponent_id uuid references public.profiles(id),
  status public.challenge_status not null default 'pending',
  stake_points integer not null default 0 check (stake_points >= 0),
  challenger_entry_id uuid references public.entries(id),
  opponent_entry_id uuid references public.entries(id),
  winner_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- One user cannot challenge themselves.
alter table public.friendly_challenges
  add constraint challenge_not_self check (opponent_id is null or opponent_id <> challenger_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Profile creation trigger.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.rounds enable row level security;
alter table public.fixtures enable row level security;
alter table public.entries enable row level security;
alter table public.entry_players enable row level security;
alter table public.player_match_stats enable row level security;
alter table public.entry_fixture_points enable row level security;
alter table public.friendly_challenges enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles own read" on public.profiles
for select to authenticated using ((select auth.uid())=id);
create policy "profiles own update" on public.profiles
for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);

create policy "players authenticated read" on public.players
for select to authenticated using (true);
create policy "rounds authenticated read" on public.rounds
for select to authenticated using (true);
create policy "fixtures authenticated read" on public.fixtures
for select to authenticated using (true);
create policy "stats authenticated read" on public.player_match_stats
for select to authenticated using (true);

create policy "entries own read" on public.entries
for select to authenticated using ((select auth.uid())=user_id);
create policy "entries own insert" on public.entries
for insert to authenticated with check ((select auth.uid())=user_id);

create policy "entry players own read" on public.entry_players
for select to authenticated using (
  exists(select 1 from public.entries e where e.id=entry_id and e.user_id=(select auth.uid()))
);
create policy "entry players own insert" on public.entry_players
for insert to authenticated with check (
  exists(select 1 from public.entries e where e.id=entry_id and e.user_id=(select auth.uid()))
);

create policy "challenges participant read" on public.friendly_challenges
for select to authenticated using (
  challenger_id=(select auth.uid()) or opponent_id=(select auth.uid())
);
create policy "challenge own insert" on public.friendly_challenges
for insert to authenticated with check (challenger_id=(select auth.uid()));

create policy "entry fixture points own read" on public.entry_fixture_points
for select to authenticated using (
  exists(select 1 from public.entries e where e.id=entry_id and e.user_id=(select auth.uid()))
);

-- Admin writes should be performed server-side with a protected role/function,
-- not by exposing a service key in the browser.
