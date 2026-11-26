#!/usr/bin/env python3
"""Norin tuman ixtisoslashtirilgan maktabi — Pedagoglar reyting platformasi (26-AF buyruq).
Pure Python 3.9+ stdlib server with Supabase (PostgreSQL + Storage) and SQLite support.
"""
import base64
import csv
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from config import HOST, HTTPS, IMAP, IND, MAX_FILE, PORT, ROLES, SEC, SESSION_TTL, STATIC_DIR, calc_scores
from db import get_backend
from importer import make_login, parse_text_rows, parse_xlsx_bytes, temp_pw


DB = get_backend()
FAILS = {}
MAGIC = {"pdf": b"%PDF", "png": b"\x89PNG", "jpg": b"\xff\xd8", "jpeg": b"\xff\xd8"}
CTYPE = {"pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg"}
STATIC = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/app.js": ("app.js", "application/javascript; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
}


def hash_pw(pw, salt=None):
    salt = salt or secrets.token_bytes(16)
    h = hashlib.scrypt(pw.encode(), salt=salt, n=2**14, r=8, p=1)
    return salt.hex() + "$" + h.hex()


def check_pw(pw, stored):
    try:
        s, _ = stored.split("$")
        return hmac.compare_digest(hash_pw(pw, bytes.fromhex(s)), stored)
    except Exception:
        return False


def seed_initial_users(db):
    """Create initial Director (Alisher Xolmatov), IT Admin (Hasanboy Toshboyev), and 4 Reviewers."""
    dpw = os.environ.get("REYTING_DIRECTOR_PASSWORD", "Direktor#2026")
    ipw = os.environ.get("REYTING_IT_PASSWORD", "Admin#2026")
    mpw = os.environ.get("REYTING_REVIEWER_PASSWORD", "Masul#2026")

    db.create_user("direktor", "Alisher Xolmatov", "Maktab direktori", "director", 0, hash_pw(dpw), must_change=0)
    db.create_user("it_admin", "Hasanboy Toshboyev", "Informatika va IT", "it_admin", 0, hash_pw(ipw), must_change=0)

    reviewers = [
        ("n.meliboyeva", "N.Meliboyeva", "O‘IBDO‘ / Metodist"),
        ("d.rasulova", "D.Rasulova", "O‘IBDO‘ / Metodist"),
        ("s.murodov", "S.Murodov", "Aniq fanlar metodisti"),
        ("a.karimjonov", "A.Karimjonov", "MMIBDO‘ / Sport va ma’naviyat"),
    ]
    for login, name, subj in reviewers:
        db.create_user(login, name, subj, "reviewer", 1, hash_pw(mpw), must_change=0)

    print("\n" + "=" * 56)
    print(f"Norin tuman ixtisoslashtirilgan maktabi [{db.mode.upper()}]")
    print("Boshlang‘ich akkauntlar yaratildi:")
    print(f"  1. Direktor:  direktor   | {dpw} (Alisher Xolmatov)")
    print(f"  2. IT Admin:  it_admin   | {ipw}    (Hasanboy Toshboyev)")
    print(f"  3. Mas‘ullar: n.meliboyeva, d.rasulova, s.murodov, a.karimjonov | {mpw}")
    print("=" * 56 + "\n")


def compute_ranking():
    users, entries = DB.get_all_ranked_users_and_entries()
    by_uid = {}
    for r in entries:
        by_uid.setdefault(r["uid"], []).append((r["ind"], r["status"], r["pts"]))
    out = []
    for u in users:
        k = calc_scores(by_uid.get(u["id"], []))
        out.append({
            "id": u["id"],
            "name": u["name"],
            "subject": u.get("subject", ""),
            "A": k["A"],
            "B": k["B"],
            "C": k["C"],
            "T": k["T"],
        })
    out.sort(key=lambda x: (-x["T"], -x["A"], x["name"]))
    for n, x in enumerate(out, 1):
        x["rank"] = n
    return out


def entry_dict(r, names=None):
    d = {k: r.get(k) for k in ("id", "uid", "ind", "type", "qty", "pts", "descr", "date", "status", "note")}
    d["file"] = r.get("fname") if r.get("fpath") else None
    if names is not None:
        d["name"] = names.get(r["uid"], "")
    return d


class Err(Exception):
    def __init__(self, code, msg):
        self.code = code
        self.msg = msg


