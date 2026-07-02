-- HR Assistant — initial schema (jobs, candidates).

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  jd_text text not null,
  ideal_profile jsonb,
  boolean_searches jsonb,
  created_at timestamptz not null default now()
);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  name text not null,
  source text not null default 'linkedin'
    check (source in ('linkedin', 'naukri', 'apna', 'other')),
  resume_text text,
  ai_analysis jsonb,
  score int,
  screening_questions jsonb,
  status text not null default 'sourced'
    check (status in ('sourced', 'screening', 'shortlisted', 'rejected')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists candidates_job_id_idx on candidates (job_id);

-- All access goes through the app's server routes using the service-role key.
-- RLS is enabled with no policies so the anon key grants nothing.
alter table jobs enable row level security;
alter table candidates enable row level security;
