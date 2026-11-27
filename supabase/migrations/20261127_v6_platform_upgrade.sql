-- ============================================================================
-- NORIN PEDAGOG REYTING PLATFORMASI — V6.0 UPGRADE MIGRATION
-- Additive, idempotent, non-destructive PostgreSQL / Supabase migration
-- Builds on top of 20261127_v4_security_monitoring.sql
-- ============================================================================
-- IMPORTANT:
-- 1. Preserves all existing users, IDs, entries, scores, 26-AF rules & files.
-- 2. Adds Telegram-grade profile customization, Personal Activity RPC,
--    Appeals & Requests (Murojaatlar), Personal Development Plan (Rivojlanish
--    rejasi), and Active Session Management RPCs.
-- 3. Default-deny RLS on all new tables; all reads/writes via SECURITY DEFINER
--    token-verified RPCs.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. NON-DESTRUCTIVE PROFILE & PREFERENCE EXTENSIONS ON public.users
-- ----------------------------------------------------------------------------
alter table public.users
  add column if not exists bio text not null default '',
  add column if not exists avatar_url text,
  add column if not exists cover_style text not null default 'ocean-glass',
  add column if not exists cover_url text,
  add column if not exists phone text not null default '',
  add column if not exists telegram_handle text not null default '',
  add column if not exists contact_public boolean not null default false,
  add column if not exists preferences jsonb not null default '{}'::jsonb;

