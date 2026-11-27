-- ============================================================================
-- NORIN PEDAGOG REYTING PLATFORMASI — V4.0 SECURITY & MONITORING MIGRATION
-- Backward-compatible, idempotent, non-destructive PostgreSQL / Supabase migration
-- ============================================================================
-- IMPORTANT:
-- 1. Do NOT run blindly on production without taking a database backup first.
-- 2. Preserves all existing users, IDs, entries, scores, and file references.
-- 3. Migrates plaintext passwords into pgcrypto bcrypt (pw_hash) while keeping
--    legacy pw column temporarily until verified (see DATABASE_MIGRATION.md).
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. NON-DESTRUCTIVE EXTENSIONS TO EXISTING TABLES
-- ----------------------------------------------------------------------------
alter table public.users
  add column if not exists pw_hash text,
  add column if not exists last_login_at timestamptz,
  add column if not exists last_active_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.entries
  add column if not exists reviewed_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

-- Backfill bcrypt hashes for any existing user missing pw_hash
update public.users
set pw_hash = crypt(pw, gen_salt('bf', 10))
where pw_hash is null
  and coalesce(pw, '') <> '';

-- ----------------------------------------------------------------------------
-- 2. SECURITY & MONITORING TABLES
-- ----------------------------------------------------------------------------
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  uid bigint not null references public.users(id) on delete cascade,
  role_snapshot text not null,
  device_type text not null default 'desktop',
  browser text not null default '',
  os text not null default '',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ix_user_sessions_uid on public.user_sessions (uid);
create index if not exists ix_user_sessions_exp on public.user_sessions (expires_at);

