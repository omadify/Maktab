#!/usr/bin/env python3
"""Norin tuman ixtisoslashtirilgan maktabi — pedagoglar reyting platformasi.
Faqat Python 3.9+ standart kutubxonasi kerak (pip o'rnatish shart emas).
Ishga tushirish:  python3 app.py   →  http://localhost:8080
"""
import base64, csv, hashlib, hmac, io, json, os, re, secrets, sqlite3, time
from contextlib import contextmanager
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get('REYTING_DATA', os.path.join(BASE, 'data'))
UPLOADS = os.path.join(DATA, 'uploads')
DBFILE = os.path.join(DATA, 'reyting.db')
HOST = os.environ.get('REYTING_HOST', '127.0.0.1')
PORT = int(os.environ.get('REYTING_PORT', '8080'))
HTTPS = os.environ.get('REYTING_HTTPS') == '1'      # nginx/HTTPS ortida ishlasa 1 qiling
MAX_FILE = 8 * 1024 * 1024
SESSION_TTL = 12 * 3600
os.makedirs(UPLOADS, exist_ok=True)

# ---- Indikatorlar (26-AF buyruq asosida; ballar maktab tomonidan o'zgartirilishi mumkin) ----
_I = [
 (1, 'A', 'Ilmiy daraja', 10, 'N.Meliboyeva', 'Diplom, ilmiy daraja guvohnomasi', [('DSc / professor', 10), ('PhD / dotsent', 8), ('TOP–1000 OTM diplomi', 6)]),
 (2, 'A', 'Malaka toifasi', 5, 'N.Meliboyeva', 'Attestatsiya guvohnomasi', [('Oliy toifa', 5), ('Birinchi toifa', 4), ('Ikkinchi toifa', 3)]),
 (3, 'A', 'Mutaxassislik fanidan sertifikat', 5, 'D.Rasulova', 'IELTS, CEFR, SAT, TESOL, milliy sertifikat', [('Xalqaro sertifikat', 5), ('Milliy sertifikat', 3)]),
 (4, 'A', 'Boshqa fandan sertifikat', 10, 'D.Rasulova', 'Sertifikat nusxasi', [('Xalqaro sertifikat', 5), ('Milliy sertifikat', 3)]),
 (5, 'A', 'Malaka oshirish va stajirovka', 5, 'N.Meliboyeva', 'Sertifikat, buyruq, QR-kodli hujjat', [('Stajirovka', 3), ('Malaka oshirish kursi', 2)]),
 (6, 'A', 'Pedagog tanlovlari', 5, 'D.Rasulova', 'Diplom, buyruq', [('Xalqaro g‘olib', 5), ('Respublika g‘olibi', 4), ('Viloyat g‘olibi', 2), ('Pedagog sifatida ishtirok', 1)]),
 (7, 'A', 'Metodik va mualliflik ishlari', 10, 'D.Rasulova', 'Qo‘llanma, maqola, videodars, fan kengashi qarori', [('Metodik qo‘llanma', 4), ('Ilmiy maqola', 2), ('Videodars', 2), ('Ommalashtirilgan tajriba', 2)]),
 (14, 'B', 'Olimpiada va tanlov g‘oliblari (o‘quvchi)', 10, 'D.Rasulova, S.Murodov', 'Diplom, buyruq', [('Xalqaro g‘olib', 5), ('Respublika g‘olibi', 3), ('Viloyat g‘olibi', 2), ('Ishtirokchi', 1)]),
 (15, 'B', 'O‘quvchilar sertifikatlari', 5, 'S.Murodov, D.Rasulova', 'IELTS, CEFR, SAT, milliy sertifikat', [('Xalqaro sertifikat', 2), ('Milliy sertifikat', 1)]),
 (16, 'B', 'STEAM, StartUp, ilmiy loyihalar', 10, 'S.Murodov, D.Rasulova', 'Loyiha, patent, grant, diplom', [('Tanlov g‘olibi', 5), ('Loyiha ishtiroki', 2)]),
 (17, 'B', 'Ma’naviy-ma’rifiy va sport yutuqlari', 5, 'A.Karimjonov, S.Murodov', 'Diplom, bayonnoma', [('G‘olib', 2), ('Sovrindor', 1), ('Ishtirokchi', 1)]),
 (18, 'C', 'O‘quvchilar o‘zlashtirishi (fan bo‘yicha)', 20, 'D.Rasulova', 'Elektron jurnal, CHSB tahlili (sinf va chorak)', [('90% va yuqori (sinf/chorak)', 4), ('80–89% (sinf/chorak)', 3), ('70–79% (sinf/chorak)', 2)]),
 (19, 'C', 'Fan tanlovlarida ishtirok (o‘quvchi va pedagog)', 10, 'D.Rasulova', 'Ishtirokchilar ro‘yxati, buyruq, sertifikat', [('Xalqaro tanlovda o‘quvchi ishtiroki', 2), ('Respublika tanlovida o‘quvchi ishtiroki', 1), ('Pedagogning o‘zi ishtiroki', 2)]),
 (20, 'C', 'Sport va ma’naviy-ma’rifiy tadbirlardagi ishtirok', 10, 'A.Karimjonov, S.Murodov', 'Tadbirlar rejasi, bayonnoma, foto/video, buyruq', [('O‘quvchini tayyorlab qatnashtirish', 1), ('Pedagogning o‘zi ishtiroki', 1), ('Tashkilotchi / murabbiy', 2), ('Sovrinli o‘rin (o‘quvchi)', 3)]),
 (21, 'C', 'Sertifikat olgan o‘quvchilarni tayyorlagan ustoz', 10, 'S.Murodov, D.Rasulova', 'IELTS, CEFR, SAT, milliy sertifikat nusxasi', [('Xalqaro sertifikat (o‘quvchi uchun)', 3), ('Milliy sertifikat (o‘quvchi uchun)', 2)]),
]
IND = [dict(id=a, sec=b, name=c, max=d, resp=e, doc=f, types=[list(t) for t in g]) for a, b, c, d, e, f, g in _I]
IMAP = {i['id']: i for i in IND}
SEC = {'A': ['Pedagoglar salohiyati', 50], 'B': ['O‘quvchilar yutuqlari', 30], 'C': ['Fan bo‘yicha faollik va rag‘bat', 50]}
ROLES = ('teacher', 'reviewer', 'it_admin', 'director', 'admin')