-- ----------------------------------------------------------------------------
-- 2. MODULE 2: MUROJAATLAR VA APELLYATSIYALAR (Appeals & Requests)
--    Critical rule: Appeals never automatically alter official rating scores.
-- ----------------------------------------------------------------------------
create table if not exists public.appeals (
  id bigint generated always as identity primary key,
  uid bigint not null references public.users(id) on delete cascade,
  entry_id bigint references public.entries(id) on delete set null,
  ind integer,
  category text not null default 'evaluation_review',
  subject text not null,
  message text not null,
  attachment_name text,
  attachment_url text,
  status text not null default 'new'
    check (status in ('new', 'in_review', 'needs_info', 'resolved', 'rejected')),
  assigned_to bigint references public.users(id) on delete set null,
  escalated_to_director boolean not null default false,
  resolution_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_appeals_uid_created on public.appeals (uid, created_at desc);
create index if not exists ix_appeals_status on public.appeals (status, updated_at desc);

create table if not exists public.appeal_messages (
  id bigint generated always as identity primary key,
  appeal_id bigint not null references public.appeals(id) on delete cascade,
  sender_uid bigint not null references public.users(id) on delete cascade,
  sender_name text not null default '',
  sender_role text not null default '',
  body text not null,
  attachment_name text,
  attachment_url text,
  created_at timestamptz not null default now()
);

create index if not exists ix_appeal_messages_appeal on public.appeal_messages (appeal_id, created_at asc);

-- ----------------------------------------------------------------------------
-- 3. MODULE 3: RIVOJLANISH REJASI (Personal Development Plan)
--    Critical rule: Personal goals never alter official 26-AF scores.
-- ----------------------------------------------------------------------------
create table if not exists public.development_goals (
  id bigint generated always as identity primary key,
  uid bigint not null references public.users(id) on delete cascade,
  title text not null,
  section text not null default 'A' check (section in ('A', 'B', 'C', 'general')),
  ind integer,
  target_date text not null default '',
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_dev_goals_uid on public.development_goals (uid, created_at desc);

create table if not exists public.development_tasks (
  id bigint generated always as identity primary key,
  goal_id bigint not null references public.development_goals(id) on delete cascade,
  uid bigint not null references public.users(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  due_date text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists ix_dev_tasks_goal on public.development_tasks (goal_id, id asc);

-- ----------------------------------------------------------------------------
-- 4. EXTEND get_workspace_data TO INCLUDE SAFE PROFILE CUSTOMIZATION FIELDS
-- ----------------------------------------------------------------------------
create or replace function public.get_workspace_data(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_me_row public.users%rowtype;
  v_users jsonb;
  v_entries jsonb;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya muddati tugagan yoki yaroqsiz';
  end if;

  select * into v_me_row from public.users where id = v_sess.uid;

  if v_sess.role in ('director', 'it_admin', 'reviewer') then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id, 'login', u.login, 'name', u.name, 'subject', u.subject,
      'role', u.role, 'ranked', u.ranked, 'active', u.active,
      'must_change', u.must_change, 'created', u.created,
      'last_login_at', u.last_login_at, 'last_active_at', u.last_active_at,
      'bio', u.bio, 'avatar_url', u.avatar_url,
      'cover_style', u.cover_style, 'cover_url', u.cover_url,
      'phone', case when u.id = v_sess.uid or u.contact_public or v_sess.role = 'director' then u.phone else '' end,
      'telegram_handle', case when u.id = v_sess.uid or u.contact_public or v_sess.role = 'director' then u.telegram_handle else '' end,
      'contact_public', u.contact_public
    ) order by u.id asc), '[]'::jsonb)
    into v_users
    from public.users u;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id,
      'login', case when u.id = v_sess.uid then u.login else '' end,
      'name', u.name,
      'subject', u.subject,
      'role', u.role,
      'ranked', u.ranked,
      'active', u.active,
      'must_change', case when u.id = v_sess.uid then u.must_change else 0 end,
      'created', u.created,
      'bio', u.bio,
      'avatar_url', u.avatar_url,
      'cover_style', u.cover_style,
      'cover_url', u.cover_url,
      'phone', case when u.id = v_sess.uid or u.contact_public then u.phone else '' end,
      'telegram_handle', case when u.id = v_sess.uid or u.contact_public then u.telegram_handle else '' end,
      'contact_public', u.contact_public
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
      'id', v_me_row.id, 'login', v_me_row.login, 'name', v_me_row.name,
      'subject', v_me_row.subject, 'role', v_me_row.role, 'ranked', v_me_row.ranked,
      'active', v_me_row.active, 'must_change', v_me_row.must_change,
      'bio', v_me_row.bio, 'avatar_url', v_me_row.avatar_url,
      'cover_style', v_me_row.cover_style, 'cover_url', v_me_row.cover_url,
      'phone', v_me_row.phone, 'telegram_handle', v_me_row.telegram_handle,
      'contact_public', v_me_row.contact_public,
      'preferences', v_me_row.preferences,
      'last_login_at', v_me_row.last_login_at
    ),
    'users', v_users,
    'entries', v_entries
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 4B. ENFORCE EVALUATOR-ONLY RULE FOR REVIEWERS (NEVER RANKED, NEVER SCORED)
-- ----------------------------------------------------------------------------
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
  if v_sess.role <> 'teacher' then
    raise exception 'Faqat pedagog yutuq kirita oladi. Mas''ullar faqat tekshiruvchi hisoblanadi.';
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

-- ----------------------------------------------------------------------------
-- 5. TELEGRAM-STYLE PROFILE UPDATE & SESSION MANAGEMENT RPCs
-- ----------------------------------------------------------------------------
create or replace function public.update_my_profile(p_token text, p_updates jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_bio text;
  v_phone text;
  v_tg text;
  v_cover_style text;
  v_avatar_url text;
  v_cover_url text;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya yaroqsiz';
  end if;

  -- Strictly whitelist personal customizable fields only (never role, name, subject, ranked, active)
  v_bio := left(trim(coalesce(p_updates->>'bio', '')), 320);
  v_phone := left(trim(coalesce(p_updates->>'phone', '')), 40);
  v_tg := left(regexp_replace(trim(coalesce(p_updates->>'telegram_handle', '')), '^@+', ''), 48);
  v_cover_style := coalesce(nullif(trim(p_updates->>'cover_style'), ''), 'ocean-glass');

  if v_cover_style not in ('ocean-glass', 'emerald-mist', 'indigo-slate', 'warm-sand', 'midnight-aurora', 'custom') then
    v_cover_style := 'ocean-glass';
  end if;

  update public.users
  set bio = case when p_updates ? 'bio' then v_bio else bio end,
      phone = case when p_updates ? 'phone' then v_phone else phone end,
      telegram_handle = case when p_updates ? 'telegram_handle' then v_tg else telegram_handle end,
      contact_public = case when p_updates ? 'contact_public' then coalesce((p_updates->>'contact_public')::boolean, false) else contact_public end,
      cover_style = case when p_updates ? 'cover_style' then v_cover_style else cover_style end,
      avatar_url = case when p_updates ? 'avatar_url' then nullif(trim(coalesce(p_updates->>'avatar_url', '')), '') else avatar_url end,
      cover_url = case when p_updates ? 'cover_url' then nullif(trim(coalesce(p_updates->>'cover_url', '')), '') else cover_url end,
      updated_at = now()
  where id = v_sess.uid;

  perform public._log_activity(
    v_sess.uid, v_sess.name, v_sess.role,
    'profile_update', 'user', v_sess.uid::text, 'success',
    jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p_updates) k))
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.update_my_preferences(p_token text, p_prefs jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya yaroqsiz';
  end if;

  update public.users
  set preferences = coalesce(preferences, '{}'::jsonb) || coalesce(p_prefs, '{}'::jsonb),
      updated_at = now()
  where id = v_sess.uid;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_my_sessions(p_token text)
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
    raise exception 'Sessiya yaroqsiz';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'device_type', s.device_type,
    'browser', s.browser,
    'os', s.os,
    'created_at', s.created_at,
    'last_seen_at', s.last_seen_at,
    'expires_at', s.expires_at,
    'is_current', (s.id = v_sess.session_id)
  ) order by (s.id = v_sess.session_id) desc, s.last_seen_at desc), '[]'::jsonb)
  into v_rows
  from public.user_sessions s
  where s.uid = v_sess.uid
    and s.revoked_at is null
    and s.expires_at > now();

  return v_rows;
