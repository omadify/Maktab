"""Database & file storage abstraction supporting Supabase (PostgREST + Storage) and local SQLite."""
import json
import os
import sqlite3
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request

from config import DB_FILE, DATA_DIR, SSL_CA_FILE, SUPABASE_BUCKET, SUPABASE_KEY, SUPABASE_URL, UPLOADS_DIR


def _ssl_ctx():
    if SSL_CA_FILE and os.path.exists(SSL_CA_FILE):
        return ssl.create_default_context(cafile=SSL_CA_FILE)
    return ssl.create_default_context()


class SupabaseBackend:
    """Pure-stdlib HTTPS client for Supabase PostgREST and Storage APIs."""

    mode = "supabase"

    def __init__(self, url, key, bucket):
        self.url = url.rstrip("/")
        self.key = key
        self.bucket = bucket
        self.ctx = _ssl_ctx()

    def _req(self, path, method="GET", body=None, headers=None, raw=False):
        hdrs = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
        }
        if not raw and body is not None:
            hdrs["Content-Type"] = "application/json"
        if headers:
            hdrs.update(headers)
        data = body if (raw or body is None) else json.dumps(body).encode("utf-8")
        req = urllib.request.Request(f"{self.url}{path}", data=data, method=method, headers=hdrs)
        try:
            with urllib.request.urlopen(req, context=self.ctx, timeout=20) as resp:
                out = resp.read()
                if raw:
                    return out
                return json.loads(out.decode("utf-8")) if out else None
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase HTTP {e.code} ({path}): {msg}") from e

    def init_db(self, seed_fn):
        # Ensure bucket exists (ignore if already exists)
        try:
            self._req("/storage/v1/bucket", method="POST", body={"id": self.bucket, "name": self.bucket, "public": False})
        except Exception:
            pass
        rows = self._req("/rest/v1/users?select=id&limit=1")
        if not rows:
            seed_fn(self)

    def get_user_by_login(self, login):
        q = urllib.parse.quote(login, safe="")
        rows = self._req(f"/rest/v1/users?login=eq.{q}&limit=1")
        return rows[0] if rows else None

    def get_user_by_id(self, uid):
        rows = self._req(f"/rest/v1/users?id=eq.{int(uid)}&limit=1")
        return rows[0] if rows else None

    def user_exists(self, login):
        q = urllib.parse.quote(login, safe="")
        rows = self._req(f"/rest/v1/users?login=eq.{q}&select=id&limit=1")
        return bool(rows)

    def list_users(self):
        return self._req("/rest/v1/users?select=id,login,name,subject,role,ranked,active&order=active.desc,name.asc")

    def create_user(self, login, name, subject, role, ranked, pw_hash, must_change=1):
        rows = self._req(
            "/rest/v1/users",
            method="POST",
            headers={"Prefer": "return=representation"},
            body={
                "login": login,
                "name": name,
                "subject": subject,
                "role": role,
                "ranked": 1 if ranked else 0,
                "pw": pw_hash,
                "active": 1,
                "must_change": 1 if must_change else 0,
                "created": time.time(),
            },
        )
        return rows[0]

    def update_user(self, uid, fields):
        self._req(f"/rest/v1/users?id=eq.{int(uid)}", method="PATCH", body=fields)

    def create_session(self, h, uid, exp):
        self._req("/rest/v1/sessions", method="POST", body={"h": h, "uid": int(uid), "exp": exp})

    def get_session_user(self, h, now):
        q = urllib.parse.quote(h, safe="")
        rows = self._req(f"/rest/v1/sessions?h=eq.{q}&exp=gt.{now}&limit=1")
        if not rows:
            return None
        u = self.get_user_by_id(rows[0]["uid"])
        if not u or not u.get("active"):
            return None
        return u

    def delete_session(self, h):
        q = urllib.parse.quote(h, safe="")
        self._req(f"/rest/v1/sessions?h=eq.{q}", method="DELETE")

    def delete_user_sessions(self, uid):
        self._req(f"/rest/v1/sessions?uid=eq.{int(uid)}", method="DELETE")

    def list_entries_for_user(self, uid, order_by_date=False):
        order = "date.desc,id.desc" if order_by_date else "id.desc"
        return self._req(f"/rest/v1/entries?uid=eq.{int(uid)}&order={order}")

    def list_entries(self, status=None, limit=500):
        filt = f"&status=eq.{urllib.parse.quote(status, safe='')}" if status in ("pending", "approved", "rejected") else ""
        return self._req(f"/rest/v1/entries?order=id.desc&limit={int(limit)}{filt}")

    def get_entry(self, eid):
        rows = self._req(f"/rest/v1/entries?id=eq.{int(eid)}&limit=1")
        return rows[0] if rows else None

    def create_entry(self, uid, ind, typ, qty, pts, descr, date, fname, fpath):
        rows = self._req(
            "/rest/v1/entries",
            method="POST",
            headers={"Prefer": "return=representation"},
            body={
                "uid": int(uid),
                "ind": int(ind),
                "type": typ,
                "qty": int(qty),
                "pts": float(pts),
                "descr": descr,
                "date": date,
                "fname": fname,
                "fpath": fpath,
                "status": "pending",
                "note": "",
                "created": time.time(),
            },
        )
        return rows[0]["id"]

    def update_entry_review(self, eid, status, rev, note):
        self._req(
            f"/rest/v1/entries?id=eq.{int(eid)}",
            method="PATCH",
            body={"status": status, "rev": int(rev), "note": note},
        )

    def delete_entry(self, eid):
        self._req(f"/rest/v1/entries?id=eq.{int(eid)}", method="DELETE")

    def get_all_ranked_users_and_entries(self):
        users = self._req("/rest/v1/users?active=eq.1&ranked=eq.1&select=id,name,subject")
        entries = self._req("/rest/v1/entries?select=uid,ind,status,pts")
        return users, entries

    def get_all_user_names(self):
        rows = self._req("/rest/v1/users?select=id,name")
        return {r["id"]: r["name"] for r in rows}

    def save_file(self, fpath, raw_bytes, ctype):
        q = urllib.parse.quote(fpath, safe="")
        self._req(
            f"/storage/v1/object/{self.bucket}/{q}",
            method="POST",
            body=raw_bytes,
            headers={"Content-Type": ctype, "x-upsert": "true"},
            raw=True,
        )

    def read_file(self, fpath):
        q = urllib.parse.quote(fpath, safe="")
        return self._req(f"/storage/v1/object/{self.bucket}/{q}", method="GET", raw=True)

    def delete_file(self, fpath):
        if not fpath:
            return
        try:
            q = urllib.parse.quote(fpath, safe="")
            self._req(f"/storage/v1/object/{self.bucket}/{q}", method="DELETE", raw=True)
        except Exception:
            pass

    def log_audit(self, actor_id, actor_name, action, target="", details=""):
        try:
            self._req(
                "/rest/v1/audit_logs",
                method="POST",
                body={
                    "actor_id": actor_id,
                    "actor_name": str(actor_name)[:100],
                    "action": str(action)[:60],
                    "target": str(target)[:100],
                    "details": str(details)[:300],
                    "created": time.time(),
                },
            )
        except Exception:
            pass

    def list_audits(self, limit=100):
        try:
            return self._req(f"/rest/v1/audit_logs?order=created.desc&limit={int(limit)}")
        except Exception:
            return []


