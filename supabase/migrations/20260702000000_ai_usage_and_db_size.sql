-- HR Assistant — usage tracking (ai_usage table) and DB size RPC.

create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null,
  status text not null check (status in ('ok', 'error')),
  duration_ms int not null
);
create index if not exists ai_usage_created_at_idx on ai_usage (created_at desc);
alter table ai_usage enable row level security;

create or replace function db_size_bytes()
returns bigint
language sql
security definer
set search_path = public
as $$
  select pg_database_size(current_database());
$$;
