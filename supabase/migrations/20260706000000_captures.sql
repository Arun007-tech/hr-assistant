-- Quick capture inbox: anything dictated or pasted through the global
-- capture button gets classified (todo/note) and lands here. Optionally
-- linked to a candidate/job when the AI recognizes one by name.

create table if not exists captures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('todo', 'note')),
  text text not null,
  candidate_id uuid references candidates(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  done boolean not null default false
);

create index if not exists captures_done_idx on captures (done, created_at desc);

alter table captures enable row level security;
