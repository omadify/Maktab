-- Norin tuman ixtisoslashtirilgan maktabi — Pedagoglar reyting platformasi
-- Supabase PostgreSQL & Storage sxemasi (Tuzatilgan va xavfsiz versiya)

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

-- Xavfsiz tizimga kirish RPC funksiyasi (parolni brauzerga qaytarmaydi)
drop function if exists public.login_user(text, text);
create or replace function public.login_user(p_login text, p_pw text)
returns table (
  id bigint,
  login text,
  name text,
  subject text,
  role text,
  ranked integer,
  active integer,
  must_change integer,
  created double precision
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select u.id, u.login, u.name, u.subject, u.role, u.ranked, u.active, u.must_change, u.created
  from public.users u
  where lower(u.login) = lower(trim(p_login))
    and u.pw = p_pw
    and u.active = 1
  limit 1;
end;
$$;

-- Xavfsiz parol almashtirish RPC funksiyasi (joriy parolni serverda tekshiradi)
create or replace function public.change_user_password(p_uid bigint, p_old_pw text, p_new_pw text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if length(coalesce(p_new_pw, '')) < 8 then
    return false;
  end if;

  update public.users
  set pw = p_new_pw,
      must_change = 0
  where id = p_uid
    and pw = p_old_pw
    and active = 1;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

grant execute on function public.login_user(text, text) to anon, authenticated;
grant execute on function public.change_user_password(bigint, text, text) to anon, authenticated;

-- Boshlang‘ich rahbariyat va mas’ul baholovchilar akkauntlari
insert into public.users (login, name, subject, role, ranked, pw, active, must_change)
values
  ('direktor', 'Alisher Xolmatov', 'Maktab direktori', 'director', 0, 'Direktor#2026', 1, 1),
  ('it_admin', 'Hasanboy Toshboyev', 'IT mutaxassis', 'it_admin', 0, 'Admin#2026', 1, 1),
  ('n.meliboyeva', 'N.Meliboyeva', 'Mas’ul baholovchi', 'reviewer', 0, 'Masul#2026', 1, 1),
  ('d.rasulova', 'D.Rasulova', 'Mas’ul baholovchi', 'reviewer', 0, 'Masul#2026', 1, 1),
  ('s.murodov', 'S.Murodov', 'Mas’ul baholovchi', 'reviewer', 0, 'Masul#2026', 1, 1),
  ('a.karimjonov', 'A.Karimjonov', 'Mas’ul baholovchi', 'reviewer', 0, 'Masul#2026', 1, 1)
on conflict (login) do nothing;

-- Supabase Storage bucket (tasdiqlovchi skanlar va PDF fayllar ochilishi uchun public = true)
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do update set public = true;

-- Storage uchun o‘qish va yuklash ruxsatlari
drop policy if exists "proofs_public_read" on storage.objects;
create policy "proofs_public_read"
  on storage.objects for select
  using (bucket_id = 'proofs');

drop policy if exists "proofs_public_insert" on storage.objects;
create policy "proofs_public_insert"
  on storage.objects for insert
  with check (bucket_id = 'proofs');