create table if not exists public.login_history (
  id bigint generated always as identity primary key,
  uid bigint references public.users(id) on delete set null,
  login text not null,
  user_name text not null default '',
  role text not null default '',
  success boolean not null,
  failure_reason text not null default '',
  device_type text not null default 'desktop',
  browser text not null default '',
  os text not null default '',
  masked_ip text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists ix_login_history_created on public.login_history (created_at desc);
create index if not exists ix_login_history_login on public.login_history (login, created_at desc);

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  actor_uid bigint references public.users(id) on delete set null,
  actor_name text not null default '',
  actor_role text not null default '',
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  outcome text not null default 'success',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ix_activity_logs_created on public.activity_logs (created_at desc);
create index if not exists ix_activity_logs_actor on public.activity_logs (actor_uid, created_at desc);

create table if not exists public.user_presence (
  uid bigint primary key references public.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  last_login_at timestamptz,
  active_sessions integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  uid bigint not null references public.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  ref_type text not null default '',
  ref_id text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ix_notifications_uid_created on public.notifications (uid, created_at desc);
create unique index if not exists uq_notifications_dedup
  on public.notifications (uid, kind, ref_type, ref_id)
  where ref_id <> '';

-- ----------------------------------------------------------------------------
-- 3. AUTHORITATIVE 26-AF SCORING & INDICATOR VALIDATION
-- ----------------------------------------------------------------------------
create or replace function public.calc_authoritative_pts(p_ind integer, p_type text, p_qty integer)
returns double precision
language plpgsql
immutable
as $$
declare
  v_unit double precision;
  v_max double precision;
begin
  if p_qty is null or p_qty < 1 or p_qty > 50 then
    raise exception 'Miqdor 1 dan 50 gacha bo''lishi kerak';
  end if;

  case p_ind
    when 1 then v_max := 10;
      case p_type
        when 'DSc / professor' then v_unit := 10;
        when 'PhD / dotsent' then v_unit := 8;
        when 'TOP–1000 OTM diplomi' then v_unit := 6;
        else raise exception 'Indikator 1 uchun noto''g''ri tur';
      end case;
    when 2 then v_max := 5;
      case p_type
        when 'Oliy toifa' then v_unit := 5;
        when 'Birinchi toifa' then v_unit := 4;
        when 'Ikkinchi toifa' then v_unit := 3;
        else raise exception 'Indikator 2 uchun noto''g''ri tur';
      end case;
    when 3 then v_max := 5;
      case p_type
        when 'Xalqaro sertifikat' then v_unit := 5;
        when 'Milliy sertifikat' then v_unit := 3;
        else raise exception 'Indikator 3 uchun noto''g''ri tur';
      end case;
    when 4 then v_max := 10;
      case p_type
        when 'Xalqaro sertifikat' then v_unit := 5;
        when 'Milliy sertifikat' then v_unit := 3;
        else raise exception 'Indikator 4 uchun noto''g''ri tur';
      end case;
    when 5 then v_max := 5;
      case p_type
        when 'Stajirovka' then v_unit := 3;
        when 'Malaka oshirish kursi' then v_unit := 2;
        else raise exception 'Indikator 5 uchun noto''g''ri tur';
      end case;
    when 6 then v_max := 5;
      case p_type
        when 'Xalqaro g‘olib' then v_unit := 5;
        when 'Respublika g‘olibi' then v_unit := 4;
        when 'Viloyat g‘olibi' then v_unit := 2;
        when 'Pedagog sifatida ishtirok' then v_unit := 1;
        else raise exception 'Indikator 6 uchun noto''g''ri tur';
      end case;
    when 7 then v_max := 10;
      case p_type
        when 'Metodik qo‘llanma' then v_unit := 4;
        when 'Ilmiy maqola' then v_unit := 2;
        when 'Videodars' then v_unit := 2;
        when 'Ommalashtirilgan tajriba' then v_unit := 2;
        else raise exception 'Indikator 7 uchun noto''g''ri tur';
      end case;
    when 14 then v_max := 10;
      case p_type
        when 'Xalqaro g‘olib' then v_unit := 5;
        when 'Respublika g‘olibi' then v_unit := 3;
        when 'Viloyat g‘olibi' then v_unit := 2;
        when 'Ishtirokchi' then v_unit := 1;
        else raise exception 'Indikator 14 uchun noto''g''ri tur';
      end case;
    when 15 then v_max := 5;
      case p_type
        when 'Xalqaro sertifikat' then v_unit := 2;
        when 'Milliy sertifikat' then v_unit := 1;
        else raise exception 'Indikator 15 uchun noto''g''ri tur';
      end case;
    when 16 then v_max := 10;
      case p_type
        when 'Tanlov g‘olibi' then v_unit := 5;
        when 'Loyiha ishtiroki' then v_unit := 2;
        else raise exception 'Indikator 16 uchun noto''g''ri tur';
      end case;
    when 17 then v_max := 5;
      case p_type
        when 'G‘olib' then v_unit := 2;
        when 'Sovrindor' then v_unit := 1;
        when 'Ishtirokchi' then v_unit := 1;
        else raise exception 'Indikator 17 uchun noto''g''ri tur';
      end case;
    when 18 then v_max := 20;
      case p_type
        when '90% va yuqori (sinf/chorak)' then v_unit := 4;
        when '80–89% (sinf/chorak)' then v_unit := 3;
        when '70–79% (sinf/chorak)' then v_unit := 2;
        else raise exception 'Indikator 18 uchun noto''g''ri tur';
      end case;
    when 19 then v_max := 10;
      case p_type
        when 'Xalqaro tanlovda o‘quvchi ishtiroki' then v_unit := 2;
        when 'Respublika tanlovida o‘quvchi ishtiroki' then v_unit := 1;
        when 'Pedagogning o‘zi ishtiroki' then v_unit := 2;
        else raise exception 'Indikator 19 uchun noto''g''ri tur';
      end case;
    when 20 then v_max := 10;
      case p_type
        when 'O‘quvchini tayyorlab qatnashtirish' then v_unit := 1;
        when 'Pedagogning o‘zi ishtiroki' then v_unit := 1;
        when 'Tashkilotchi / murabbiy' then v_unit := 2;
        when 'Sovrinli o‘rin (o‘quvchi)' then v_unit := 3;
        else raise exception 'Indikator 20 uchun noto''g''ri tur';
      end case;
    when 21 then v_max := 10;
      case p_type
        when 'Xalqaro sertifikat (o‘quvchi uchun)' then v_unit := 3;
        when 'Milliy sertifikat (o‘quvchi uchun)' then v_unit := 2;
        else raise exception 'Indikator 21 uchun noto''g''ri tur';
      end case;
    else
      raise exception 'Noma''lum indikator: %', p_ind;
  end case;

  return least(v_unit * p_qty, v_max);
end;
$$;

create or replace function public.reviewer_can_review(p_reviewer_name text, p_ind integer)
returns boolean
language sql
immutable
as $$
  select case p_ind
    when 1 then p_reviewer_name = 'N.Meliboyeva'
    when 2 then p_reviewer_name = 'N.Meliboyeva'
    when 5 then p_reviewer_name = 'N.Meliboyeva'
    when 3 then p_reviewer_name = 'D.Rasulova'
    when 4 then p_reviewer_name = 'D.Rasulova'
    when 6 then p_reviewer_name = 'D.Rasulova'
    when 7 then p_reviewer_name = 'D.Rasulova'
    when 18 then p_reviewer_name = 'D.Rasulova'
    when 19 then p_reviewer_name = 'D.Rasulova'
    when 14 then p_reviewer_name in ('D.Rasulova', 'S.Murodov')
    when 15 then p_reviewer_name in ('S.Murodov', 'D.Rasulova')
    when 16 then p_reviewer_name in ('S.Murodov', 'D.Rasulova')
    when 21 then p_reviewer_name in ('S.Murodov', 'D.Rasulova')
    when 17 then p_reviewer_name in ('A.Karimjonov', 'S.Murodov')
    when 20 then p_reviewer_name in ('A.Karimjonov', 'S.Murodov')
    else false
  end;
$$;

-- ----------------------------------------------------------------------------
-- 4. INTERNAL HELPER FUNCTIONS (NO PUBLIC EXECUTE)
-- ----------------------------------------------------------------------------
create or replace function public._generate_temp_pw()
returns text
language plpgsql
as $$
declare
  v_chars constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_bytes bytea := gen_random_bytes(6);
  v_out text := 'Mktb#';
  v_i int;
begin
  for v_i in 0..5 loop
    v_out := v_out || substr(v_chars, (get_byte(v_bytes, v_i) % length(v_chars)) + 1, 1);
  end loop;
  return v_out;
end;
$$;

create or replace function public._log_activity(
  p_actor_uid bigint,
  p_actor_name text,
  p_actor_role text,
  p_action text,
  p_target_type text default '',
  p_target_id text default '',
  p_outcome text default 'success',
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs(actor_uid, actor_name, actor_role, action, target_type, target_id, outcome, metadata)
  values (p_actor_uid, coalesce(p_actor_name, ''), coalesce(p_actor_role, ''), p_action, p_target_type, p_target_id, p_outcome, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create or replace function public._verify_session(p_token text)
returns table (
  uid bigint,
  login text,
  name text,
  subject text,
  role text,
  ranked integer,
  active integer,
  must_change integer,
  session_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  if coalesce(p_token, '') = '' then
    return;
  end if;
  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  return query
  select u.id, u.login, u.name, u.subject, u.role, u.ranked, u.active, u.must_change, s.id
  from public.user_sessions s
  join public.users u on u.id = s.uid
  where s.token_hash = v_hash
    and s.revoked_at is null
    and s.expires_at > now()
    and u.active = 1
    and u.role = s.role_snapshot
  limit 1;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. AUTHENTICATION & SESSION RPCs
-- ----------------------------------------------------------------------------
create or replace function public.auth_login(
  p_login text,
  p_pw text,
  p_device text default 'desktop',
  p_browser text default '',
  p_os text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_login text := lower(trim(coalesce(p_login, '')));
  v_user public.users%rowtype;
  v_fails integer;
  v_valid boolean := false;
  v_token text;
  v_hash text;
  v_exp timestamptz := now() + interval '12 hours';
  v_active_cnt integer;
begin
  select count(*) into v_fails
  from public.login_history
  where login = v_login
    and success = false
    and created_at > now() - interval '10 minutes';

  if v_fails >= 5 then
    insert into public.login_history(uid, login, user_name, role, success, failure_reason, device_type, browser, os)
    values (null, v_login, '', '', false, 'rate_limited', p_device, p_browser, p_os);
    return jsonb_build_object('ok', false, 'error', 'Juda ko''p noto''g''ri urinish. 10 daqiqadan keyin qayta urining.');
  end if;

  select * into v_user
  from public.users
  where lower(login) = v_login
  limit 1;

  if v_user.id is null or v_user.active <> 1 then
    insert into public.login_history(uid, login, user_name, role, success, failure_reason, device_type, browser, os)
    values (v_user.id, v_login, coalesce(v_user.name, ''), coalesce(v_user.role, ''), false,
            case when v_user.id is null then 'unknown_login' else 'account_disabled' end,
            p_device, p_browser, p_os);
    perform public._log_activity(v_user.id, coalesce(v_user.name, v_login), coalesce(v_user.role, 'anonymous'), 'login_failed', 'user', v_login, 'failed');
    return jsonb_build_object('ok', false, 'error', 'Login yoki parol noto''g''ri.');
  end if;

  if v_user.pw_hash is not null then
    v_valid := (v_user.pw_hash = crypt(coalesce(p_pw, ''), v_user.pw_hash));
  elsif coalesce(v_user.pw, '') <> '' then
    v_valid := (v_user.pw = coalesce(p_pw, ''));
    if v_valid then
      update public.users set pw_hash = crypt(p_pw, gen_salt('bf', 10)) where id = v_user.id;
    end if;
  end if;

  if not v_valid then
    insert into public.login_history(uid, login, user_name, role, success, failure_reason, device_type, browser, os)
    values (v_user.id, v_login, v_user.name, v_user.role, false, 'invalid_password', p_device, p_browser, p_os);
    perform public._log_activity(v_user.id, v_user.name, v_user.role, 'login_failed', 'user', v_login, 'failed');
    return jsonb_build_object('ok', false, 'error', 'Login yoki parol noto''g''ri.');
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.user_sessions(token_hash, uid, role_snapshot, device_type, browser, os, expires_at)
  values (v_hash, v_user.id, v_user.role, left(coalesce(p_device, 'desktop'), 30), left(coalesce(p_browser, ''), 60), left(coalesce(p_os, ''), 60), v_exp);

  update public.users
  set last_login_at = now(), last_active_at = now(), updated_at = now()
  where id = v_user.id;

  select count(*) into v_active_cnt
  from public.user_sessions
  where uid = v_user.id and revoked_at is null and expires_at > now();

  insert into public.user_presence(uid, last_seen_at, last_login_at, active_sessions, updated_at)
  values (v_user.id, now(), now(), v_active_cnt, now())
  on conflict (uid) do update
  set last_seen_at = now(), last_login_at = now(), active_sessions = v_active_cnt, updated_at = now();

  insert into public.login_history(uid, login, user_name, role, success, device_type, browser, os)
  values (v_user.id, v_login, v_user.name, v_user.role, true, left(coalesce(p_device, 'desktop'), 30), left(coalesce(p_browser, ''), 60), left(coalesce(p_os, ''), 60));

  perform public._log_activity(v_user.id, v_user.name, v_user.role, 'login_success', 'session', v_user.login, 'success', jsonb_build_object('device', p_device, 'browser', p_browser));

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'expires_at', v_exp,
    'user', jsonb_build_object(
      'id', v_user.id,
      'login', v_user.login,
      'name', v_user.name,
      'subject', v_user.subject,
      'role', v_user.role,
      'ranked', v_user.ranked,
      'active', v_user.active,
      'must_change', v_user.must_change,
      'created', v_user.created
    )
  );
end;
$$;

create or replace function public.auth_logout(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_hash text;
  v_cnt integer;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    return false;
  end if;
  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  update public.user_sessions set revoked_at = now() where token_hash = v_hash;

  select count(*) into v_cnt
  from public.user_sessions
  where uid = v_sess.uid and revoked_at is null and expires_at > now();

  update public.user_presence set active_sessions = v_cnt, updated_at = now() where uid = v_sess.uid;
  perform public._log_activity(v_sess.uid, v_sess.name, v_sess.role, 'logout', 'session', v_sess.login, 'success');
  return true;
end;
$$;

create or replace function public.auth_change_password(p_token text, p_old_pw text, p_new_pw text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_user public.users%rowtype;
  v_valid boolean := false;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    return jsonb_build_object('ok', false, 'error', 'Sessiya yaroqsiz.');
  end if;
  if length(coalesce(p_new_pw, '')) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Yangi parol kamida 8 belgi bo''lishi kerak.');
  end if;

  select * into v_user from public.users where id = v_sess.uid;
  if v_user.pw_hash is not null then
    v_valid := (v_user.pw_hash = crypt(coalesce(p_old_pw, ''), v_user.pw_hash));
  elsif coalesce(v_user.pw, '') <> '' then
    v_valid := (v_user.pw = coalesce(p_old_pw, ''));
  end if;

  if not v_valid then
    return jsonb_build_object('ok', false, 'error', 'Joriy parol noto''g''ri.');
  end if;

  update public.users
  set pw_hash = crypt(p_new_pw, gen_salt('bf', 10)),
      pw = '',
      must_change = 0,
      updated_at = now()
  where id = v_sess.uid;

  perform public._log_activity(v_sess.uid, v_sess.name, v_sess.role, 'password_change', 'user', v_sess.login, 'success');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.heartbeat_presence(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_cnt integer;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    return jsonb_build_object('ok', false);
  end if;

  update public.user_sessions set last_seen_at = now() where id = v_sess.session_id;
  update public.users set last_active_at = now() where id = v_sess.uid;

  select count(*) into v_cnt
  from public.user_sessions
  where uid = v_sess.uid and revoked_at is null and expires_at > now();

  insert into public.user_presence(uid, last_seen_at, active_sessions, updated_at)
  values (v_sess.uid, now(), v_cnt, now())
  on conflict (uid) do update
  set last_seen_at = now(), active_sessions = v_cnt, updated_at = now();

  return jsonb_build_object('ok', true, 'server_time', now());
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. ROLE-SCOPED READS & AUTHORITATIVE MUTATIONS
-- ----------------------------------------------------------------------------
create or replace function public.get_workspace_data(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_users jsonb;
  v_entries jsonb;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya muddati tugagan yoki yaroqsiz';
  end if;

  if v_sess.role in ('director', 'it_admin', 'reviewer') then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id, 'login', u.login, 'name', u.name, 'subject', u.subject,
      'role', u.role, 'ranked', u.ranked, 'active', u.active,
      'must_change', u.must_change, 'created', u.created,
      'last_login_at', u.last_login_at, 'last_active_at', u.last_active_at
    ) order by u.id asc), '[]'::jsonb)
    into v_users
    from public.users u;
  else
    -- Teacher receives only active ranked users (for ranking) + self
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id,
      'login', case when u.id = v_sess.uid then u.login else '' end,
      'name', u.name,
      'subject', u.subject,
      'role', u.role,
      'ranked', u.ranked,
      'active', u.active,
      'must_change', case when u.id = v_sess.uid then u.must_change else 0 end,
      'created', u.created
    ) order by u.id asc), '[]'::jsonb)
    into v_users
    from public.users u
    where u.id = v_sess.uid or (u.active = 1 and u.ranked = 1);
  end if;

  if v_sess.role = 'director' then
    select coalesce(jsonb_agg(to_jsonb(e) order by e.id desc), '[]'::jsonb)
    into v_entries
    from public.entries e;
  elsif v_sess.role = 'reviewer' then
    select coalesce(jsonb_agg(to_jsonb(e) order by e.id desc), '[]'::jsonb)
    into v_entries
    from public.entries e
    where e.uid = v_sess.uid or e.status = 'approved' or public.reviewer_can_review(v_sess.name, e.ind);
  elsif v_sess.role = 'it_admin' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'uid', e.uid, 'ind', e.ind, 'type', e.type, 'qty', e.qty,
      'pts', e.pts, 'descr', e.descr, 'date', e.date, 'status', e.status, 'created', e.created
    ) order by e.id desc), '[]'::jsonb)
    into v_entries
    from public.entries e
    where e.status = 'approved';
  else
    -- Teacher sees full own entries + approved public summary for school ranking (without private proof URLs or notes)
    select coalesce(jsonb_agg(
      case
        when e.uid = v_sess.uid then to_jsonb(e)
        else jsonb_build_object(
          'id', e.id, 'uid', e.uid, 'ind', e.ind, 'type', e.type, 'qty', e.qty,
          'pts', e.pts, 'descr', e.descr, 'date', e.date, 'status', e.status, 'created', e.created
        )
      end
      order by e.id desc
    ), '[]'::jsonb)
    into v_entries
    from public.entries e
    where e.uid = v_sess.uid or e.status = 'approved';
  end if;

  return jsonb_build_object(
    'me', jsonb_build_object(
      'id', v_sess.uid, 'login', v_sess.login, 'name', v_sess.name,
      'subject', v_sess.subject, 'role', v_sess.role, 'ranked', v_sess.ranked,
      'active', v_sess.active, 'must_change', v_sess.must_change
    ),
    'users', v_users,
    'entries', v_entries
  );
