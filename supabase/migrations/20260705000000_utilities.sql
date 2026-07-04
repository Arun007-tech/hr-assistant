-- Utilities expansion: drop unused clip_settings, talent pool flag,
-- persisted reference-check questions, per-status SLA settings.

drop table if exists clip_settings;

alter table candidates add column if not exists talent_pool boolean not null default false;
alter table candidates add column if not exists reference_questions jsonb;

create table if not exists app_settings (
  id smallint primary key default 1 check (id = 1),
  sla_days jsonb not null default '{"sourced":7,"screening":7}',
  created_at timestamptz not null default now()
);
alter table app_settings enable row level security;