end;
$$;

create or replace function public.revoke_my_session(p_token text, p_session_id uuid)
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
    raise exception 'Sessiya yaroqsiz';
  end if;
  if p_session_id = v_sess.session_id then
    raise exception 'Joriy sessiyani bu yerdan tugatib bo''lmaydi, tizimdan chiqishdan foydalaning';
  end if;

  update public.user_sessions
  set revoked_at = now()
  where id = p_session_id and uid = v_sess.uid and revoked_at is null;

  select count(*) into v_cnt
  from public.user_sessions
  where uid = v_sess.uid and revoked_at is null and expires_at > now();

  update public.user_presence set active_sessions = v_cnt, updated_at = now() where uid = v_sess.uid;
  perform public._log_activity(v_sess.uid, v_sess.name, v_sess.role, 'session_revoked', 'session', p_session_id::text, 'success');

  return jsonb_build_object('ok', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. MODULE 1: PERSONAL ACTIVITY RPC (get_my_activity)
--    Strictly returns only authenticated user's own events + review decisions on their own entries/appeals.
-- ----------------------------------------------------------------------------
create or replace function public.get_my_activity(p_token text, p_limit integer default 120)
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
    raise exception 'Sessiya yaroqsiz';
  end if;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select al.*
    from public.activity_logs al
    where al.actor_uid = v_sess.uid
       or (
         al.action in ('entry_approved', 'entry_rejected', 'appeal_status_changed', 'appeal_reply')
         and (al.metadata->>'uid')::bigint = v_sess.uid
       )
    order by al.created_at desc
    limit least(coalesce(p_limit, 120), 250)
  ) a;

  return v_rows;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. MODULE 2: APPEALS & REQUESTS RPCs