def make_login(name, c):
    tr = {
        'sh': 'sh', 'ch': 'ch', 'yo': 'yo', 'yu': 'yu', 'ya': 'ya', 'ye': 'ye',
        "o'": 'o', "g'": 'g', "o‘": 'o', "g‘": 'g', "o`": 'o', "g`": 'g',
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e',
        'ё': 'yo', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k',
        'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
        'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ҳ': 'h',
        'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'i',
        'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': 'o', 'ғ': 'g', 'q': 'q'
    }
    s = name.lower()
    for k, v in tr.items():
        s = s.replace(k, v)
    words = re.findall(r'[a-z]+', s)
    if not words:
        base = "ustoz"
    elif len(words) == 1:
        base = words[0][:15]
    else:
        # e.g. Anvar Aliyev -> a.aliyev
        base = f"{words[0][0]}.{words[1]}"[:20]
    
    login = base
    idx = 2
    while c.execute('select 1 from users where login=?', (login,)).fetchone():
        login = f"{base}{idx}"
        idx += 1
    return login

@contextmanager
def conn():
    c = sqlite3.connect(DBFILE, timeout=10)
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    finally:
        c.close()

def hash_pw(pw, salt=None):
    salt = salt or secrets.token_bytes(16)
    h = hashlib.scrypt(pw.encode(), salt=salt, n=2 ** 14, r=8, p=1)
    return salt.hex() + '$' + h.hex()

def check_pw(pw, stored):
    try:
        s, h = stored.split('$')
        return hmac.compare_digest(hash_pw(pw, bytes.fromhex(s)), stored)
    except Exception:
        return False