class SQLiteBackend:
    """Local SQLite + disk storage fallback when Supabase credentials are not set."""

    mode = "sqlite"

    def __init__(self, db_file, uploads_dir):
        self.db_file = db_file
        self.uploads_dir = uploads_dir
        os.makedirs(DATA_DIR, exist_ok=True)
        os.makedirs(uploads_dir, exist_ok=True)

    def _conn(self):
        c = sqlite3.connect(self.db_file, timeout=15)
        c.row_factory = sqlite3.Row
        return c

    def init_db(self, seed_fn):
        with self._conn() as c:
            c.execute("pragma journal_mode=wal")
            c.executescript(
                """
                create table if not exists users(
                  id integer primary key autoincrement,
                  login text unique not null,
                  name text not null,
                  subject text default '',
                  role text not null default 'teacher',
                  ranked integer default 1,
                  pw text not null,
                  active integer default 1,
                  must_change integer default 1,
                  created real
                );
                create table if not exists sessions(h text primary key, uid integer, exp real);
                create table if not exists entries(
                  id integer primary key autoincrement,
                  uid integer not null,
                  ind integer not null,
                  type text,
                  qty integer,
                  pts real,
                  descr text,
                  date text,
                  fname text,
                  fpath text,
                  status text default 'pending',
                  rev integer,
                  note text default '',
                  created real
                );
                create index if not exists ix_e on entries(uid, status);
                create table if not exists audit_logs(
                  id integer primary key autoincrement,
                  actor_id integer,
                  actor_name text default '',
                  action text not null,
                  target text default '',
                  details text default '',
                  created real
                );
                """
            )
            has_users = c.execute("select 1 from users limit 1").fetchone()
        if not has_users:
            seed_fn(self)

    def get_user_by_login(self, login):
        with self._conn() as c:
            r = c.execute("select * from users where login=?", (login,)).fetchone()
            return dict(r) if r else None

    def get_user_by_id(self, uid):
        with self._conn() as c:
            r = c.execute("select * from users where id=?", (uid,)).fetchone()
            return dict(r) if r else None

    def user_exists(self, login):
        with self._conn() as c:
            return bool(c.execute("select 1 from users where login=?", (login,)).fetchone())

    def list_users(self):
        with self._conn() as c:
            rows = c.execute("select id,login,name,subject,role,ranked,active from users order by active desc,name").fetchall()
            return [dict(r) for r in rows]

    def create_user(self, login, name, subject, role, ranked, pw_hash, must_change=1):
        with self._conn() as c:
            cur = c.execute(
                "insert into users(login,name,subject,role,ranked,pw,must_change,created) values(?,?,?,?,?,?,?,?)",
                (login, name, subject, role, 1 if ranked else 0, pw_hash, 1 if must_change else 0, time.time()),
            )
            uid = cur.lastrowid
            return dict(c.execute("select * from users where id=?", (uid,)).fetchone())

    def update_user(self, uid, fields):
        if not fields:
            return
        cols = ", ".join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [uid]
        with self._conn() as c:
            c.execute(f"update users set {cols} where id=?", vals)

    def create_session(self, h, uid, exp):
        with self._conn() as c:
            c.execute("insert into sessions(h,uid,exp) values(?,?,?)", (h, uid, exp))

    def get_session_user(self, h, now):
        with self._conn() as c:
            r = c.execute(
                "select u.* from sessions s join users u on u.id=s.uid where s.h=? and s.exp>? and u.active=1",
                (h, now),
            ).fetchone()
            return dict(r) if r else None

    def delete_session(self, h):
        with self._conn() as c:
            c.execute("delete from sessions where h=?", (h,))

    def delete_user_sessions(self, uid):
        with self._conn() as c:
            c.execute("delete from sessions where uid=?", (uid,))

    def list_entries_for_user(self, uid, order_by_date=False):
        order = "date desc, id desc" if order_by_date else "id desc"
        with self._conn() as c:
            rows = c.execute(f"select * from entries where uid=? order by {order}", (uid,)).fetchall()
            return [dict(r) for r in rows]

    def list_entries(self, status=None, limit=500):
        with self._conn() as c:
            sql = "select * from entries"
            args = []
            if status in ("pending", "approved", "rejected"):
                sql += " where status=?"
                args.append(status)
            sql += " order by id desc limit ?"
            args.append(limit)
            return [dict(r) for r in c.execute(sql, args).fetchall()]

    def get_entry(self, eid):
        with self._conn() as c:
            r = c.execute("select * from entries where id=?", (eid,)).fetchone()
            return dict(r) if r else None

    def create_entry(self, uid, ind, typ, qty, pts, descr, date, fname, fpath):
        with self._conn() as c:
            cur = c.execute(
                "insert into entries(uid,ind,type,qty,pts,descr,date,fname,fpath,created) values(?,?,?,?,?,?,?,?,?,?)",
                (uid, ind, typ, qty, pts, descr, date, fname, fpath, time.time()),
            )
            return cur.lastrowid

    def update_entry_review(self, eid, status, rev, note):
        with self._conn() as c:
            c.execute("update entries set status=?,rev=?,note=? where id=?", (status, rev, note, eid))

    def delete_entry(self, eid):
        with self._conn() as c:
            c.execute("delete from entries where id=?", (eid,))

    def get_all_ranked_users_and_entries(self):
        with self._conn() as c:
            users = [dict(r) for r in c.execute("select id,name,subject from users where active=1 and ranked=1").fetchall()]
            entries = [dict(r) for r in c.execute("select uid,ind,status,pts from entries").fetchall()]
            return users, entries

    def get_all_user_names(self):
        with self._conn() as c:
            return {r["id"]: r["name"] for r in c.execute("select id,name from users").fetchall()}

    def save_file(self, fpath, raw_bytes, ctype):
        with open(os.path.join(self.uploads_dir, fpath), "wb") as fh:
            fh.write(raw_bytes)

    def read_file(self, fpath):
        with open(os.path.join(self.uploads_dir, fpath), "rb") as fh:
            return fh.read()

    def delete_file(self, fpath):
        if fpath:
            try:
                os.remove(os.path.join(self.uploads_dir, fpath))
            except OSError:
                pass

    def log_audit(self, actor_id, actor_name, action, target="", details=""):
        with self._conn() as c:
            c.execute(
                "insert into audit_logs(actor_id,actor_name,action,target,details,created) values(?,?,?,?,?,?)",
                (actor_id, str(actor_name)[:100], str(action)[:60], str(target)[:100], str(details)[:300], time.time()),
            )

    def list_audits(self, limit=100):
        with self._conn() as c:
            rows = c.execute("select * from audit_logs order by created desc limit ?", (limit,)).fetchall()
            return [dict(r) for r in rows]


def get_backend():
    if SUPABASE_URL and SUPABASE_KEY:
        return SupabaseBackend(SUPABASE_URL, SUPABASE_KEY, SUPABASE_BUCKET)
    return SQLiteBackend(DB_FILE, UPLOADS_DIR)
