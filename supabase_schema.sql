-- Norin tuman ixtisoslashtirilgan maktabi — Pedagoglar reyting platformasi
-- Supabase PostgreSQL & Storage sxemasi

create table if not exists public.users (
  id bigint generated always as identity primary key,
  login text unique not null,
  name text not null,
  subject text not null default '',
  role text not null default 'teacher',
  ranked integer not null default 1,
  pw text not null,
  active integer not null default 1,
  must_change integer not null default 1,
  created double precision not null default extract(epoch from now())
);

create table if not exists public.sessions (
  h text primary key,
  uid bigint not null references public.users(id) on delete cascade,
  exp double precision not null
);

create table if not exists public.entries (
  id bigint generated always as identity primary key,
  uid bigint not null references public.users(id) on delete cascade,
  ind integer not null,
  type text not null,
  qty integer not null default 1,
  pts double precision not null default 0,
  descr text not null default '',
  date text not null,
  fname text,
  fpath text,
  status text not null default 'pending',
  rev bigint,
  note text not null default '',
  created double precision not null default extract(epoch from now())
);

create index if not exists ix_entries_uid_status on public.entries (uid, status);
create index if not exists ix_sessions_exp on public.sessions (exp);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id bigint,
  actor_name text not null default '',
  action text not null,
  target text not null default '',
  details text not null default '',
  created double precision not null default extract(epoch from now())
);

create index if not exists ix_audit_created on public.audit_logs (created desc);

-- Supabase Storage bucket (tasdiqlovchi skanlar va PDF fayllar uchun)
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;
