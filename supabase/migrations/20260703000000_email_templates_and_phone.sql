create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  greeting text not null default '',
  signature text not null default '',
  created_at timestamptz not null default now()
);
alter table email_templates enable row level security;

alter table candidates add column if not exists phone text;
