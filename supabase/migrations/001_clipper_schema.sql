-- Clipper metadata schema (Auth + DB only; media stays on local disk)
-- Apply with Supabase CLI or SQL editor.

create extension if not exists "pgcrypto";

-- Profiles mirror auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('upload', 'youtube')),
  title text not null,
  local_path text,
  youtube_url text,
  duration_ms integer,
  created_at timestamptz not null default now(),
  constraint sources_upload_path check (
    kind <> 'upload' or local_path is not null
  ),
  constraint sources_youtube_url check (
    kind <> 'youtube' or youtube_url is not null
  )
);

create index if not exists sources_user_id_idx on public.sources (user_id);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  status text not null default 'queued'
    check (status in (
      'queued', 'fetching', 'cutting', 'transcribing',
      'burning', 'packing', 'ready', 'failed'
    )),
  framing text not null default '9:16'
    check (framing in ('9:16', '16:9', '1:1')),
  caption_style text not null default 'default',
  language text not null default 'en'
    check (language in ('en', 'fil')),
  progress_pct integer not null default 0
    check (progress_pct >= 0 and progress_pct <= 100),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_user_id_idx on public.jobs (user_id);
create index if not exists jobs_source_id_idx on public.jobs (source_id);

create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  idx integer not null default 0,
  in_ms integer not null check (in_ms >= 0),
  out_ms integer not null check (out_ms > in_ms),
  export_path text,
  unique (job_id, idx)
);

create index if not exists scenes_job_id_idx on public.scenes (job_id);

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  scene_id uuid not null references public.scenes (id) on delete cascade,
  local_path text not null,
  bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists exports_job_id_idx on public.exports (job_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.jobs enable row level security;
alter table public.scenes enable row level security;
alter table public.exports enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "sources_all_own" on public.sources;
create policy "sources_all_own" on public.sources
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "jobs_all_own" on public.jobs;
create policy "jobs_all_own" on public.jobs
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "scenes_via_job" on public.scenes;
create policy "scenes_via_job" on public.scenes
  for all using (
    exists (
      select 1 from public.jobs j
      where j.id = scenes.job_id and j.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = scenes.job_id and j.user_id = auth.uid()
    )
  );

drop policy if exists "exports_via_job" on public.exports;
create policy "exports_via_job" on public.exports
  for all using (
    exists (
      select 1 from public.jobs j
      where j.id = exports.job_id and j.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = exports.job_id and j.user_id = auth.uid()
    )
  );