-- ----------------------------------------------------------------------------
create or replace function public.get_appeals(p_token text)
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
    raise exception 'Sessiya yaroqsiz';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ap.id,
    'uid', ap.uid,
    'user_name', u.name,
    'user_subject', u.subject,
    'entry_id', ap.entry_id,
    'ind', ap.ind,
    'category', ap.category,
    'subject', ap.subject,
    'message', ap.message,
    'attachment_name', ap.attachment_name,
    'attachment_url', ap.attachment_url,
    'status', ap.status,
    'assigned_to', ap.assigned_to,
    'escalated_to_director', ap.escalated_to_director,
    'resolution_note', ap.resolution_note,
    'created_at', ap.created_at,
    'updated_at', ap.updated_at,
    'messages', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at asc)
      from public.appeal_messages m
      where m.appeal_id = ap.id
    ), '[]'::jsonb)
  ) order by ap.updated_at desc), '[]'::jsonb)
  into v_rows
  from public.appeals ap
  join public.users u on u.id = ap.uid
  where (
    v_sess.role = 'director'
    or ap.uid = v_sess.uid
    or (
      v_sess.role = 'reviewer'
      and (
        ap.assigned_to = v_sess.uid
        or (ap.ind is not null and public.reviewer_can_review(v_sess.name, ap.ind))
      )
    )
  );

  return v_rows;
end;
$$;

create or replace function public.create_appeal(
  p_token text,
  p_entry_id bigint default null,
  p_ind integer default null,
  p_category text default 'evaluation_review',
  p_subject text default '',
  p_message text default '',
  p_att_name text default null,
  p_att_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_entry public.entries%rowtype;
  v_ind integer := p_ind;
  v_id bigint;
  v_subj text := left(trim(coalesce(p_subject, '')), 180);
  v_msg text := left(trim(coalesce(p_message, '')), 2000);
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya yaroqsiz';
  end if;
  if length(v_subj) < 3 or length(v_msg) < 5 then
    raise exception 'Mavzu va murojaat matnini to''liq kiriting';
  end if;

  if p_entry_id is not null then
    select * into v_entry from public.entries where id = p_entry_id;
    if v_entry.id is null or v_entry.uid <> v_sess.uid then
      raise exception 'Tanlangan yutuq topilmadi yoki sizga tegishli emas';
    end if;
    v_ind := v_entry.ind;
  end if;

  insert into public.appeals(uid, entry_id, ind, category, subject, message, attachment_name, attachment_url)
  values (v_sess.uid, p_entry_id, v_ind, coalesce(nullif(p_category, ''), 'evaluation_review'), v_subj, v_msg, p_att_name, p_att_url)
  returning id into v_id;

  perform public._log_activity(
    v_sess.uid, v_sess.name, v_sess.role,
    'appeal_created', 'appeal', v_id::text, 'success',
    jsonb_build_object('ind', v_ind, 'entry_id', p_entry_id, 'uid', v_sess.uid)
  );

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.add_appeal_message(
  p_token text,
  p_appeal_id bigint,
  p_body text,
  p_att_name text default null,
  p_att_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_ap public.appeals%rowtype;
  v_body text := left(trim(coalesce(p_body, '')), 2000);
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya yaroqsiz';
  end if;
  if length(v_body) < 2 then
    raise exception 'Xabar matnini kiriting';
  end if;

  select * into v_ap from public.appeals where id = p_appeal_id;
  if v_ap.id is null then
    raise exception 'Murojaat topilmadi';
  end if;

  if not (
    v_sess.role = 'director'
    or v_ap.uid = v_sess.uid
    or (v_sess.role = 'reviewer' and (v_ap.assigned_to = v_sess.uid or (v_ap.ind is not null and public.reviewer_can_review(v_sess.name, v_ap.ind))))
  ) then
    raise exception 'Ushbu murojaatga javob yozish huquqi yo''q';
  end if;

  insert into public.appeal_messages(appeal_id, sender_uid, sender_name, sender_role, body, attachment_name, attachment_url)
  values (p_appeal_id, v_sess.uid, v_sess.name, v_sess.role, v_body, p_att_name, p_att_url);

  update public.appeals set updated_at = now() where id = p_appeal_id;

  if v_sess.uid <> v_ap.uid then
    insert into public.notifications(uid, kind, title, body, ref_type, ref_id)
    values (v_ap.uid, 'appeal_reply', 'Murojaatingizga javob keldi', left(v_ap.subject, 120), 'appeal', p_appeal_id::text || ':' || extract(epoch from now())::bigint::text)
    on conflict do nothing;

    perform public._log_activity(
      v_sess.uid, v_sess.name, v_sess.role,
      'appeal_reply', 'appeal', p_appeal_id::text, 'success',
      jsonb_build_object('uid', v_ap.uid)
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.update_appeal_status(
  p_token text,
  p_appeal_id bigint,
  p_status text,
  p_note text default '',
  p_escalate boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_ap public.appeals%rowtype;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null or v_sess.role not in ('director', 'reviewer') then
    raise exception 'Murojaat holatini o''zgartirish uchun ruxsat yo''q';
  end if;
  if p_status not in ('new', 'in_review', 'needs_info', 'resolved', 'rejected') then
    raise exception 'Noto''g''ri holat';
  end if;

  select * into v_ap from public.appeals where id = p_appeal_id for update;
  if v_ap.id is null then
    raise exception 'Murojaat topilmadi';
  end if;

  if v_sess.role = 'reviewer' and not (v_ap.assigned_to = v_sess.uid or (v_ap.ind is not null and public.reviewer_can_review(v_sess.name, v_ap.ind))) then
    raise exception 'Ushbu murojaat sizga biriktirilmagan';
  end if;

  update public.appeals
  set status = p_status,
      resolution_note = left(coalesce(p_note, ''), 500),
      escalated_to_director = case when p_escalate then true else escalated_to_director end,
      assigned_to = coalesce(assigned_to, v_sess.uid),
      updated_at = now()
  where id = p_appeal_id;

  insert into public.notifications(uid, kind, title, body, ref_type, ref_id)
  values (
    v_ap.uid,
    'appeal_status',
    'Murojaat holati yangilandi',
    left(v_ap.subject, 120),
    'appeal_st',
    p_appeal_id::text || ':' || p_status
  )
  on conflict do nothing;

  perform public._log_activity(
    v_sess.uid, v_sess.name, v_sess.role,
    'appeal_status_changed', 'appeal', p_appeal_id::text, 'success',
    jsonb_build_object('status', p_status, 'escalate', p_escalate, 'uid', v_ap.uid)
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. MODULE 3: PERSONAL DEVELOPMENT PLAN RPCs
-- ----------------------------------------------------------------------------
create or replace function public.get_dev_goals(p_token text)
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
    raise exception 'Sessiya yaroqsiz';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id,
    'uid', g.uid,
    'title', g.title,
    'section', g.section,
    'ind', g.ind,
    'target_date', g.target_date,
    'description', g.description,
    'status', g.status,
    'completed_at', g.completed_at,
    'created_at', g.created_at,
    'updated_at', g.updated_at,
    'tasks', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.id asc)
      from public.development_tasks t
      where t.goal_id = g.id
    ), '[]'::jsonb)
  ) order by (g.status = 'active') desc, g.created_at desc), '[]'::jsonb)
  into v_rows
  from public.development_goals g
  where g.uid = v_sess.uid;

  return v_rows;
