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

-- Supabase Storage bucket (tasdiqlovchi skanlar va PDF fayllar uchun, public = true)
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do update set public = true;

-- Boshlang‘ich rasmiy akkauntlar (direktor, it_admin va 4 ta mas‘ul)
insert into public.users (login, name, subject, role, ranked, pw, active, must_change) values
  ('direktor', 'Alisher Xolmatov', 'Maktab direktori', 'director', 0, 'Direktor#2026', 1, 0),
  ('it_admin', 'Hasanboy Toshboyev', 'Informatika va IT', 'it_admin', 0, 'Admin#2026', 1, 0),
  ('n.meliboyeva', 'N.Meliboyeva', 'O‘IBDO‘ / Metodist', 'reviewer', 0, 'Masul#2026', 1, 0),
  ('d.rasulova', 'D.Rasulova', 'O‘IBDO‘ / Metodist', 'reviewer', 0, 'Masul#2026', 1, 0),
  ('s.murodov', 'S.Murodov', 'Aniq fanlar metodisti', 'reviewer', 0, 'Masul#2026', 1, 0),
  ('a.karimjonov', 'A.Karimjonov', 'MMIBDO‘', 'reviewer', 0, 'Masul#2026', 1, 0)
on conflict (login) do nothing;

-- Xavfsiz login RPC funksiyasi (barcha parollar brauzerga ochiq ketmasligi uchun)
create or replace function public.login_user(p_login text, p_pw text)
returns table (
  id bigint,
  login text,
  name text,
  subject text,
  role text,
  ranked integer,
  active integer,
  must_change integer
)
language plpgsql
security definer
as $$
begin
  return query
  select u.id, u.login, u.name, u.subject, u.role, u.ranked, u.active, u.must_change
  from public.users u
  where lower(trim(u.login)) = lower(trim(p_login))
    and u.pw = p_pw
    and u.active = 1
  limit 1;
end;
$$;

grant execute on function public.login_user(text, text) to anon, authenticated, service_role;