def temp_pw():
    return "Mktb#" + "".join(secrets.choice("23456789ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(5))

def init():
    with conn() as c:
        c.execute('pragma journal_mode=wal')
        c.executescript('''
        create table if not exists users(id integer primary key autoincrement, login text unique not null,
          name text not null, subject text default '', role text not null default 'teacher', ranked integer default 1,
          pw text not null, active integer default 1, must_change integer default 1, created real);
        create table if not exists sessions(h text primary key, uid integer, exp real);
        create table if not exists entries(id integer primary key autoincrement, uid integer not null, ind integer not null,
          type text, qty integer, pts real, descr text, date text, fname text, fpath text,
          status text default 'pending', rev integer, note text default '', created real);
        create index if not exists ix_e on entries(uid, status);''')
        if not c.execute('select 1 from users').fetchone():
            now = time.time()
            # 1. Direktor: Alisher Xolmatov (director - 4 ta rolni to‘liq qila oladi)
            dpw = os.environ.get('REYTING_DIRECTOR_PASSWORD', 'Direktor#2026')
            c.execute("insert into users(login,name,subject,role,ranked,pw,must_change,created) values(?,?,?,?,?,?,?,?)",
                      ('direktor', 'Alisher Xolmatov', 'Maktab direktori', 'director', 0, hash_pw(dpw), 0, now))
            
            # 2. IT Administrator: Hasanboy Toshboyev (it_admin)
            ipw = os.environ.get('REYTING_IT_PASSWORD', 'Admin#2026')
            c.execute("insert into users(login,name,subject,role,ranked,pw,must_change,created) values(?,?,?,?,?,?,?,?)",
                      ('it_admin', 'Hasanboy Toshboyev', 'Informatika va IT', 'it_admin', 0, hash_pw(ipw), 0, now))
            
            # 3. 4 nafar mas‘ul ekspertlar (26-AF buyruq bo‘yicha)
            masullar = [
                ('n.meliboyeva', 'N.Meliboyeva', 'O‘IBDO‘ / Metodist', 'Masul#2026'),
                ('d.rasulova', 'D.Rasulova', 'O‘IBDO‘ / Metodist', 'Masul#2026'),
                ('s.murodov', 'S.Murodov', 'Metodist', 'Masul#2026'),
                ('a.karimjonov', 'A.Karimjonov', 'MMIBDO‘ / Yoshlar yetakchisi', 'Masul#2026'),
            ]
            for l, n, s, p in masullar:
                c.execute("insert into users(login,name,subject,role,ranked,pw,must_change,created) values(?,?,?,?,?,?,?,?)",
                          (l, n, s, 'reviewer', 1, hash_pw(p), 0, now))
            
            print('\n' + '='*55)
            print('=== Norin tuman ixtisoslashtirilgan maktabi ===')
            print('Boshlang‘ich tizim akkauntlari yaratildi:')
            print(f'1. Direktor:  login: direktor   | parol: {dpw}  (Alisher Xolmatov)')
            print(f'2. IT Admin:   login: it_admin   | parol: {ipw}     (Hasanboy Toshboyev)')
            print('3. Mas‘ullar:  loginlar: n.meliboyeva, d.rasulova, s.murodov, a.karimjonov | parol: Masul#2026')
            print('='*55 + '\n')

def calc(rows):
    """rows: [(ind, status, pts)] -> hisob"""
    ok, wait = {}, {}
    for ind, st, pts in rows:
        if ind in IMAP and st in ('approved', 'pending'):
            d = ok if st == 'approved' else wait
            d[ind] = d.get(ind, 0) + pts
    by, S = {}, {'A': 0, 'B': 0, 'C': 0}
    for i in IND:
        o = min(ok.get(i['id'], 0), i['max'])
        w = min(wait.get(i['id'], 0), i['max'] - o)
        by[i['id']] = {'ok': o, 'wait': w}
        S[i['sec']] += o
    return {'by': by, 'A': S['A'], 'B': S['B'], 'C': S['C'], 'T': S['A'] + S['B'] + S['C']}

def ranking(c):
    users = c.execute("select id,name,subject from users where active=1 and ranked=1").fetchall()
    rows = {}
    for r in c.execute('select uid,ind,status,pts from entries'):
        rows.setdefault(r['uid'], []).append((r['ind'], r['status'], r['pts']))
    out = []
    for u in users:
        k = calc(rows.get(u['id'], []))
        out.append({'id': u['id'], 'name': u['name'], 'subject': u['subject'], 'A': k['A'], 'B': k['B'], 'C': k['C'], 'T': k['T']})
    out.sort(key=lambda x: (-x['T'], -x['A'], x['name']))
    for n, x in enumerate(out, 1):
        x['rank'] = n
    return out

def entry_dict(r, names=None):
    d = {k: r[k] for k in ('id', 'uid', 'ind', 'type', 'qty', 'pts', 'descr', 'date', 'status', 'note')}
    d['file'] = r['fname'] if r['fpath'] else None
    if names is not None:
        d['name'] = names.get(r['uid'], '')
    return d

FAILS = {}
MAGIC = {'pdf': b'%PDF', 'png': b'\x89PNG', 'jpg': b'\xff\xd8', 'jpeg': b'\xff\xd8'}
CTYPE = {'pdf': 'application/pdf', 'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg'}
STATIC = {'/': ('index.html', 'text/html; charset=utf-8'), '/app.js': ('app.js', 'text/javascript; charset=utf-8'),
          '/style.css': ('style.css', 'text/css; charset=utf-8')}

class Err(Exception):
    def __init__(s, code, msg):
        s.code, s.msg = code, msg

class H(BaseHTTPRequestHandler):
    server_version = 'Reyting'
    def log_message(self, *a):
        pass

    def send(self, code, body, ctype, extra=()):
        self._resp = (code, body, ctype, extra)   # commitdan keyin yuboriladi

    def flush(self):
        code, body, ctype, extra = self._resp
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'")
        self.send_header('Cache-Control', 'no-store')
        for k, v in extra:
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def js(self, obj, code=200, extra=()):
        self.send(code, json.dumps(obj, ensure_ascii=False).encode(), 'application/json; charset=utf-8', extra)

    def body(self):
        n = int(self.headers.get('Content-Length') or 0)
        if n > MAX_FILE * 2:
            raise Err(413, 'Hajm juda katta')
        if 'application/json' not in (self.headers.get('Content-Type') or ''):
            raise Err(400, 'Noto‘g‘ri so‘rov')
        try:
            return json.loads(self.rfile.read(n) or b'{}')
        except ValueError:
            raise Err(400, 'Noto‘g‘ri JSON')

    def auth(self, c):
        m = re.search(r'sid=([\w-]+)', self.headers.get('Cookie', ''))
        if not m:
            return None
        h = hashlib.sha256(m.group(1).encode()).hexdigest()
        return c.execute('select u.* from sessions s join users u on u.id=s.uid where s.h=? and s.exp>? and u.active=1', (h, time.time())).fetchone()

    def do_GET(self): self.run('GET')
    def do_POST(self): self.run('POST')
    def do_DELETE(self): self.run('DELETE')

    def run(self, method):
        self._resp = None
        try:
            self.dispatch(method)
        except Err as e:
            self.js({'error': e.msg}, e.code)
        except Exception as e:
            print('XATO:', repr(e))
            self.js({'error': 'Server xatosi'}, 500)
        if self._resp:
            self.flush()

    def dispatch(self, method):
        if True:
            u = urlparse(self.path)
            p, q = u.path, parse_qs(u.query)
            if method == 'GET' and p in STATIC:
                f, ct = STATIC[p]
                with open(os.path.join(BASE, 'static', f), 'rb') as fh:
                    return self.send(200, fh.read(), ct)
            if not (p.startswith('/api/') or p.startswith('/files/')):
                raise Err(404, 'Topilmadi')
            with conn() as c:
                me = self.auth(c)
                if p == '/api/login' and method == 'POST':
                    return self.login(c)
                if not me:
                    raise Err(401, 'Tizimga kiring')
                if me['must_change'] and p not in ('/api/me', '/api/password', '/api/logout'):
                    raise Err(403, 'Avval parolni almashtiring')
                self.route(c, me, method, p, q)

    def login(self, c):
        d = self.body()
        login, pw = str(d.get('login', '')).strip().lower(), str(d.get('password', ''))
        key = (self.client_address[0], login)
        f = [t for t in FAILS.get(key, []) if t > time.time() - 600]
        if len(f) >= 5:
            raise Err(429, 'Juda ko‘p urinish. 10 daqiqadan keyin qayta urining.')
        u = c.execute('select * from users where login=? and active=1', (login,)).fetchone()
        if not u or not check_pw(pw, u['pw']):
            FAILS[key] = f + [time.time()]
            raise Err(401, 'Login yoki parol noto‘g‘ri')
        FAILS.pop(key, None)
        tok = secrets.token_urlsafe(32)
        c.execute('delete from sessions where exp<?', (time.time(),))
        c.execute('insert into sessions values(?,?,?)', (hashlib.sha256(tok.encode()).hexdigest(), u['id'], time.time() + SESSION_TTL))
        ck = 'sid=%s; HttpOnly; SameSite=Strict; Path=/; Max-Age=%d%s' % (tok, SESSION_TTL, '; Secure' if HTTPS else '')
        self.js({'ok': True}, extra=[('Set-Cookie', ck)])

    def route(self, c, me, method, p, q):
        role = me['role']
        is_dir = role in ('director', 'admin')
        is_it = role in ('it_admin', 'admin')
        can_rev = role in ('reviewer', 'director', 'admin')
        can_usr = is_it or is_dir
        staff = can_rev or is_it
        def need(ok):
            if not ok:
                raise Err(403, 'Ruxsat yo‘q')
        def meinfo():
            return {'id': me['id'], 'login': me['login'], 'name': me['name'], 'subject': me['subject'], 'role': role, 'must_change': bool(me['must_change'])}

        if p == '/api/logout' and method == 'POST':
            m = re.search(r'sid=([\w-]+)', self.headers.get('Cookie', ''))
            if m:
                c.execute('delete from sessions where h=?', (hashlib.sha256(m.group(1).encode()).hexdigest(),))
            return self.js({'ok': True}, extra=[('Set-Cookie', 'sid=; Max-Age=0; Path=/')])
        if p == '/api/me':
            return self.js(meinfo())
        if p == '/api/config':
            return self.js({'ind': IND, 'sec': SEC})
        if p == '/api/password' and method == 'POST':
            d = self.body()
            if not check_pw(str(d.get('old', '')), me['pw']):
                raise Err(400, 'Joriy parol noto‘g‘ri')
            new = str(d.get('new', ''))
            if len(new) < 8:
                raise Err(400, 'Yangi parol kamida 8 belgi bo‘lsin')
            c.execute('update users set pw=?,must_change=0 where id=?', (hash_pw(new), me['id']))
            return self.js({'ok': True})
        if p == '/api/my':
            rows = c.execute('select * from entries where uid=? order by id desc', (me['id'],)).fetchall()
            k = calc([(r['ind'], r['status'], r['pts']) for r in rows])
            rk = next((x for x in ranking(c) if x['id'] == me['id']), None)
            return self.js({'me': meinfo(), 'calc': k, 'entries': [entry_dict(r) for r in rows], 'rank': rk and rk['rank'], 'total': len(ranking(c))})
        if p == '/api/ranking':
            return self.js(ranking(c))
        if p == '/api/entries' and method == 'POST':
            return self.add_entry(c, me)
        if p == '/api/entries' and method == 'GET':
            need(staff)
            st = (q.get('status') or ['pending'])[0]
            names = {r['id']: r['name'] for r in c.execute('select id,name from users')}
            sql, args = 'select * from entries', ()
            if st in ('pending', 'approved', 'rejected'):
                sql, args = sql + ' where status=?', (st,)
            rows = c.execute(sql + ' order by id desc limit 500', args).fetchall()
            return self.js([entry_dict(r, names) for r in rows])
        m = re.fullmatch(r'/api/entries/(\d+)', p)
        if m and method == 'DELETE':
            e = c.execute('select * from entries where id=?', (m.group(1),)).fetchone()
            if not e or (e['uid'] != me['id'] and role != 'admin') or (e['status'] == 'approved' and role != 'admin'):
                raise Err(403, 'O‘chirib bo‘lmaydi')
            self.rm_file(e)
            c.execute('delete from entries where id=?', (e['id'],))
            return self.js({'ok': True})
        m = re.fullmatch(r'/api/entries/(\d+)/review', p)
        if m and method == 'POST':
            need(can_rev)
            d = self.body()
            e = c.execute('select * from entries where id=?', (m.group(1),)).fetchone()
            if not e:
                raise Err(404, 'Topilmadi')
            if e['uid'] == me['id'] and not is_dir:
                raise Err(403, 'O‘z yutug‘ingizni tasdiqlay olmaysiz')
            if d.get('status') not in ('approved', 'rejected'):
                raise Err(400, 'Noto‘g‘ri holat')
            c.execute('update entries set status=?,rev=?,note=? where id=?', (d['status'], me['id'], str(d.get('note', ''))[:300], e['id']))
            return self.js({'ok': True})
        m = re.fullmatch(r'/files/(\d+)', p)
        if m:
            e = c.execute('select * from entries where id=?', (m.group(1),)).fetchone()
            if not e or not e['fpath'] or (e['uid'] != me['id'] and not staff):
                raise Err(404, 'Topilmadi')
            ext = e['fpath'].rsplit('.', 1)[-1]
            with open(os.path.join(UPLOADS, e['fpath']), 'rb') as fh:
                return self.send(200, fh.read(), CTYPE[ext], [('Content-Disposition', 'inline')])
        m = re.fullmatch(r'/api/portfolio/(\d+)', p)
        if m:
            uid = int(m.group(1))
            need(uid == me['id'] or staff)
            u = c.execute('select id,name,subject from users where id=?', (uid,)).fetchone()
            if not u:
                raise Err(404, 'Topilmadi')
            rows = c.execute('select * from entries where uid=? order by date desc,id desc', (uid,)).fetchall()
            rk = next((x for x in ranking(c) if x['id'] == uid), None)
            return self.js({'user': dict(u), 'calc': calc([(r['ind'], r['status'], r['pts']) for r in rows]),
                            'entries': [entry_dict(r) for r in rows], 'rank': rk and rk['rank']})
        if p == '/api/stats':
            need(staff)
            rk = ranking(c)
            subj = {}
            for x in rk:
                s = subj.setdefault(x['subject'] or '—', {'subject': x['subject'] or '—', 'n': 0, 'sum': 0})
                s['n'] += 1
                s['sum'] += x['T']
            cnt = {r['status']: r['n'] for r in c.execute('select status,count(*) n from entries group by status')}
            ind = {r['ind']: r['n'] for r in c.execute("select ind,count(*) n from entries where status='approved' group by ind")}
            return self.js({'teachers': len(rk), 'pending': cnt.get('pending', 0), 'approved': cnt.get('approved', 0), 'rejected': cnt.get('rejected', 0),
                            'avg': round(sum(x['T'] for x in rk) / len(rk), 1) if rk else 0,
                            'subjects': [{'subject': s['subject'], 'n': s['n'], 'avg': round(s['sum'] / s['n'], 1)} for s in sorted(subj.values(), key=lambda s: -s['sum'] / s['n'])],
                            'ind': ind})
        if p == '/api/export.csv':
            need(staff)
            buf = io.StringIO()
            w = csv.writer(buf, delimiter=';')
            w.writerow(['O‘rin', 'Pedagog', 'Fan', 'Salohiyat (50)', 'Yutuqlar (30)', 'Rag‘bat (50)', 'Jami (130)'])
            for x in ranking(c):
                w.writerow([x['rank'], x['name'], x['subject'], x['A'], x['B'], x['C'], x['T']])
            return self.send(200, ('\ufeff' + buf.getvalue()).encode('utf-8'), 'text/csv; charset=utf-8',
                             [('Content-Disposition', 'attachment; filename="reyting.csv"')])
        if p.startswith('/api/users'):
            need(can_usr)
            return self.users(c, me, method, p)
        raise Err(404, 'Topilmadi')

    def rm_file(self, e):
        if e['fpath']:
            try:
                os.remove(os.path.join(UPLOADS, e['fpath']))
            except OSError:
                pass

    def add_entry(self, c, me):
        d = self.body()
        try:
            ind = IMAP[int(d.get('ind'))]
            qty = int(d.get('qty', 1))
        except (KeyError, TypeError, ValueError):
            raise Err(400, 'Indikatorni tanlang')
        t = next((t for t in ind['types'] if t[0] == d.get('type')), None)
        descr = str(d.get('descr', '')).strip()[:300]
        date = str(d.get('date', ''))
        if not t or not 1 <= qty <= 20 or not descr or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
            raise Err(400, 'Maydonlarni to‘liq va to‘g‘ri to‘ldiring')
        fname = fpath = None
        f = d.get('file')
        if f:
            fname = re.sub(r'[^\w.\- ]', '_', str(f.get('name', 'fayl')))[:100]
            ext = fname.rsplit('.', 1)[-1].lower() if '.' in fname else ''
            try:
                raw = base64.b64decode(f.get('data', ''), validate=True)
            except Exception:
                raise Err(400, 'Fayl o‘qilmadi')
            if ext not in MAGIC or not raw.startswith(MAGIC[ext]) or len(raw) > MAX_FILE:
                raise Err(400, 'Faqat PDF, JPG yoki PNG (8 MB gacha)')
            fpath = secrets.token_hex(16) + '.' + ext
            with open(os.path.join(UPLOADS, fpath), 'wb') as fh:
                fh.write(raw)
        cur = c.execute('insert into entries(uid,ind,type,qty,pts,descr,date,fname,fpath,created) values(?,?,?,?,?,?,?,?,?,?)',
                        (me['id'], ind['id'], t[0], qty, t[1] * qty, descr, date, fname, fpath, time.time()))
        self.js({'ok': True, 'id': cur.lastrowid})

    def users(self, c, me, method, p):
        if p == '/api/users' and method == 'GET':
            rows = c.execute('select id,login,name,subject,role,ranked,active from users order by active desc,name').fetchall()
            return self.js([dict(r) for r in rows])
        d = self.body()
        if p == '/api/users' and method == 'POST':
            return self.js(self.new_user(c, d.get('login'), d.get('name'), d.get('subject', ''), d.get('role', 'teacher'), d.get('ranked', 1)))
        if p == '/api/users/bulk' and method == 'POST':
            res, bad = [], []
            raw_text = str(d.get('text', '')).strip()
            for line in raw_text.splitlines():
                line = line.strip()
                if not line or line.startswith('#') or line.lower().startswith('f.i.sh') or line.lower().startswith('login'):
                    continue
                delim = ';' if ';' in line else ('\t' if '\t' in line else ',')
                parts = [x.strip() for x in line.split(delim) if x.strip()]
                if not parts:
                    continue
                login = ""
                if len(parts) == 1:
                    name, subject = parts[0], ""
                elif len(parts) == 2:
                    if re.fullmatch(r'[a-z0-9._-]{3,30}', parts[0].lower()) and not re.search(r'[a-z0-9._-]{3,30}', parts[1].lower()):
                        login, name, subject = parts[0], parts[1], ""
                    else:
                        name, subject = parts[0], parts[1]
                else:
                    if re.fullmatch(r'[a-z0-9._-]{3,30}', parts[0].lower()):
                        login, name, subject = parts[0], parts[1], parts[2]
                    else:
                        name, subject = parts[0], parts[1]
                try:
                    res.append(self.new_user(c, login, name, subject, 'teacher', 1))
                except Err as e:
                    bad.append(name + ': ' + e.msg)
                except Exception as e:
                    bad.append(name + f': Xatolik ({str(e)})')
            return self.js({'created': res, 'errors': bad})
        m = re.fullmatch(r'/api/users/(\d+)', p)
        if m and method == 'POST':
            uid = int(m.group(1))
            u = c.execute('select * from users where id=?', (uid,)).fetchone()
            if not u:
                raise Err(404, 'Topilmadi')
            if d.get('reset'):
                pw = temp_pw()
                c.execute('update users set pw=?,must_change=1 where id=?', (hash_pw(pw), uid))
                c.execute('delete from sessions where uid=?', (uid,))
                return self.js({'login': u['login'], 'password': pw})
            role = d.get('role', u['role'])
            if role not in ROLES or (uid == me['id'] and (role != 'admin' or not d.get('active', 1))):
                raise Err(400, 'O‘zingizning rolingizni o‘zgartirib bo‘lmaydi')
            c.execute('update users set name=?,subject=?,role=?,ranked=?,active=? where id=?',
                      (str(d.get('name', u['name']))[:100], str(d.get('subject', u['subject']))[:60], role,
                       1 if d.get('ranked', u['ranked']) else 0, 1 if d.get('active', u['active']) else 0, uid))
            if not d.get('active', 1):
                c.execute('delete from sessions where uid=?', (uid,))
            return self.js({'ok': True})
        raise Err(404, 'Topilmadi')

    def new_user(self, c, login, name, subject, role, ranked):
        name = str(name or '').strip()
        if not name:
            raise Err(400, 'F.I.Sh. kiritilishi shart')
        if role not in ROLES:
            role = 'teacher'
        login = str(login or '').strip().lower()
        if not login:
            login = make_login(name, c)
        elif not re.fullmatch(r'[a-z0-9._-]{3,30}', login):
            raise Err(400, f'Login faqat lotin harf va raqamlar bo‘lsin: {login}')
        elif c.execute('select 1 from users where login=?', (login,)).fetchone():
            raise Err(400, f'Bu login band: {login}')
        pw = temp_pw()
        c.execute('insert into users(login,name,subject,role,ranked,pw,must_change,created) values(?,?,?,?,?,?,1,?)',
                  (login, name[:100], str(subject)[:60], role, 1 if ranked else 0, hash_pw(pw), time.time()))
        return {'login': login, 'name': name, 'subject': subject, 'password': pw}

if __name__ == '__main__':
    init()
    print('Reyting platformasi: http://%s:%d' % (HOST, PORT))
    ThreadingHTTPServer((HOST, PORT), H).serve_forever()