end;
$$;

create or replace function public.upsert_dev_goal(p_token text, p_goal jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_id bigint := (p_goal->>'id')::bigint;
  v_title text := left(trim(coalesce(p_goal->>'title', '')), 180);
  v_sec text := coalesce(nullif(p_goal->>'section', ''), 'A');
  v_status text := coalesce(nullif(p_goal->>'status', ''), 'active');
  v_ind integer := nullif(p_goal->>'ind', '')::integer;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya yaroqsiz';
  end if;
  if length(v_title) < 2 then
    raise exception 'Maqsad nomini kiriting';
  end if;
  if v_sec not in ('A', 'B', 'C', 'general') then
    v_sec := 'general';
  end if;
  if v_status not in ('active', 'completed', 'paused') then
    v_status := 'active';
  end if;

  if v_id is not null then
    update public.development_goals
    set title = v_title,
        section = v_sec,
        ind = v_ind,
        target_date = left(coalesce(p_goal->>'target_date', ''), 20),
        description = left(coalesce(p_goal->>'description', ''), 1000),
        status = v_status,
        completed_at = case when v_status = 'completed' and completed_at is null then now() when v_status <> 'completed' then null else completed_at end,
        updated_at = now()
    where id = v_id and uid = v_sess.uid;
  else
    insert into public.development_goals(uid, title, section, ind, target_date, description, status)
    values (
      v_sess.uid,
      v_title,
      v_sec,
      v_ind,
      left(coalesce(p_goal->>'target_date', ''), 20),
      left(coalesce(p_goal->>'description', ''), 1000),
      v_status
    )
    returning id into v_id;

    perform public._log_activity(v_sess.uid, v_sess.name, v_sess.role, 'goal_created', 'dev_goal', v_id::text, 'success', jsonb_build_object('section', v_sec));
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.delete_dev_goal(p_token text, p_goal_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya yaroqsiz';
  end if;

  delete from public.development_goals where id = p_goal_id and uid = v_sess.uid;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.upsert_dev_task(p_token text, p_task jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
  v_id bigint := (p_task->>'id')::bigint;
  v_goal_id bigint := (p_task->>'goal_id')::bigint;
  v_goal public.development_goals%rowtype;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya yaroqsiz';
  end if;

  if v_id is not null then
    update public.development_tasks
    set title = coalesce(nullif(left(trim(p_task->>'title'), 180), ''), title),
        done = case when p_task ? 'done' then coalesce((p_task->>'done')::boolean, false) else done end
    where id = v_id and uid = v_sess.uid;
  else
    select * into v_goal from public.development_goals where id = v_goal_id and uid = v_sess.uid;
    if v_goal.id is null then
      raise exception 'Maqsad topilmadi';
    end if;
    insert into public.development_tasks(goal_id, uid, title, due_date)
    values (v_goal_id, v_sess.uid, left(trim(coalesce(p_task->>'title', '')), 180), left(coalesce(p_task->>'due_date', ''), 20))
    returning id into v_id;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.delete_dev_task(p_token text, p_task_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess record;
begin
  select * into v_sess from public._verify_session(p_token);
  if v_sess.uid is null then
    raise exception 'Sessiya yaroqsiz';
  end if;
  delete from public.development_tasks where id = p_task_id and uid = v_sess.uid;
  return jsonb_build_object('ok', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY & GRANTS FOR V6 TABLES/FUNCTIONS
-- ----------------------------------------------------------------------------
alter table public.appeals enable row level security;
alter table public.appeal_messages enable row level security;
alter table public.development_goals enable row level security;
alter table public.development_tasks enable row level security;

revoke all on public.appeals from anon, authenticated;
revoke all on public.appeal_messages from anon, authenticated;
revoke all on public.development_goals from anon, authenticated;
revoke all on public.development_tasks from anon, authenticated;

grant execute on function public.update_my_profile(text, jsonb) to anon, authenticated;
grant execute on function public.update_my_preferences(text, jsonb) to anon, authenticated;
grant execute on function public.get_my_sessions(text) to anon, authenticated;
grant execute on function public.revoke_my_session(text, uuid) to anon, authenticated;
grant execute on function public.get_my_activity(text, integer) to anon, authenticated;
grant execute on function public.get_appeals(text) to anon, authenticated;
grant execute on function public.create_appeal(text, bigint, integer, text, text, text, text, text) to anon, authenticated;
grant execute on function public.add_appeal_message(text, bigint, text, text, text) to anon, authenticated;
grant execute on function public.update_appeal_status(text, bigint, text, text, boolean) to anon, authenticated;
grant execute on function public.get_dev_goals(text) to anon, authenticated;
grant execute on function public.upsert_dev_goal(text, jsonb) to anon, authenticated;
grant execute on function public.delete_dev_goal(text, bigint) to anon, authenticated;
grant execute on function public.upsert_dev_task(text, jsonb) to anon, authenticated;
grant execute on function public.delete_dev_task(text, bigint) to anon, authenticated;

commit;