end;
$$;

create or replace function public.submit_entry(
  p_token text,
  p_ind integer,
  p_type text,
  p_qty integer,
  p_descr text,
  p_date text,
  p_fname text default null,
  p_fpath text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_pts double precision;
  v_id bigint;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya yaroqsiz';
  end if;
  if v_sess.role not in ('teacher', 'reviewer') then
    raise exception 'Faqat pedagog yoki mas''ul yutuq kirita oladi';
  end if;
  if length(trim(coalesce(p_descr, ''))) < 3 then
    raise exception 'Tavsif kiritilishi shart';
  end if;
  if p_date !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Sana formati noto''g''ri';
  end if;

  v_pts := public.calc_authoritative_pts(p_ind, p_type, p_qty);

  insert into public.entries(uid, ind, type, qty, pts, descr, date, fname, fpath, status, note)
  values (v_sess.uid, p_ind, p_type, p_qty, v_pts, left(trim(p_descr), 500), p_date, p_fname, p_fpath, 'pending', '')
  returning id into v_id;

  perform public._log_activity(v_sess.uid, v_sess.name, v_sess.role, 'entry_submit', 'entry', v_id::text, 'success', jsonb_build_object('ind', p_ind, 'pts', v_pts));

  return jsonb_build_object('ok', true, 'id', v_id, 'pts', v_pts);
end;
$$;

create or replace function public.review_entry_atomic(
  p_token text,
  p_entry_id bigint,
  p_status text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_entry public.entries%rowtype;
  v_updated integer;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya yaroqsiz';
  end if;
  if v_sess.role not in ('director', 'reviewer') then
    raise exception 'Tasdiqlash huquqi mavjud emas';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'Noto''g''ri holat';
  end if;

  select * into v_entry from public.entries where id = p_entry_id for update;
  if v_entry.id is null then
    raise exception 'Ariza topilmadi';
  end if;

  if v_sess.role = 'reviewer' then
    if not public.reviewer_can_review(v_sess.name, v_entry.ind) then
      raise exception 'Ushbu indikator sizga biriktirilmagan';
    end if;
    if v_entry.uid = v_sess.uid then
      raise exception 'O''z yutug''ingizni tasdiqlay olmaysiz';
    end if;
  end if;

  if v_entry.status = p_status then
    return jsonb_build_object('ok', false, 'error', 'Ushbu ariza allaqachon ushbu holatga o''tkazilgan.');
  end if;

  update public.entries
  set status = p_status,
      note = left(coalesce(p_note, ''), 300),
      rev = v_sess.uid,
      reviewed_at = now()
  where id = p_entry_id;

  get diagnostics v_updated = row_count;

  perform public._log_activity(v_sess.uid, v_sess.name, v_sess.role, 'entry_' || p_status, 'entry', p_entry_id::text, 'success', jsonb_build_object('ind', v_entry.ind, 'uid', v_entry.uid));

  insert into public.notifications(uid, kind, title, body, ref_type, ref_id)
  values (
    v_entry.uid,
    'entry_' || p_status,
    case when p_status = 'approved' then 'Yutuq tasdiqlandi (+' || v_entry.pts || ' ball)' else 'Yutuq rad etildi' end,
    coalesce(nullif(trim(p_note), ''), v_entry.type),
    'entry',
    p_entry_id::text
  )
  on conflict do nothing;

  return jsonb_build_object('ok', v_updated > 0);
end;
$$;

create or replace function public.delete_entry_safe(p_token text, p_entry_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_entry public.entries%rowtype;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya yaroqsiz';
  end if;
  select * into v_entry from public.entries where id = p_entry_id;
  if v_entry.id is null then
    raise exception 'Ariza topilmadi';
  end if;
  if v_entry.uid <> v_sess.uid and v_sess.role <> 'director' then
    raise exception 'Ruxsat yo''q';
  end if;
  if v_entry.status = 'approved' and v_sess.role <> 'director' then
    raise exception 'Tasdiqlangan yutuqni o''chirib bo''lmaydi';
  end if;

  delete from public.entries where id = p_entry_id;
  perform public._log_activity(v_sess.uid, v_sess.name, v_sess.role, 'entry_delete', 'entry', p_entry_id::text, 'success');
  return jsonb_build_object('ok', true, 'fpath', v_entry.fpath);
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. ADMIN USER MANAGEMENT RPCs (WITH PRIVILEGE ESCALATION PROTECTION)
-- ----------------------------------------------------------------------------
create or replace function public.admin_create_users(p_token text, p_users jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_item jsonb;
  v_login text;
  v_name text;
  v_subject text;
  v_role text;
  v_ranked integer;
  v_pw text;
  v_out jsonb := '[]'::jsonb;
  v_new_id bigint;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null or v_sess.role not in ('director', 'it_admin') then
    raise exception 'Administrator ruxsati talab qilinadi';
  end if;

  for v_item in select * from jsonb_array_elements(p_users) loop
    v_login := lower(trim(coalesce(v_item->>'login', '')));
    v_name := trim(coalesce(v_item->>'name', ''));
    v_subject := trim(coalesce(v_item->>'subject', ''));
    v_role := coalesce(v_item->>'role', 'teacher');
    v_ranked := coalesce((v_item->>'ranked')::int, case when v_role = 'teacher' then 1 else 0 end);

    if v_name = '' or v_login = '' then
      raise exception 'Login va F.I.Sh. majburiy';
    end if;
    if v_role not in ('teacher', 'reviewer', 'it_admin', 'director') then
      raise exception 'Noto''g''ri rol';
    end if;
    if v_role = 'director' and v_sess.role <> 'director' then
      raise exception 'Faqat direktor direktor rolini bera oladi';
    end if;

    v_pw := public._generate_temp_pw();

    insert into public.users(login, name, subject, role, ranked, pw, pw_hash, active, must_change)
    values (v_login, v_name, v_subject, v_role, v_ranked, '', crypt(v_pw, gen_salt('bf', 10)), 1, 1)
    returning id into v_new_id;

    perform public._log_activity(v_sess.uid, v_sess.name, v_sess.role, 'user_create', 'user', v_new_id::text, 'success', jsonb_build_object('login', v_login, 'role', v_role));

    v_out := v_out || jsonb_build_object('id', v_new_id, 'login', v_login, 'pw', v_pw, 'name', v_name, 'subject', v_subject, 'role', v_role);
  end loop;

  return jsonb_build_object('ok', true, 'created', v_out);
end;
$$;

create or replace function public.admin_update_user(p_token text, p_target_uid bigint, p_updates jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_target public.users%rowtype;
  v_new_role text;
  v_new_active integer;
  v_dir_count integer;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null or v_sess.role not in ('director', 'it_admin') then
    raise exception 'Administrator ruxsati talab qilinadi';
  end if;

  select * into v_target from public.users where id = p_target_uid;
  if v_target.id is null then
    raise exception 'Foydalanuvchi topilmadi';
  end if;

  v_new_role := coalesce(p_updates->>'role', v_target.role);
  v_new_active := coalesce((p_updates->>'active')::int, v_target.active);

  if v_new_role not in ('teacher', 'reviewer', 'it_admin', 'director') then
    raise exception 'Noto''g''ri rol';
  end if;
  if (v_new_role = 'director' or v_target.role = 'director') and v_sess.role <> 'director' then
    raise exception 'Faqat direktor direktor rolini o''zgartira oladi';
  end if;
  if p_target_uid = v_sess.uid and (v_new_role <> v_target.role or v_new_active = 0) then
    raise exception 'O''z rolingiz yoki faolligingizni o''zgartira olmaysiz';
  end if;

  if v_target.role = 'director' and (v_new_role <> 'director' or v_new_active = 0) then
    select count(*) into v_dir_count from public.users where role = 'director' and active = 1 and id <> p_target_uid;
    if v_dir_count < 1 then
      raise exception 'Oxirgi faol direktor akkauntini o''chirib bo''lmaydi';
    end if;
  end if;

  update public.users
  set name = coalesce(nullif(trim(p_updates->>'name'), ''), name),
      subject = coalesce(p_updates->>'subject', subject),
      role = v_new_role,
      ranked = coalesce((p_updates->>'ranked')::int, ranked),
      active = v_new_active,
      updated_at = now()
  where id = p_target_uid;

  -- Invalidate active sessions on role change or deactivation
  if v_new_role <> v_target.role or v_new_active = 0 then
    update public.user_sessions set revoked_at = now() where uid = p_target_uid and revoked_at is null;
    update public.user_presence set active_sessions = 0, updated_at = now() where uid = p_target_uid;
  end if;

  perform public._log_activity(v_sess.uid, v_sess.name, v_sess.role, 'user_update', 'user', p_target_uid::text, 'success', p_updates);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_reset_password(p_token text, p_target_uid bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_target public.users%rowtype;
  v_pw text;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null or v_sess.role not in ('director', 'it_admin') then
    raise exception 'Administrator ruxsati talab qilinadi';
  end if;

  select * into v_target from public.users where id = p_target_uid;
  if v_target.id is null then
    raise exception 'Foydalanuvchi topilmadi';
  end if;
  if v_target.role = 'director' and v_sess.role <> 'director' then
    raise exception 'IT mutaxassis direktor parolini tiklay olmaydi';
  end if;

  v_pw := public._generate_temp_pw();
  update public.users
  set pw = '', pw_hash = crypt(v_pw, gen_salt('bf', 10)), must_change = 1, updated_at = now()
  where id = p_target_uid;

  update public.user_sessions set revoked_at = now() where uid = p_target_uid and revoked_at is null;
  perform public._log_activity(v_sess.uid, v_sess.name, v_sess.role, 'password_reset', 'user', p_target_uid::text, 'success');

  return jsonb_build_object('ok', true, 'login', v_target.login, 'name', v_target.name, 'pw', v_pw);
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. MONITORING & NOTIFICATION READ RPCs
-- ----------------------------------------------------------------------------
create or replace function public.get_monitoring_data(p_token text, p_limit integer default 150)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_activities jsonb;
  v_logins jsonb;
  v_presence jsonb;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null or v_sess.role not in ('director', 'it_admin') then
    raise exception 'Monitoring ma''lumotlari uchun ruxsat yo''q';
  end if;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
  into v_activities
  from (select * from public.activity_logs order by created_at desc limit least(p_limit, 300)) a;

  select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at desc), '[]'::jsonb)
  into v_logins
  from (select * from public.login_history order by created_at desc limit least(p_limit, 300)) l;

  select coalesce(jsonb_agg(jsonb_build_object(
    'uid', u.id,
    'name', u.name,
    'login', u.login,
    'role', u.role,
    'subject', u.subject,
    'active', u.active,
    'last_seen_at', coalesce(p.last_seen_at, u.last_active_at),
    'last_login_at', coalesce(p.last_login_at, u.last_login_at),
    'active_sessions', coalesce(p.active_sessions, 0)
  ) order by coalesce(p.last_seen_at, u.last_active_at) desc nulls last, u.name asc), '[]'::jsonb)
  into v_presence
  from public.users u
  left join public.user_presence p on p.uid = u.id;

  return jsonb_build_object(
    'activities', v_activities,
    'logins', v_logins,
    'presence', v_presence,
    'server_time', now()
  );
end;
$$;

create or replace function public.get_user_notifications(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_rows jsonb;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc), '[]'::jsonb)
  into v_rows
  from (select * from public.notifications where uid = v_sess.uid order by created_at desc limit 30) n;

  return v_rows;
end;
$$;

create or replace function public.mark_notification_read(p_token text, p_id bigint default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    return false;
  end if;

  if p_id is null then
    update public.notifications set is_read = true where uid = v_sess.uid and is_read = false;
  else
    update public.notifications set is_read = true where id = p_id and uid = v_sess.uid;
  end if;
  return true;
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (DEFAULT DENY) & STRICT PERMISSIONS
-- ----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.entries enable row level security;
alter table public.user_sessions enable row level security;
alter table public.login_history enable row level security;
alter table public.activity_logs enable row level security;
alter table public.user_presence enable row level security;
alter table public.notifications enable row level security;

revoke all on public.users from anon, authenticated;
revoke all on public.entries from anon, authenticated;
revoke all on public.user_sessions from anon, authenticated;
revoke all on public.login_history from anon, authenticated;
revoke all on public.activity_logs from anon, authenticated;
revoke all on public.user_presence from anon, authenticated;
revoke all on public.notifications from anon, authenticated;

revoke all on function public._generate_temp_pw() from public, anon, authenticated;
revoke all on function public._log_activity(bigint, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public._verify_session(text) from public, anon, authenticated;

grant execute on function public.auth_login(text, text, text, text, text) to anon, authenticated;
grant execute on function public.auth_logout(text) to anon, authenticated;
grant execute on function public.auth_change_password(text, text, text) to anon, authenticated;
grant execute on function public.heartbeat_presence(text) to anon, authenticated;
grant execute on function public.get_workspace_data(text) to anon, authenticated;
grant execute on function public.submit_entry(text, integer, text, integer, text, text, text, text) to anon, authenticated;
grant execute on function public.review_entry_atomic(text, bigint, text, text) to anon, authenticated;
grant execute on function public.delete_entry_safe(text, bigint) to anon, authenticated;
grant execute on function public.admin_create_users(text, jsonb) to anon, authenticated;
grant execute on function public.admin_update_user(text, bigint, jsonb) to anon, authenticated;
grant execute on function public.admin_reset_password(text, bigint) to anon, authenticated;
grant execute on function public.get_monitoring_data(text, integer) to anon, authenticated;
grant execute on function public.get_user_notifications(text) to anon, authenticated;
grant execute on function public.mark_notification_read(text, bigint) to anon, authenticated;

commit;
