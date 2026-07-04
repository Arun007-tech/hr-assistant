-- Superseded: created for the (since removed) bookmarklet clip feature.
-- Kept so local migration history matches the live project; dropped again
-- in 20260705000000_utilities.sql.
create table if not exists clip_settings (
  id smallint primary key default 1 check (id = 1),
  token text not null,
  active_job_id uuid references jobs(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table clip_settings enable row level security;