class Handler(BaseHTTPRequestHandler):
    server_version = "ReytingPlatforma/2.0"

    def log_message(self, *a):
        pass

    def send(self, code, body, ctype, extra=()):
        self._resp = (code, body, ctype, extra)

    def flush(self):
        code, body, ctype, extra = self._resp
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self' blob:; frame-ancestors 'none'",
        )
        self.send_header("Cache-Control", "no-store")
        for k, v in extra:
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def js(self, obj, code=200, extra=()):
        self.send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8", extra)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_FILE * 2:
            raise Err(413, "Hajm juda katta")
        if "application/json" not in (self.headers.get("Content-Type") or ""):
            raise Err(400, "Noto‘g‘ri so‘rov")
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            raise Err(400, "Noto‘g‘ri JSON")

    def auth(self):
        m = re.search(r"sid=([\w-]+)", self.headers.get("Cookie", ""))
        if not m:
            return None
        h = hashlib.sha256(m.group(1).encode()).hexdigest()
        return DB.get_session_user(h, time.time())

    def do_GET(self):
        self.run("GET")

    def do_POST(self):
        self.run("POST")

    def do_DELETE(self):
        self.run("DELETE")

    def run(self, method):
        self._resp = None
        try:
            self.dispatch(method)
        except Err as e:
            self.js({"error": e.msg}, e.code)
        except Exception as e:
            print("XATO:", repr(e))
            self.js({"error": "Server xatosi"}, 500)
        if self._resp:
            self.flush()

    def dispatch(self, method):
        u = urlparse(self.path)
        p, q = u.path, parse_qs(u.query)

        if method == "GET" and p in STATIC:
            fname, ct = STATIC[p]
            with open(os.path.join(STATIC_DIR, fname), "rb") as fh:
                return self.send(200, fh.read(), ct)

        if p == "/api/health" and method == "GET":
            return self.js({"ok": True, "storage": DB.mode})

        if not (p.startswith("/api/") or p.startswith("/files/")):
            raise Err(404, "Topilmadi")

        if p == "/api/login" and method == "POST":
            return self.login()

        me = self.auth()
        if not me:
            raise Err(401, "Tizimga kiring")
        if me.get("must_change") and p not in ("/api/me", "/api/password", "/api/logout"):
            raise Err(403, "Avval parolni almashtiring")

        self.route(me, method, p, q)

    def login(self):
        d = self.body()
        login = str(d.get("login", "")).strip().lower()
        pw = str(d.get("password", ""))
        key = (self.client_address[0], login)
        fails = [t for t in FAILS.get(key, []) if t > time.time() - 600]
        if len(fails) >= 5:
            raise Err(429, "Juda ko‘p urinish. 10 daqiqadan keyin qayta urining.")

        u = DB.get_user_by_login(login)
        if not u or not u.get("active") or not check_pw(pw, u["pw"]):
            FAILS[key] = fails + [time.time()]
            raise Err(401, "Login yoki parol noto‘g‘ri")

        FAILS.pop(key, None)
        sid = secrets.token_urlsafe(32)
        h = hashlib.sha256(sid.encode()).hexdigest()
        DB.create_session(h, u["id"], time.time() + SESSION_TTL)
        DB.log_audit(u["id"], u["name"], "login", u["login"], f"Rol: {u['role']}")

        cookie = f"sid={sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age={SESSION_TTL}"
        if HTTPS:
            cookie += "; Secure"
        self.js({"ok": True}, extra=[("Set-Cookie", cookie)])

    def route(self, me, method, p, q):
        role = me["role"]
        is_dir = role in ("director", "admin")
        is_it = role in ("it_admin", "admin")
        can_rev = role in ("reviewer", "director", "admin")
        can_usr = is_it or is_dir
        staff = can_rev or is_it

        def need(ok):
            if not ok:
                raise Err(403, "Sizda bu amal uchun ruxsat yo‘q")

        def meinfo():
            return {
                "id": me["id"],
                "login": me["login"],
                "name": me["name"],
                "subject": me.get("subject", ""),
                "role": role,
                "must_change": bool(me.get("must_change")),
                "storage": DB.mode,
            }

        if p == "/api/logout" and method == "POST":
            m = re.search(r"sid=([\w-]+)", self.headers.get("Cookie", ""))
            if m:
                DB.delete_session(hashlib.sha256(m.group(1).encode()).hexdigest())
            return self.js({"ok": True}, extra=[("Set-Cookie", "sid=; Max-Age=0; Path=/")])

        if p == "/api/me":
            return self.js(meinfo())

        if p == "/api/config":
            return self.js({"ind": IND, "sec": SEC, "storage": DB.mode})

        if p == "/api/password" and method == "POST":
            d = self.body()
            if not check_pw(str(d.get("old", "")), me["pw"]):
                raise Err(400, "Joriy parol noto‘g‘ri")
            new = str(d.get("new", ""))
            if len(new) < 8:
                raise Err(400, "Yangi parol kamida 8 belgidan iborat bo‘lsin")
            DB.update_user(me["id"], {"pw": hash_pw(new), "must_change": 0})
            DB.log_audit(me["id"], me["name"], "password_change", me["login"])
            return self.js({"ok": True})

        if p == "/api/my":
            rows = DB.list_entries_for_user(me["id"])
            k = calc_scores([(r["ind"], r["status"], r["pts"]) for r in rows])
            rk_all = compute_ranking()
            rk = next((x for x in rk_all if x["id"] == me["id"]), None)
            return self.js({
                "me": meinfo(),
                "calc": k,
                "entries": [entry_dict(r) for r in rows],
                "rank": rk and rk["rank"],
                "total": len(rk_all),
            })

        if p == "/api/ranking":
            return self.js(compute_ranking())

        if p == "/api/entries" and method == "POST":
            return self.add_entry(me, is_dir)

        if p == "/api/entries" and method == "GET":
            need(can_rev or is_dir)
            st = (q.get("status") or ["pending"])[0]
            names = DB.get_all_user_names()
            rows = DB.list_entries(status=st, limit=500)
            return self.js([entry_dict(r, names) for r in rows])

        m = re.fullmatch(r"/api/entries/(\d+)", p)
        if m and method == "DELETE":
            e = DB.get_entry(int(m.group(1)))
            if not e or (e["uid"] != me["id"] and not is_dir) or (e["status"] == "approved" and not is_dir):
                raise Err(403, "O‘chirib bo‘lmaydi")
            DB.delete_file(e.get("fpath"))
            DB.delete_entry(e["id"])
            DB.log_audit(me["id"], me["name"], "entry_delete", f"entry#{e['id']}", e.get("descr", ""))
            return self.js({"ok": True})

        m = re.fullmatch(r"/api/entries/(\d+)/review", p)
        if m and method == "POST":
            need(can_rev)
            d = self.body()
            e = DB.get_entry(int(m.group(1)))
            if not e:
                raise Err(404, "Topilmadi")
            if e["uid"] == me["id"] and not is_dir:
                raise Err(403, "O‘z yutug‘ingizni tasdiqlay olmaysiz")
            if d.get("status") not in ("approved", "rejected"):
                raise Err(400, "Noto‘g‘ri holat")
            note = str(d.get("note", ""))[:300]
            DB.update_entry_review(e["id"], d["status"], me["id"], note)
            DB.log_audit(me["id"], me["name"], f"review_{d['status']}", f"entry#{e['id']}", note)
            return self.js({"ok": True})

        m = re.fullmatch(r"/files/(\d+)", p)
        if m:
            e = DB.get_entry(int(m.group(1)))
            if not e or not e.get("fpath") or (e["uid"] != me["id"] and not staff):
                raise Err(404, "Topilmadi")
            ext = e["fpath"].rsplit(".", 1)[-1].lower()
            raw = DB.read_file(e["fpath"])
            return self.send(200, raw, CTYPE.get(ext, "application/octet-stream"), [("Content-Disposition", "inline")])

        m = re.fullmatch(r"/api/portfolio/(\d+)", p)
        if m:
            uid = int(m.group(1))
            need(uid == me["id"] or staff)
            u = DB.get_user_by_id(uid)
            if not u:
                raise Err(404, "Topilmadi")
            rows = DB.list_entries_for_user(uid, order_by_date=True)
            rk = next((x for x in compute_ranking() if x["id"] == uid), None)
            return self.js({
                "user": {"id": u["id"], "name": u["name"], "subject": u.get("subject", "")},
                "calc": calc_scores([(r["ind"], r["status"], r["pts"]) for r in rows]),
                "entries": [entry_dict(r) for r in rows],
                "rank": rk and rk["rank"],
            })

        if p == "/api/stats":
            need(staff)
            rk = compute_ranking()
            subj = {}
            for x in rk:
                s = subj.setdefault(x["subject"] or "—", {"subject": x["subject"] or "—", "n": 0, "sum": 0.0})
                s["n"] += 1
                s["sum"] += x["T"]
            all_entries = DB.list_entries(status=None, limit=5000)
            cnt = {"pending": 0, "approved": 0, "rejected": 0}
            ind = {}
            for r in all_entries:
                st = r.get("status", "pending")
                cnt[st] = cnt.get(st, 0) + 1
                if st == "approved":
                    ind[r["ind"]] = ind.get(r["ind"], 0) + 1
            return self.js({
                "teachers": len(rk),
                "pending": cnt["pending"],
                "approved": cnt["approved"],
                "rejected": cnt["rejected"],
                "avg": round(sum(x["T"] for x in rk) / len(rk), 1) if rk else 0,
                "subjects": [
                    {"subject": s["subject"], "n": s["n"], "avg": round(s["sum"] / s["n"], 1)}
                    for s in sorted(subj.values(), key=lambda s: -s["sum"] / s["n"])
                ],
                "ind": ind,
            })

        if p == "/api/export.csv":
            need(staff)
            buf = io.StringIO()
            w = csv.writer(buf, delimiter=";")
            w.writerow(["O‘rin", "Pedagog", "Fan", "Salohiyat (50)", "Yutuqlar (30)", "Rag‘bat (50)", "Jami (130)"])
            for x in compute_ranking():
                w.writerow([x["rank"], x["name"], x["subject"], x["A"], x["B"], x["C"], x["T"]])
            return self.send(
                200,
                ("\ufeff" + buf.getvalue()).encode("utf-8"),
                "text/csv; charset=utf-8",
                [("Content-Disposition", 'attachment; filename="reyting_hisobot.csv"')],
            )

        if p == "/api/audit" and method == "GET":
            need(can_usr)
            return self.js(DB.list_audits(limit=100))

        if p.startswith("/api/users"):
            need(can_usr)
            return self.users_api(me, method, p, is_dir)

        raise Err(404, "Topilmadi")

    def add_entry(self, me, is_dir):
        d = self.body()
        try:
            ind = IMAP[int(d.get("ind"))]
            qty = int(d.get("qty", 1))
        except (KeyError, TypeError, ValueError):
            raise Err(400, "Indikatorni tanlang")

        t = next((item for item in ind["types"] if item[0] == d.get("type")), None)
        descr = str(d.get("descr", "")).strip()[:300]
        date = str(d.get("date", ""))
        if not t or not (1 <= qty <= 20) or not descr or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
            raise Err(400, "Maydonlarni to‘liq va to‘g‘ri to‘ldiring")

        target_uid = me["id"]
        if is_dir and d.get("target_uid"):
            tu = DB.get_user_by_id(int(d["target_uid"]))
            if not tu:
                raise Err(404, "Tanlangan pedagog topilmadi")
            target_uid = tu["id"]

        fname = fpath = None
        f = d.get("file")
        if f:
            fname = re.sub(r"[^\w.\- ]", "_", str(f.get("name", "fayl")))[:100]
            ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else ""
            try:
                raw = base64.b64decode(f.get("data", ""), validate=True)
            except Exception:
                raise Err(400, "Fayl o‘qilmadi")
            if ext not in MAGIC or not raw.startswith(MAGIC[ext]) or len(raw) > MAX_FILE:
                raise Err(400, "Faqat PDF, JPG yoki PNG (8 MB gacha)")
            fpath = secrets.token_hex(16) + "." + ext
            DB.save_file(fpath, raw, CTYPE[ext])

        eid = DB.create_entry(target_uid, ind["id"], t[0], qty, t[1] * qty, descr, date, fname, fpath)
        DB.log_audit(me["id"], me["name"], "entry_submit", f"entry#{eid}", f"ind={ind['id']}, pts={t[1]*qty}")
        self.js({"ok": True, "id": eid})

    def users_api(self, me, method, p, is_dir):
        if p == "/api/users" and method == "GET":
            return self.js(DB.list_users())

        d = self.body()
        if p == "/api/users" and method == "POST":
            res = self.new_user(d.get("login"), d.get("name"), d.get("subject", ""), d.get("role", "teacher"), d.get("ranked", 1))
            DB.log_audit(me["id"], me["name"], "user_create", res["login"], res["name"])
            return self.js(res)

        if p in ("/api/users/bulk", "/api/users/upload") and method == "POST":
            rows = []
            # If Excel (.xlsx) or CSV/TXT uploaded as base64 file (processed strictly in RAM, never saved to disk!)
            if d.get("file"):
                fobj = d["file"]
                fname = str(fobj.get("name", "")).lower()
                try:
                    raw = base64.b64decode(fobj.get("data", ""), validate=True)
                except Exception:
                    raise Err(400, "Fayl o‘qilmadi")
                if fname.endswith(".xlsx"):
                    try:
                        rows = parse_xlsx_bytes(raw)
                    except Exception as ex:
                        raise Err(400, f"Excel faylini o‘qishda xatolik: {ex}")
                else:
                    try:
                        txt = raw.decode("utf-8")
                    except UnicodeDecodeError:
                        txt = raw.decode("cp1251", errors="replace")
                    rows = parse_text_rows(txt)
                # Explicit discard from memory
                del raw
            else:
                rows = parse_text_rows(str(d.get("text", "")))

            if not rows:
                raise Err(400, "Fayl yoki matnda pedagoglar ro‘yxati topilmadi")

            res, bad = [], []
            for login, name, subject in rows:
                try:
                    res.append(self.new_user(login, name, subject, "teacher", 1))
                except Err as e:
                    bad.append(f"{name}: {e.msg}")
            DB.log_audit(me["id"], me["name"], "user_bulk_import", f"{len(res)} ta pedagog", f"Xatolar: {len(bad)}")
            return self.js({"created": res, "errors": bad, "file_deleted": True})

        m = re.fullmatch(r"/api/users/(\d+)", p)
        if m and method == "POST":
            uid = int(m.group(1))
            u = DB.get_user_by_id(uid)
            if not u:
                raise Err(404, "Foydalanuvchi topilmadi")
            if d.get("reset"):
                pw = temp_pw()
                DB.update_user(uid, {"pw": hash_pw(pw), "must_change": 1})
                DB.delete_user_sessions(uid)
                DB.log_audit(me["id"], me["name"], "password_reset", u["login"])
                return self.js({"login": u["login"], "name": u["name"], "subject": u.get("subject", ""), "password": pw})

            role = d.get("role", u["role"])
            active = 1 if d.get("active", u["active"]) else 0
            if role not in ROLES:
                raise Err(400, "Noto‘g‘ri rol")
            if uid == me["id"] and (role != me["role"] or not active):
                raise Err(400, "O‘zingizning rolingizni yoki faolligingizni o‘zgartira olmaysiz")
            if role in ("director", "admin") and not is_dir:
                raise Err(403, "Faqat direktor direktor rolini bera oladi")

            DB.update_user(uid, {
                "name": str(d.get("name", u["name"]))[:100],
                "subject": str(d.get("subject", u.get("subject", "")))[:60],
                "role": role,
                "ranked": 1 if d.get("ranked", u["ranked"]) else 0,
                "active": active,
            })
            if not active:
                DB.delete_user_sessions(uid)
            DB.log_audit(me["id"], me["name"], "user_update", u["login"], f"role={role}, active={active}")
            return self.js({"ok": True})

        raise Err(404, "Topilmadi")

    def new_user(self, login, name, subject, role, ranked):
        name = str(name or "").strip()
        if not name:
            raise Err(400, "F.I.Sh. kiritilishi shart")
        if role not in ROLES:
            role = "teacher"
        login = str(login or "").strip().lower()
        if not login:
            login = make_login(name, DB.user_exists)
        elif not re.fullmatch(r"[a-z0-9._-]{3,30}", login):
            raise Err(400, f"Login faqat lotin harf/raqamdan iborat bo‘lsin: {login}")
        elif DB.user_exists(login):
            raise Err(400, f"Bu login band: {login}")

        pw = temp_pw()
        DB.create_user(login, name[:100], str(subject or "")[:60], role, 1 if ranked else 0, hash_pw(pw), must_change=1)
        return {"login": login, "name": name, "subject": subject or "", "password": pw}


if __name__ == "__main__":
    DB.init_db(seed_initial_users)
    print(f"Pedagoglar Reyting Platformasi [{DB.mode.upper()}]: http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
