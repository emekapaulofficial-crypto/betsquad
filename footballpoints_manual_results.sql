-- FootballPoints manual results + withdrawal limits
-- Applied to the connected Supabase project.
-- Rules: admin may save at most 5 match outcomes per UTC day; each user may request at most 4 withdrawals per UTC day.

create table if not exists public.fp_result_uploads (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  source text not null default 'manual',
  file_name text,
  created_at timestamptz not null default now()
);
create index if not exists fp_result_uploads_created_idx on public.fp_result_uploads(created_at desc);
alter table public.fp_result_uploads enable row level security;
drop policy if exists fp_result_uploads_admin_read on public.fp_result_uploads;
create policy fp_result_uploads_admin_read on public.fp_result_uploads for select to authenticated using (public.is_admin());
revoke all on table public.fp_result_uploads from anon, authenticated;
grant select on table public.fp_result_uploads to authenticated;

-- The production function is installed by the Supabase migration with the same name.
-- It verifies admin access, enforces the 5/day limit, saves the final result and player stats,
-- refreshes entry fixture points, and recalculates entry totals.
-- The withdrawal RPC is also replaced in the migration to enforce the 4/day limit.
