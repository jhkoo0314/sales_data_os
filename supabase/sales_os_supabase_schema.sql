-- Sales Data OS - Supabase schema (code-expected baseline)
-- Created: 2026-04-02
-- Scope:
-- 1) Existing run storage API tables (runs, run_steps, run_artifacts, run_report_context, agent_chat_logs)
-- 2) Phase 10 worker queue tables (pipeline_runs, pipeline_run_steps)
-- 3) Company registry table (company_registry)

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Common helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1) Company registry
-- -----------------------------------------------------------------------------
create table if not exists public.company_registry (
  id uuid primary key default gen_random_uuid(),
  company_key text not null unique,
  company_name text not null,
  company_name_normalized text not null,
  status text not null default 'active',
  company_code_external text,
  aliases_json jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_registry_status on public.company_registry(status);
create index if not exists idx_company_registry_name_norm on public.company_registry(company_name_normalized);

drop trigger if exists trg_company_registry_updated_at on public.company_registry;
create trigger trg_company_registry_updated_at
before update on public.company_registry
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2) Run storage (used by common/run_storage/_shared.py)
-- -----------------------------------------------------------------------------
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  company_key text not null,
  mode text not null default '',
  run_status text not null default 'pending',
  triggered_by text not null default '',
  input_summary jsonb not null default '{}'::jsonb,
  validation_status text,
  confidence_grade text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_runs_company_status_started on public.runs(company_key, run_status, started_at desc);
create index if not exists idx_runs_run_key on public.runs(run_key);

drop trigger if exists trg_runs_updated_at on public.runs;
create trigger trg_runs_updated_at
before update on public.runs
for each row execute function public.set_updated_at();

create table if not exists public.run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  step_name text not null,
  step_order integer not null default 0,
  step_status text not null default 'success',
  quality_status text,
  output_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_run_steps_run_id_order on public.run_steps(run_id, step_order);

create table if not exists public.run_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  step_id uuid references public.run_steps(id) on delete set null,
  artifact_type text not null,
  artifact_role text not null default '',
  artifact_name text not null default '',
  artifact_class text not null default '',
  storage_path text not null default '',
  mime_type text not null default '',
  content_hash text,
  payload jsonb not null default '{}'::jsonb,
  quality_status text,
  quality_score numeric(8,2),
  created_at timestamptz not null default now()
);

create index if not exists idx_run_artifacts_run_id_created on public.run_artifacts(run_id, created_at);
create index if not exists idx_run_artifacts_type on public.run_artifacts(artifact_type);

create table if not exists public.run_report_context (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.runs(id) on delete cascade,
  mode text not null default '',
  context_version text not null default 'v1',
  full_context_json jsonb not null default '{}'::jsonb,
  prompt_context_json jsonb not null default '{}'::jsonb,
  executive_summary text not null default '',
  key_findings jsonb not null default '[]'::jsonb,
  evidence_index jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_run_report_context_updated_at on public.run_report_context;
create trigger trg_run_report_context_updated_at
before update on public.run_report_context
for each row execute function public.set_updated_at();

create table if not exists public.agent_chat_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  mode text not null default '',
  user_question text not null default '',
  assistant_answer text not null default '',
  used_context_version text not null default 'v1',
  answer_scope text not null default '',
  question_type text not null default 'general',
  model_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_chat_logs_run_id_created on public.agent_chat_logs(run_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3) Phase 10 worker queue (used by workers/services/status_updater.py)
-- -----------------------------------------------------------------------------
create table if not exists public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text unique,
  company_key text not null,
  execution_mode text not null default 'integrated_full',
  run_status text not null default 'pending',
  worker_name text,
  overall_status text,
  overall_score numeric(8,2),
  result_summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_pipeline_runs_status_created on public.pipeline_runs(run_status, created_at);
create index if not exists idx_pipeline_runs_company_created on public.pipeline_runs(company_key, created_at desc);

drop trigger if exists trg_pipeline_runs_updated_at on public.pipeline_runs;
create trigger trg_pipeline_runs_updated_at
before update on public.pipeline_runs
for each row execute function public.set_updated_at();

create table if not exists public.pipeline_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.pipeline_runs(id) on delete cascade,
  step_name text not null,
  step_order integer not null default 0,
  step_status text not null default 'success',
  quality_status text,
  output_summary jsonb not null default '{}'::jsonb,
  duration_ms integer not null default 0,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_pipeline_run_steps_run_id_order on public.pipeline_run_steps(run_id, step_order);

-- -----------------------------------------------------------------------------
-- Optional seed (safe upsert)
-- -----------------------------------------------------------------------------
insert into public.company_registry (
  company_key, company_name, company_name_normalized, status, company_code_external, aliases_json, notes
)
values
  ('daon_pharma', '다온파마', '다온파마', 'active', 'daon_pharma', '["daon-pharma","Daon Pharma","다온제약"]'::jsonb, ''),
  ('hangyeol_pharma', '한결제약', '한결제약', 'active', 'hangyeol_pharma', '["hangyeol-pharma","Hangyeol Pharma","한결파마"]'::jsonb, ''),
  ('monthly_merge_pharma', '월별검증제약', '월별검증제약', 'active', 'monthly_merge_pharma', '["monthly-merge-pharma","Monthly Merge Pharma"]'::jsonb, ''),
  ('tera_pharma', '테라제약', '테라제약', 'active', 'tera_pharma', '["tera-pharma","Tera Pharma","테라파마"]'::jsonb, '')
on conflict (company_key) do update
set
  company_name = excluded.company_name,
  company_name_normalized = excluded.company_name_normalized,
  status = excluded.status,
  company_code_external = excluded.company_code_external,
  aliases_json = excluded.aliases_json,
  notes = excluded.notes;
