// Norin tuman ixtisoslashtirilgan maktabi — Pedagoglar reyting platformasi (26-AF buyruq)
// 100% Serverless & Ultra-yengil Dinamik Frontend (Supabase REST API + Storage integratsiyasi)

const CFG = {
  SUPABASE_URL: 'https://melqpmfjwqivylnmucwc.supabase.co',
  SUPABASE_KEY: 'sb_publishable_EGUiTu1TGcU1EnhZqKkptQ_Wk2jyQpt',
  STORAGE_BUCKET: 'proofs'
};

// 26-AF buyruq bo‘yicha 15 ta indikator (Jami 130 ball)
const SEC = {
  A: ['Pedagoglar salohiyati', 50],
  B: ['O‘quvchilar yutuqlari', 30],
  C: ['Fan bo‘yicha faollik va rag‘bat', 50]
};

const _I = [
  [1, 'A', 'Ilmiy daraja', 10, ['N.Meliboyeva'], 'Diplom, ilmiy daraja guvohnomasi', [['DSc / professor', 10], ['PhD / dotsent', 8], ['TOP–1000 OTM diplomi', 6]]],
  [2, 'A', 'Malaka toifasi', 5, ['N.Meliboyeva'], 'Attestatsiya guvohnomasi', [['Oliy toifa', 5], ['Birinchi toifa', 4], ['Ikkinchi toifa', 3]]],
  [3, 'A', 'Mutaxassislik fanidan sertifikat', 5, ['D.Rasulova'], 'IELTS, CEFR, SAT, TESOL, milliy sertifikat', [['Xalqaro sertifikat', 5], ['Milliy sertifikat', 3]]],
  [4, 'A', 'Boshqa fandan sertifikat', 10, ['D.Rasulova'], 'Sertifikat nusxasi', [['Xalqaro sertifikat', 5], ['Milliy sertifikat', 3]]],
  [5, 'A', 'Malaka oshirish va stajirovka', 5, ['N.Meliboyeva'], 'Sertifikat, buyruq, QR-kodli hujjat', [['Stajirovka', 3], ['Malaka oshirish kursi', 2]]],
  [6, 'A', 'Pedagog tanlovlari', 5, ['D.Rasulova'], 'Diplom, buyruq', [['Xalqaro g‘olib', 5], ['Respublika g‘olibi', 4], ['Viloyat g‘olibi', 2], ['Pedagog sifatida ishtirok', 1]]],
  [7, 'A', 'Metodik va mualliflik ishlari', 10, ['D.Rasulova'], 'Qo‘llanma, maqola, videodars, fan kengashi qarori', [['Metodik qo‘llanma', 4], ['Ilmiy maqola', 2], ['Videodars', 2], ['Ommalashtirilgan tajriba', 2]]],
  [14, 'B', 'Olimpiada va tanlov g‘oliblari (o‘quvchi)', 10, ['D.Rasulova', 'S.Murodov'], 'Diplom, buyruq', [['Xalqaro g‘olib', 5], ['Respublika g‘olibi', 3], ['Viloyat g‘olibi', 2], ['Ishtirokchi', 1]]],
  [15, 'B', 'O‘quvchilar sertifikatlari', 5, ['S.Murodov', 'D.Rasulova'], 'IELTS, CEFR, SAT, milliy sertifikat', [['Xalqaro sertifikat', 2], ['Milliy sertifikat', 1]]],
  [16, 'B', 'STEAM, StartUp, ilmiy loyihalar', 10, ['S.Murodov', 'D.Rasulova'], 'Loyiha, patent, grant, diplom', [['Tanlov g‘olibi', 5], ['Loyiha ishtiroki', 2]]],
  [17, 'B', 'Ma’naviy-ma’rifiy va sport yutuqlari', 5, ['A.Karimjonov', 'S.Murodov'], 'Diplom, bayonnoma', [['G‘olib', 2], ['Sovrindor', 1], ['Ishtirokchi', 1]]],
  [18, 'C', 'O‘quvchilar o‘zlashtirishi (fan bo‘yicha)', 20, ['D.Rasulova'], 'Elektron jurnal, CHSB tahlili (sinf va chorak)', [['90% va yuqori (sinf/chorak)', 4], ['80–89% (sinf/chorak)', 3], ['70–79% (sinf/chorak)', 2]]],
  [19, 'C', 'Fan tanlovlarida ishtirok (o‘quvchi va pedagog)', 10, ['D.Rasulova'], 'Ishtirokchilar ro‘yxati, buyruq, sertifikat', [['Xalqaro tanlovda o‘quvchi ishtiroki', 2], ['Respublika tanlovida o‘quvchi ishtiroki', 1], ['Pedagogning o‘zi ishtiroki', 2]]],
  [20, 'C', 'Sport va ma’naviy-ma’rifiy tadbirlardagi ishtirok', 10, ['A.Karimjonov', 'S.Murodov'], 'Tadbirlar rejasi, bayonnoma, foto/video, buyruq', [['O‘quvchini tayyorlab qatnashtirish', 1], ['Pedagogning o‘zi ishtiroki', 1], ['Tashkilotchi / murabbiy', 2], ['Sovrinli o‘rin (o‘quvchi)', 3]]],
  [21, 'C', 'Sertifikat olgan o‘quvchilarni tayyorlagan ustoz', 10, ['S.Murodov', 'D.Rasulova'], 'IELTS, CEFR, SAT, milliy sertifikat nusxasi', [['Xalqaro sertifikat (o‘quvchi uchun)', 3], ['Milliy sertifikat (o‘quvchi uchun)', 2]]]
];

const IND = _I.map(a => ({ id: a[0], sec: a[1], name: a[2], max: a[3], resp: a[4], respStr: a[4].join(', '), doc: a[5], types: a[6] }));
const IMAP = Object.fromEntries(IND.map(i => [i.id, i]));
const ROLE = {
  teacher: 'Pedagog',
  reviewer: 'Mas’ul baholovchi',
  it_admin: 'IT mutaxassis',
  director: 'Maktab direktori'
};

// Supabase REST va Storage API mijozi
const api = {
  async req(endpoint, options = {}) {
    const url = `${CFG.SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': CFG.SUPABASE_KEY,
      'Authorization': `Bearer ${CFG.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Server xatosi (${res.status}): ${errText}`);
    }
    return res.status !== 204 ? res.json() : null;
  },

  async getUsers() {
    return this.req('users?select=*&order=id.asc');
  },

  async getEntries() {
    return this.req('entries?select=*&order=id.desc');
  },

  async insertEntry(entry) {
    return this.req('entries', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
  },

  async updateEntry(id, updates) {
    return this.req(`entries?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async deleteEntry(id) {
    return this.req(`entries?id=eq.${id}`, {
      method: 'DELETE'
    });
  },

  async insertUsers(users) {
    return this.req('users', {
      method: 'POST',
      body: JSON.stringify(users)
    });
  },

  async updateUser(id, updates) {
    return this.req(`users?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async uploadProofFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const cleanName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadUrl = `${CFG.SUPABASE_URL}/storage/v1/object/${CFG.STORAGE_BUCKET}/${cleanName}`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': CFG.SUPABASE_KEY,
        'Authorization': `Bearer ${CFG.SUPABASE_KEY}`,
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: file
    });
    if (!res.ok) {
      throw new Error('Fayl yuklashda xatolik yuz berdi');
    }
    const publicUrl = `${CFG.SUPABASE_URL}/storage/v1/object/public/${CFG.STORAGE_BUCKET}/${cleanName}`;
    return { fname: file.name, fpath: publicUrl };
  }
};

// Global holat
let STATE = {
  users: [],
  entries: []
};
let ME = null;
let CUR_TAB = '';

const $ = s => document.querySelector(s);
const esc = s => String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// Sessiyani saqlash va tiklash
function saveSession(user) {
  if (user) {
    sessionStorage.setItem('maktab_user', JSON.stringify(user));
  } else {
    sessionStorage.removeItem('maktab_user');
  }
}

function loadSession() {
  try {
    const s = sessionStorage.getItem('maktab_user');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

async function syncData() {
  try {
    const [u, e] = await Promise.all([api.getUsers(), api.getEntries()]);
    STATE.users = u || [];
    STATE.entries = e || [];
    if (ME) {
      const freshMe = STATE.users.find(x => x.id === ME.id);
      if (freshMe) {
        ME = freshMe;
        saveSession(ME);
      }
    }
  } catch (err) {
    console.error('Sinxronizatsiya xatosi:', err);
  }
}

function calcScores(rows) {
  const ok = {}, wait = {};
  for (const r of rows) {
    if (IMAP[r.ind] && (r.status === 'approved' || r.status === 'pending')) {
      const b = r.status === 'approved' ? ok : wait;
      b[r.ind] = (b[r.ind] || 0) + Number(r.pts);
    }
  }
  const by = {};
  const S = { A: 0, B: 0, C: 0 };
  for (const i of IND) {
    const o = Math.min(ok[i.id] || 0, i.max);
    const w = Math.min(wait[i.id] || 0, i.max - o);
    by[i.id] = { ok: o, wait: w };
    S[i.sec] += o;
  }
  return { by, A: S.A, B: S.B, C: S.C, T: S.A + S.B + S.C };
}

function getRanking() {
  const rankedUsers = STATE.users.filter(u => u.active && u.ranked);
  const byUid = {};
  for (const e of STATE.entries) {
    (byUid[e.uid] = byUid[e.uid] || []).push(e);
  }
  const res = rankedUsers.map(u => {
    const k = calcScores(byUid[u.id] || []);
    return { id: u.id, name: u.name, subject: u.subject || '—', A: k.A, B: k.B, C: k.C, T: k.T };
  });
  res.sort((x, y) => y.T - x.T || y.A - x.A || x.name.localeCompare(y.name));
  res.forEach((x, i) => x.rank = i + 1);
  return res;
}

// Avtomatik login yaratish (qotmaslik uchun Set orqali O(1) qidiruv)
function makeLogin(name, existingLogins = null) {
  const tr = {
    'sh':'sh','ch':'ch','yo':'yo','yu':'yu','ya':'ya','ye':'ye',
    "o'":'o',"g'":'g','o‘':'o','g‘':'g','o`':'o','g`':'g',
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'j',
    'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
    'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'x','ҳ':'h',
    'ц':'ts','ч':'ch','ш':'sh','щ':'sh','ъ':'','ы':'i','ь':'','э':'e',
    'ю':'yu','я':'ya','ў':'o','ғ':'g','қ':'q'
  };
  let s = String(name || '').toLowerCase();
  for (const [k, v] of Object.entries(tr)) s = s.split(k).join(v);
  const words = s.match(/[a-z]+/g) || [];
  let base = words.length > 1 ? `${words[0][0]}.${words[1]}`.slice(0, 18) : (words[0] || 'pedagog').slice(0, 15);
  let login = base;
  let idx = 2;
  const isTaken = l => existingLogins ? existingLogins.has(l) : STATE.users.some(u => u.login === l);
  while (isTaken(login) && idx < 1000) {
    login = `${base}${idx++}`;
  }
  if (existingLogins) existingLogins.add(login);
  return login;
}

function tempPw() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let p = 'Mktb#';
  for (let i = 0; i < 5; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

// Rollar bo'yicha menyu tuzilishi
function getTabs() {
  if (!ME) return [];
  const t = [];

  // 1. Maktab Direktori (Alisher Xolmatov) — Rahbariyat & 4-in-1 nazoratchi
  if (ME.role === 'director') {
    t.push(['ctl', 'Nazorat va Statistika']);
    t.push(['rev', 'Yutuqlarni Tasdiqlash (Barcha mezonlar)']);
    t.push(['rank', 'Reyting Jadvali']);
    t.push(['all_port', 'Pedagoglar Portfoliolari']);
    t.push(['users', 'Foydalanuvchilar']);
    return t;
  }

  // 2. IT Mutaxassis (Hasanboy Toshboyev) — Sof texnik boshqaruvchi
  if (ME.role === 'it_admin') {
    t.push(['users', 'Foydalanuvchilar va Excel Import']);
    t.push(['rank', 'Reyting Jadvali']);
    return t;
  }

  // 3. Mas’ul Baholovchi (N.Meliboyeva, D.Rasulova, S.Murodov, A.Karimjonov)
  if (ME.role === 'reviewer') {
    t.push(['rev', 'Tasdiqlash (Mening mezonlarim)']);
    t.push(['home', 'Mening natijam']);
    t.push(['add', 'Yutuq qo‘shish']);
    t.push(['rank', 'Reyting jadvali']);
    t.push(['port', 'Shaxsiy Portfolio']);
    t.push(['ctl', 'Nazorat va Statistika']);
    return t;
  }

  // 4. Pedagog (O‘qituvchi)
  t.push(['home', 'Mening natijam']);
  t.push(['add', 'Yutuq qo‘shish']);
  t.push(['rank', 'Reyting jadvali']);
  t.push(['port', 'Shaxsiy Portfolio']);
  return t;
}

// Boshqaruv renderi
function render() {
  if (!ME) return renderLogin();
  if (ME.must_change) return renderPasswordChange(true);
  renderApp();
}

function renderLogin() {
  $('#root').innerHTML = `
    <div class="login-wrap">
      <div class="login-box">
        <h1 style="color:var(--teal)">Norin tuman ixtisoslashtirilgan maktabi</h1>
        <p class="sub" style="margin-bottom:18px">Pedagoglar reyting platformasi (26-AF buyruq asosida). Tizimga kirish uchun login va parolingizni kiriting.</p>
        <form id="lf">
          <label for="lg">Login</label>
          <input id="lg" placeholder="masalan: direktor, it_admin yoki o‘qituvchi logini" required autofocus>
          <label for="pw">Parol</label>
          <input id="pw" type="password" required>
          <p class="err" id="le"></p>
          <button class="p" type="submit" id="l-btn" style="width:100%;margin-top:10px">Kirish</button>
        </form>
      </div>
    </div>
  `;

  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const btn = $('#l-btn');
    btn.disabled = true;
    btn.textContent = 'Kirilmoqda…';
    const l = $('#lg').value.trim().toLowerCase();
    const p = $('#pw').value;

    try {
      await syncData();
      const u = STATE.users.find(x => x.login === l && x.pw === p && x.active);
      if (!u) {
        $('#le').textContent = 'Login yoki parol noto‘g‘ri!';
        btn.disabled = false;
        btn.textContent = 'Kirish';
        return;
      }
      ME = u;
      saveSession(ME);
      CUR_TAB = '';
      render();
    } catch (err) {
      $('#le').textContent = 'Tizimga ulanishda xatolik: ' + err.message;
      btn.disabled = false;
      btn.textContent = 'Kirish';
    }
  };
}

function renderPasswordChange(forced) {
  $('#root').innerHTML = `
    <div class="login-wrap">
      <div class="login-box">
        <h1>${forced ? 'Yangi parol o‘rnating' : 'Parolni almashtirish'}</h1>
        <p class="sub">${forced ? 'Xavfsizlik yuzasidan birinchi kirishda parolingizni o‘zgartirishingiz shart.' : ''}</p>
        <form id="pf">
          <label>Joriy parol</label>
          <input id="po" type="password" required>
          <label>Yangi parol (kamida 8 belgi)</label>
          <input id="pn" type="password" minlength="8" required>
          <p class="err" id="pe"></p>
          <div class="row" style="margin-top:14px">
            <button class="p" type="submit" id="p-btn">Saqlash</button>
            ${!forced ? '<button class="s" type="button" id="pc">Bekor qilish</button>' : ''}
          </div>
        </form>
      </div>
    </div>
  `;
  if (!forced) $('#pc').onclick = () => render();
  $('#pf').onsubmit = async e => {
    e.preventDefault();
    if ($('#po').value !== ME.pw) return $('#pe').textContent = 'Joriy parol noto‘g‘ri!';
    const np = $('#pn').value;
    if (np.length < 8) return $('#pe').textContent = 'Parol kamida 8 belgi bo‘lsin!';

    const btn = $('#p-btn');
    btn.disabled = true;
    btn.textContent = 'Saqlanmoqda…';
    try {
      await api.updateUser(ME.id, { pw: np, must_change: 0 });
      ME.pw = np;
      ME.must_change = 0;
      saveSession(ME);
      alert('Parol muvaffaqiyatli yangilandi!');
      render();
    } catch (err) {
      $('#pe').textContent = 'Xatolik: ' + err.message;
      btn.disabled = false;
      btn.textContent = 'Saqlash';
    }
  };
}

function renderApp() {
  const tabs = getTabs();
  if (!tabs.some(t => t[0] === CUR_TAB)) {
    CUR_TAB = tabs[0][0];
  }

  $('#root').innerHTML = `
    <div class="shell">
      <nav class="noprint">
        <div class="brand">
          <div class="title">Pedagoglar Reytingi</div>
          <small>Norin tuman ixtisoslashtirilgan maktabi</small>
        </div>
        <div class="nav-tabs-wrapper">
          ${tabs.map(([id, label]) => `<button class="nav-btn ${CUR_TAB === id ? 'on' : ''}" data-tab="${id}">${label}</button>`).join('')}
        </div>
        <div class="sp"></div>
        <div class="who">
          <div><span class="badge-role">${ROLE[ME.role] || ME.role}</span></div>
          <b style="font-size:14px">${esc(ME.name)}</b>
          <div style="font-size:12px;opacity:.75">${esc(ME.subject || '')}</div>
          <div class="row" style="margin-top:8px">
            <button class="s" id="pw-btn" style="padding:4px 8px;font-size:11px">Parol</button>
            <button class="d" id="logout-btn" style="padding:4px 8px;font-size:11px">Chiqish</button>
          </div>
        </div>
      </nav>
      <main id="main-view"><div class="msg">Yuklanmoqda…</div></main>
    </div>
  `;

  document.querySelectorAll('[data-tab]').forEach(b => {
    b.onclick = () => { CUR_TAB = b.dataset.tab; render(); };
  });
  $('#logout-btn').onclick = () => {
    ME = null;
    saveSession(null);
    render();
  };
  $('#pw-btn').onclick = () => renderPasswordChange(false);

  renderTab();
}

function renderTab() {
  const main = $('#main-view');
  if (CUR_TAB === 'home') return renderHome(main);
  if (CUR_TAB === 'add') return renderAdd(main);
  if (CUR_TAB === 'rank') return renderRank(main);
  if (CUR_TAB === 'port') return renderPort(main);
  if (CUR_TAB === 'all_port') return renderAllPort(main);
  if (CUR_TAB === 'rev') return renderRev(main);
  if (CUR_TAB === 'ctl') return renderCtl(main);
  if (CUR_TAB === 'users') return renderUsers(main);
}

// Tab: Mening natijam (Pedagog & Mas'ul uchun)
function renderHome(el) {
  const myEntries = STATE.entries.filter(e => e.uid === ME.id);
  const k = calcScores(myEntries);
  const ranking = getRanking();
  const myRank = ranking.find(r => r.id === ME.id);

  const n = new Date();
  const t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  let d20 = new Date(n.getFullYear(), n.getMonth(), 20);
  if (d20 < t0) d20 = new Date(n.getFullYear(), n.getMonth() + 1, 20);
  let d25 = new Date(n.getFullYear(), n.getMonth(), 25);
  if (d25 < t0) d25 = new Date(n.getFullYear(), n.getMonth() + 1, 25);
  const n20 = Math.round((d20 - t0) / 864e5);
  const n25 = Math.round((d25 - t0) / 864e5);
  const fmt = d => d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });

  el.innerHTML = `
    <div class="page-head">
      <h2>Mening natijam — ${esc(ME.name)}</h2>
      <button class="s" onclick="CUR_TAB='port';render()">📄 Shaxsiy Portfolioni ko‘rish</button>
    </div>
    
    <div class="grid">
      <div class="card">
        <div class="k">Umumiy reyting bali</div>
        <div class="v">${k.T} <small>/ 130 ball</small></div>
        <div class="bar" style="margin-top:10px">
          <i class="a" style="width:${(k.A/130)*100}%"></i>
          <i class="b" style="width:${(k.B/130)*100}%"></i>
          <i class="c" style="width:${(k.C/130)*100}%"></i>
        </div>
        <div class="sub" style="margin-top:8px">
          Maktab reytingidagi o‘rni: <b>${myRank ? '#' + myRank.rank + ' (jami ' + ranking.length + ' ta o‘qituvchi ichida)' : 'Reytingda qatnashmaydi'}</b>
        </div>
      </div>
      <div class="card">
        <div class="k">A bo‘lim — Pedagog salohiyati</div>
        <div class="v">${k.A} <small>/ 50</small></div>
        <div class="sub">Ilmiy daraja, toifa, malaka oshirish, pedagog tanlovlari</div>
      </div>
      <div class="card">
        <div class="k">B bo‘lim — O‘quvchilar yutuqlari</div>
        <div class="v">${k.B} <small>/ 30</small></div>
        <div class="sub">Olimpiadalar, tanlovlar, STEAM, sport va ma’naviy yutuqlar</div>
      </div>
      <div class="card">
        <div class="k">C bo‘lim — Faollik va rag‘bat</div>
        <div class="v">${k.C} <small>/ 50</small></div>
        <div class="sub">O‘zlashtirish (CHSB), to‘garaklar, qo‘shimcha sertifikatlar</div>
      </div>
    </div>

    <div class="card">
      <h3>26-AF buyruq bo‘yicha topshirish muddatlari</h3>
      <p>
        Har oyning 20-sanasigacha mas’ullarga ma’lumot topshiriladi: <b>${fmt(d20)}</b> (${n20} kun qoldi).<br>
        O‘IBDO‘ga yakuniy yozma hisobot topshirish muddati: <b>${fmt(d25)}</b> (${n25} kun qoldi).
      </p>
    </div>

    <div class="card sc">
      <div class="row" style="justify-content:space-between;margin-bottom:12px">
        <h3>Mening kiritgan natijalarim (${myEntries.length} ta)</h3>
        <button class="p" onclick="CUR_TAB='add';render()">+ Yangi natija qo‘shish</button>
      </div>
      ${myEntries.length === 0 ? '<p class="msg">Hali natija qo‘shilmagan. “Yangi natija qo‘shish” tugmasi orqali boshlang.</p>' : `
        <table>
          <thead>
            <tr><th>Sana</th><th>Indikator</th><th>Yutuq va tavsif</th><th>Ball</th><th>Holat</th><th>Amal</th></tr>
          </thead>
          <tbody>
            ${myEntries.map(e => `
              <tr>
                <td>${esc(e.date)}</td>
                <td><b>${e.ind}. ${esc(IMAP[e.ind]?.name || '')}</b><div class="sub">Mas’ul: ${esc(IMAP[e.ind]?.respStr || '')}</div></td>
                <td>
                  ${esc(e.type)} × ${e.qty} ta
                  <div class="sub">${esc(e.descr)}</div>
                  ${e.fpath ? `<a href="${e.fpath}" target="_blank" rel="noopener" class="sub" style="color:var(--teal);text-decoration:underline">📎 Tasdiqlovchi hujjat</a>` : ''}
                  ${e.note ? `<div class="sub" style="color:var(--red)">Mas’ul izohi: ${esc(e.note)}</div>` : ''}
                </td>
                <td><b>${e.pts} ball</b></td>
                <td><span class="st-${e.status}">${e.status === 'approved' ? '✓ Tasdiqlangan' : (e.status === 'rejected' ? '✗ Rad etilgan' : '⏳ Tekshiruvda')}</span></td>
                <td>
                  ${e.status !== 'approved' ? `<button class="d" style="padding:4px 8px;font-size:11px" onclick="deleteEntry(${e.id})">O‘chirish</button>` : '—'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;
}

// Tab: Yutuq qo'shish
function renderAdd(el) {
  el.innerHTML = `
    <h2>Yangi yutuq kiritish (26-AF buyruq mezonlari)</h2>
    <div class="card" style="max-width:820px">
      <form id="af">
        <label>Indikatorni tanlang</label>
        <select id="ai" required>
          <option value="">-- Mezonni tanlang --</option>
          ${IND.map(i => `<option value="${i.id}">${i.id}. ${i.sec}-bo‘lim: ${i.name} (maks: ${i.max} ball)</option>`).join('')}
        </select>

        <div id="at-wrap" style="display:none;margin-top:12px">
          <label>Yutuq turi va darajasi</label>
          <select id="at" required></select>
          <div id="adoc" class="sub" style="margin-top:6px;background:var(--ln);padding:8px;border-radius:4px"></div>
        </div>

        <label style="margin-top:12px">Soni (o‘quvchilar yoki sinflar soni)</label>
        <input id="aq" type="number" min="1" max="50" value="1" required style="max-width:140px">

        <label>Tavsif (nomi, tashkilot, sinf/chorak, sertifikat raqami va h.k.)</label>
        <textarea id="ad" placeholder="Masalan: 10-A sinf o‘quvchisi Anvarov Bobur IELTS 7.5 sertifikatini oldi..." required rows="3"></textarea>

        <label>Yutuq sanasi</label>
        <input id="adt" type="date" value="${new Date().toISOString().slice(0, 10)}" required style="max-width:200px">

        <label>Tasdiqlovchi hujjat (PDF, JPG, PNG — to‘g‘ridan-to‘g‘ri Supabase Storage-ga yuklanadi)</label>
        <input id="af-file" type="file" accept=".pdf,.jpg,.jpeg,.png">
        <p class="sub">Hujjat bulutli saqlashga xavfsiz yuklanadi va bazani to‘ldirmaydi.</p>

        <div class="row" style="margin-top:18px">
          <button class="p" type="submit" id="sub-btn">Yuborish (Tasdiqlashga)</button>
          <button class="s" type="button" onclick="CUR_TAB='home';render()">Bekor qilish</button>
        </div>
      </form>
    </div>
  `;

  $('#ai').onchange = () => {
    const id = Number($('#ai').value);
    const ind = IMAP[id];
    if (!ind) {
      $('#at-wrap').style.display = 'none';
      return;
    }
    $('#at-wrap').style.display = 'block';
    $('#at').innerHTML = ind.types.map(t => `<option value="${esc(t[0])}" data-pts="${t[1]}">${esc(t[0])} — +${t[1]} ball</option>`).join('');
    $('#adoc').innerHTML = `<b>Kerakli hujjat:</b> ${esc(ind.doc)}<br><b>Mas’ul baholovchi:</b> ${esc(ind.respStr)}`;
  };

  $('#af').onsubmit = async e => {
    e.preventDefault();
    const indId = Number($('#ai').value);
    if (!indId) return alert('Iltimos, indikatorni tanlang!');
    const selType = $('#at').selectedOptions[0];
    const qty = Number($('#aq').value);
    const pts = Number(selType.dataset.pts) * qty;
    const fileInp = $('#af-file').files[0];

    const btn = $('#sub-btn');
    btn.disabled = true;
    btn.textContent = 'Yuklanmoqda…';

    try {
      let fname = null;
      let fpath = null;
      if (fileInp) {
        if (fileInp.size > 15 * 1024 * 1024) throw new Error('Fayl hajmi 15 MB dan oshmasligi kerak');
        btn.textContent = 'Fayl bulutga yuklanmoqda…';
        const up = await api.uploadProofFile(fileInp);
        fname = up.fname;
        fpath = up.fpath;
      }

      btn.textContent = 'Baza yangilanmoqda…';
      const newEntry = {
        uid: ME.id,
        ind: indId,
        type: selType.value,
        qty,
        pts,
        descr: $('#ad').value.trim(),
        date: $('#adt').value,
        fname,
        fpath,
        status: 'pending',
        note: ''
      };

      await api.insertEntry(newEntry);
      await syncData();
      alert('Yutuq muvaffaqiyatli saqlandi va mas’ul baholovchiga yuborildi!');
      CUR_TAB = 'home';
      render();
    } catch (err) {
      alert('Xatolik: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Yuborish (Tasdiqlashga)';
    }
  };
}

// Tab: Tasdiqlash (Direktor: Barcha mezonlar; Mas'ul: Faqat o'ziniki)
function renderRev(el) {
  const isDirector = ME.role === 'director';
  
  // Mas'ul bo'lsa faqat unga biriktirilgan indikatorlar
  const pending = STATE.entries.filter(e => {
    if (e.status !== 'pending') return false;
    if (isDirector) return true; // Direktor barchasini ko'radi (4-in-1)
    const ind = IMAP[e.ind];
    return ind && ind.resp.includes(ME.name);
  });

  el.innerHTML = `
    <div class="page-head">
      <h2>Yutuqlarni Tekshirish va Tasdiqlash (${pending.length} ta kutmoqda)</h2>
      <div class="sub">${isDirector ? '⭐️ Sizda <b>Maktab Direktori</b> sifatida barcha 15 ta indikatorni to‘liq tasdiqlash huquqi bor.' : `Sizga biriktirilgan indikatorlar bo‘yicha arizalar (Mas’ul: <b>${esc(ME.name)}</b>)`}</div>
    </div>
    
    <div class="card sc">
      ${pending.length === 0 ? '<p class="msg">Hozirda tasdiqlash kutayotgan arizalar yo‘q.</p>' : `
        <table>
          <thead>
            <tr><th>Sana</th><th>Pedagog</th><th>Mezon</th><th>Yutuq va tavsif</th><th>Ball</th><th>Hujjat</th><th>Amal</th></tr>
          </thead>
          <tbody>
            ${pending.map(e => {
              const u = STATE.users.find(x => x.id === e.uid);
              const isOwn = e.uid === ME.id;
              const ind = IMAP[e.ind];
              return `
                <tr>
                  <td>${esc(e.date)}</td>
                  <td><b>${esc(u ? u.name : 'Noma’lum')}</b><div class="sub">${esc(u?.subject || '')}</div></td>
                  <td><b>${esc(ind?.name || '')}</b><div class="sub">Mas’ul: ${esc(ind?.respStr || '')}</div></td>
                  <td>${esc(e.type)} × ${e.qty}<div class="sub">${esc(e.descr)}</div></td>
                  <td><b>+${e.pts} ball</b></td>
                  <td>${e.fpath ? `<a href="${e.fpath}" target="_blank" rel="noopener" class="s" style="display:inline-block;padding:4px 8px;font-size:11px">📎 Hujjatni ko‘rish</a>` : '—'}</td>
                  <td class="row">
                    ${isOwn && !isDirector ? '<span class="sub" style="color:var(--amber)">O‘zingizniki (Boshqa mas’ul yoki direktor tekshiradi)</span>' : `
                      <button class="p" style="padding:5px 12px;font-size:12px" onclick="reviewEntry(${e.id}, 'approved')">✓ Tasdiqlash</button>
                      <button class="d" style="padding:5px 12px;font-size:12px" onclick="reviewEntry(${e.id}, 'rejected')">✗ Rad etish</button>
                    `}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;
}

// Tab: Reyting jadvali
function renderRank(el) {
  const ranking = getRanking();

  if (ranking.length === 0) {
    el.innerHTML = `
      <div class="page-head">
        <h2>Pedagoglar Umumiy Reyting Jadvali (0 nafar)</h2>
      </div>
      <div class="card" style="text-align:center;padding:40px 20px">
        <div style="font-size:38px;margin-bottom:10px">📋</div>
        <h3 style="font-size:18px;margin-bottom:8px">Hozircha tizimga pedagoglar (o‘qituvchilar) kiritilmagan</h3>
        <p class="sub" style="max-width:540px;margin:0 auto 18px;line-height:1.6">
          Maktab ma’muriyati va mas’ul baholovchilar reytingda qatnashmaydi. O‘qituvchilar ro‘yxati IT mutaxassis yoki direktor tomonidan <b>"Foydalanuvchilar va Excel Import"</b> bo‘limida Excel (.xlsx / .csv) orqali yuklangach, barcha o‘qituvchilar avtomatik tarzda reyting jadvalida paydo bo‘ladi.
        </p>
        ${['director', 'it_admin'].includes(ME?.role) ? `<button class="p" onclick="CUR_TAB='users';render()">⚡ O‘qituvchilarni yuklash (Excel / CSV)</button>` : ''}
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="page-head">
      <h2>Pedagoglar Umumiy Reyting Jadvali (${ranking.length} nafar)</h2>
      <button class="s" onclick="exportRankingCSV()">📥 Excel (CSV) yuklab olish</button>
    </div>
    <div class="legend">
      <span class="a">A — Salohiyat (max 50)</span>
      <span class="b">B — O‘quvchilar yutuqlari (max 30)</span>
      <span class="c">C — Rag‘bat va faollik (max 50)</span>
    </div>
    <div class="card sc">
      <table>
        <thead>
          <tr><th>O‘rin</th><th>Pedagog F.I.Sh.</th><th>Fan</th><th>Jami (130)</th><th style="min-width:140px">Taqsimot</th><th>A (50)</th><th>B (30)</th><th>C (50)</th><th>Portfolio</th></tr>
        </thead>
        <tbody>
          ${ranking.map(r => `
            <tr class="${r.id === ME.id ? 'me' : ''}">
              <td><b>#${r.rank}</b></td>
              <td><b>${esc(r.name)}</b></td>
              <td>${esc(r.subject)}</td>
              <td><span style="font-size:16px;font-weight:700;color:var(--teal)">${r.T}</span></td>
              <td><div class="bar"><i class="a" style="width:${r.A/130*100}%"></i><i class="b" style="width:${r.B/130*100}%"></i><i class="c" style="width:${r.C/130*100}%"></i></div></td>
              <td>${r.A}</td>
              <td>${r.B}</td>
              <td>${r.C}</td>
              <td><button class="s" onclick="viewPortfolio(${r.id})">A4 Portfolio</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Tab: Shaxsiy Portfolio
function renderPort(el, targetUid = null) {
  const uid = targetUid || ME.id;
  const user = STATE.users.find(u => u.id === uid) || ME;
  const userEntries = STATE.entries.filter(e => e.uid === user.id && e.status === 'approved');
  const k = calcScores(userEntries);
  const ranking = getRanking();
  const rank = ranking.find(r => r.id === user.id);

  el.innerHTML = `
    <div class="noprint row" style="justify-content:space-between;margin-bottom:16px">
      <button class="s" onclick="render()">← Orqaga</button>
      <button class="p" onclick="window.print()">🖨 A4 formatda chop etish (PDF saqlash)</button>
    </div>

    <div class="portfolio-page">
      <div class="portfolio-header">
        <h1>Norin tuman ixtisoslashtirilgan maktabi</h1>
        <p style="margin:4px 0;font-size:14px;color:#555">Pedagogik faoliyat natijalari va reyting portfoliosi (26-AF buyruq asosida)</p>
      </div>

      <div style="display:flex;justify-content:space-between;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:12px">
        <div>
          <div style="font-size:18px;font-weight:700">${esc(user.name)}</div>
          <div style="color:#555">Fani / Lavozimi: <b>${esc(user.subject || 'Pedagog')}</b></div>
          <div style="color:#555">Reytingdagi o‘rni: <b>#${rank ? rank.rank : '—'}</b></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:24px;font-weight:800;color:var(--teal)">${k.T} ball</div>
          <div style="font-size:12px;color:#666">Maksimal: 130 ball</div>
          <div style="font-size:11px;color:#888">Sana: ${new Date().toLocaleDateString('uz-UZ')}</div>
        </div>
      </div>

      <table style="margin-bottom:24px">
        <thead>
          <tr style="background:#f0f4f8">
            <th>Bo‘lim</th><th>Maksimal</th><th>To‘plangan ball</th><th>Ko‘rsatkich (%)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><b>A bo‘lim:</b> Pedagoglar salohiyati</td><td>50</td><td><b>${k.A}</b></td><td>${Math.round(k.A/50*100)}%</td></tr>
          <tr><td><b>B bo‘lim:</b> O‘quvchilar yutuqlari</td><td>30</td><td><b>${k.B}</b></td><td>${Math.round(k.B/30*100)}%</td></tr>
          <tr><td><b>C bo‘lim:</b> Fan bo‘yicha faollik va rag‘bat</td><td>50</td><td><b>${k.C}</b></td><td>${Math.round(k.C/50*100)}%</td></tr>
          <tr style="background:#f9fafb;font-weight:700"><td>JAMI REYTING BALI</td><td>130</td><td><span style="color:var(--teal)">${k.T}</span></td><td>${Math.round(k.T/130*100)}%</td></tr>
        </tbody>
      </table>

      <h3>Tasdiqlangan yutuqlar ro‘yxati</h3>
      ${userEntries.length === 0 ? '<p style="color:#777">Tasdiqlangan yutuqlar mavjud emas.</p>' : `
        <table>
          <thead>
            <tr><th>Sana</th><th>Mezon</th><th>Yutuq tavsifi</th><th>Ball</th></tr>
          </thead>
          <tbody>
            ${userEntries.map(e => `
              <tr>
                <td>${esc(e.date)}</td>
                <td>${e.ind}. ${esc(IMAP[e.ind]?.name || '')}</td>
                <td>${esc(e.type)} × ${e.qty} ta<br><small style="color:#666">${esc(e.descr)}</small></td>
                <td><b>+${e.pts}</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}

      <div style="margin-top:40px;display:flex;justify-content:space-between;border-top:1px dashed #999;padding-top:14px">
        <div>Pedagog imzosi: _________________</div>
        <div>Maktab direktori: Alisher Xolmatov (Imzo): _________________</div>
      </div>
    </div>
  `;
}

// Tab: Barcha pedagoglar portfoliolari (Direktor uchun)
function renderAllPort(el) {
  const ranking = getRanking();
  el.innerHTML = `
    <div class="page-head">
      <h2>Pedagoglar Portfoliolari</h2>
      <p class="sub">Istalgan o‘qituvchining portfoliosini ko‘rish, tekshirish va chop etish.</p>
    </div>
    <div class="card sc">
      <table>
        <thead><tr><th>O‘rin</th><th>Pedagog F.I.Sh.</th><th>Fan</th><th>Jami Ball</th><th>Amal</th></tr></thead>
        <tbody>
          ${ranking.map(r => `
            <tr>
              <td><b>#${r.rank}</b></td>
              <td><b>${esc(r.name)}</b></td>
              <td>${esc(r.subject)}</td>
              <td><b style="color:var(--teal)">${r.T} ball</b></td>
              <td><button class="p" style="padding:4px 10px;font-size:12px" onclick="viewPortfolio(${r.id})">A4 Portfolioni ochish</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Tab: Nazorat va Statistika
function renderCtl(el) {
  const ranking = getRanking();
  const approved = STATE.entries.filter(e => e.status === 'approved').length;
  const pending = STATE.entries.filter(e => e.status === 'pending').length;
  const rejected = STATE.entries.filter(e => e.status === 'rejected').length;

  el.innerHTML = `
    <h2>Maktab Nazorat va Statistika Paneli</h2>
    <div class="grid">
      <div class="card"><div class="k">Baholanayotgan Pedagoglar</div><div class="v">${ranking.length}</div></div>
      <div class="card"><div class="k">Tasdiqlangan yutuqlar</div><div class="v" style="color:var(--green)">${approved}</div></div>
      <div class="card"><div class="k">Kutilayotgan arizalar</div><div class="v" style="color:var(--amber)">${pending}</div></div>
      <div class="card"><div class="k">Rad etilgan arizalar</div><div class="v" style="color:var(--red)">${rejected}</div></div>
    </div>

    <div class="card">
      <h3>Oylik Ustama va Rag‘batlantirish Buyrug‘i</h3>
      <p class="sub">26-AF buyruq bo‘yicha pedagoglar ballari asosida ustama belgilash uchun rasmiy Excel hisobotini oling.</p>
      <button class="p" onclick="exportRankingCSV()">📥 Rasmiy hisobotni Excel (CSV) ko‘rinishida yuklab olish</button>
    </div>
  `;
}

// Tab: Foydalanuvchilar (IT Mutaxassis & Direktor uchun)
function renderUsers(el, creds = null) {
  const users = STATE.users;

  el.innerHTML = `
    <div class="page-head">
      <h2>Foydalanuvchilar Boshqaruvi (${users.length} nafar)</h2>
      <div class="sub">Barcha ma’lumotlar Supabase PostgreSQL markaziy bazasida saqlanadi.</div>
    </div>
    
    <div id="cred-zone">${creds ? renderCredBox(creds) : ''}</div>
    
    <div class="card" style="border-top:4px solid var(--teal)">
      <h3>⚡ Pedagoglarni Ommaviy Yuklash (Excel / CSV / Matn)</h3>
      <p class="sub">
        Pedagoglarni <b>biriktirilgan sinfi</b> (sinf rahbarligi) va fani bilan birgalikda ommaviy yuklang. Tizim har bir pedagog uchun avtomatik login va xavfsiz vaqtinchalik parol yaratadi.
      </p>

      <div style="background:var(--ln);padding:12px;border-radius:8px;margin:12px 0;font-size:13px">
        <b>📋 Kiritish formati (Har bir qatorda):</b><br>
        <code>F.I.Sh.; Sinf; Fan</code> (yoki <code>F.I.Sh.; Sinf</code>)<br>
        <span class="sub">Misol:</span><br>
        <code>Karimov Anvar Jo‘rayevich; 10-A sinf; Matematika</code><br>
        <code>Rasulova Ziyoda Akramovna; 9-B sinf; Ingliz tili</code><br>
        <code>Sobirov Jamshid Rustamovich; 11-A sinf; Fizika</code>
      </div>
      
      <div class="row" style="margin:12px 0">
        <input type="file" id="uf" accept=".xlsx,.csv,.txt" style="display:none">
        <button class="p" type="button" id="ub">📁 Excel (.xlsx) / CSV faylini tanlash</button>
        <span id="fn" class="sub" style="margin-left:8px"></span>
      </div>

      <p class="sub">Yoki to‘g‘ridan-to‘g‘ri ro‘yxat matnini bu yerga joylashtiring:</p>
      <textarea id="bt" rows="5" placeholder="Karimov Anvar Jo‘rayevich; 10-A sinf; Matematika&#10;Rasulova Ziyoda Akramovna; 9-B sinf; Ingliz tili&#10;Sobirov Jamshid Rustamovich; 11-A sinf; Fizika"></textarea>
      
      <div class="row" style="margin-top:12px">
        <button class="p" id="bb">⚡ Barchasini Supabase bazasiga kiritish va parollarni generatsiya qilish</button>
      </div>
    </div>

    <div class="card">
      <h3>Bitta pedagog qo‘shish</h3>
      <form id="nf" class="row">
        <input id="nn" placeholder="F.I.Sh. (To‘liq)" required style="flex:2">
        <input id="nc" placeholder="Sinfi (masalan: 10-A sinf)" style="flex:1">
        <input id="ns" placeholder="Fani (masalan: Matematika)" style="flex:1">
        <input id="nl" placeholder="Login (bo‘sh qolsa avtomatik)" style="flex:1">
        <button class="p" type="submit" id="add-one-btn">Qo‘shish</button>
      </form>
    </div>

    <div class="card sc">
      <h3>Barcha xodimlar va pedagoglar ro‘yxati</h3>
      <table>
        <thead>
          <tr><th>Login</th><th>F.I.Sh.</th><th>Sinf / Fan / Lavozim</th><th>Rol</th><th>Reytingda</th><th>Amallar</th></tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr style="${u.active ? '' : 'opacity:.5'}">
              <td><b>${esc(u.login)}</b></td>
              <td>${esc(u.name)}</td>
              <td><span class="sub" style="font-weight:600;color:var(--teal)">${esc(u.subject || '—')}</span></td>
              <td>
                <select onchange="updateUserRole(${u.id}, this.value)">
                  ${Object.entries(ROLE).map(([r, l]) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
              </td>
              <td><input type="checkbox" ${u.ranked ? 'checked' : ''} onchange="updateUserRanked(${u.id}, this.checked)"></td>
              <td class="row">
                <button class="s" onclick="resetUserPw(${u.id})">Parolni tiklash</button>
                <button class="d" onclick="toggleUserActive(${u.id})">${u.active ? 'O‘chirish' : 'Yoqish'}</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  $('#ub').onclick = () => $('#uf').click();
  $('#uf').onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    $('#fn').textContent = `${f.name} (${Math.round(f.size/1024)} KB)`;
    if (f.name.endsWith('.xlsx')) {
      if (typeof XLSX === 'undefined') return alert('Excel kutubxonasi yuklanmoqda, kuting...');
      const r = new FileReader();
      r.onload = ev => {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const lines = data.filter(r => r && r.length).map(r => r.join('; ')).join('\n');
        $('#bt').value = lines;
      };
      r.readAsBinaryString(f);
    } else {
      const r = new FileReader();
      r.onload = ev => { $('#bt').value = ev.target.result; };
      r.readAsText(f);
    }
    $('#uf').value = '';
  };

  $('#bb').onclick = async () => {
    const val = $('#bt').value.trim();
    if (!val) return alert('Iltimos, pedagoglar ro‘yxatini kiriting!');
    const lines = val.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const toInsert = [];
    const credsList = [];
    const existingLogins = new Set(STATE.users.map(u => u.login));

    for (const line of lines) {
      const delim = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
      const parts = line.split(delim).map(p => p.trim());
      if (!parts[0]) continue;
      const name = parts[0];
      const sinf = parts[1] || '';
      const fan = parts[2] || '';
      const subjectDesc = [sinf, fan].filter(Boolean).join(' | ');

      const login = makeLogin(name, existingLogins);
      const pw = tempPw();
      const u = {
        login,
        name,
        subject: subjectDesc,
        role: 'teacher',
        ranked: 1,
        pw,
        active: 1,
        must_change: 1
      };
      toInsert.push(u);
      credsList.push(u);
    }

    if (toInsert.length === 0) return alert('Yaroqli pedagog ma’lumotlari topilmadi!');

    const btn = $('#bb');
    btn.disabled = true;
    btn.textContent = `Supabase-ga yozilmoqda (${toInsert.length} nafar)…`;

    try {
      await api.insertUsers(toInsert);
      await syncData();
      btn.disabled = false;
      btn.textContent = '⚡ Barchasini Supabase bazasiga kiritish va parollarni generatsiya qilish';
      renderUsers(el, credsList);
    } catch (err) {
      alert('Xatolik yuz berdi: ' + err.message);
      btn.disabled = false;
      btn.textContent = '⚡ Barchasini Supabase bazasiga kiritish va parollarni generatsiya qilish';
    }
  };

  $('#nf').onsubmit = async e => {
    e.preventDefault();
    const name = $('#nn').value.trim();
    const sinf = $('#nc').value.trim();
    const fan = $('#ns').value.trim();
    const subjectDesc = [sinf, fan].filter(Boolean).join(' | ');
    const login = $('#nl').value.trim().toLowerCase() || makeLogin(name);
    const pw = tempPw();
    const u = {
      login,
      name,
      subject: subjectDesc,
      role: 'teacher',
      ranked: 1,
      pw,
      active: 1,
      must_change: 1
    };

    const btn = $('#add-one-btn');
    btn.disabled = true;
    btn.textContent = 'Qo‘shilmoqda…';

    try {
      await api.insertUsers([u]);
      await syncData();
      renderUsers(el, [u]);
    } catch (err) {
      alert('Xatolik: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Qo‘shish';
    }
  };
}

function renderCredBox(list) {
  return `
    <div class="card cred-banner">
      <h3 style="color:var(--teal)">✅ ${list.length} ta pedagog uchun login va parollar yaratildi!</h3>
      <p class="sub">Ushbu ro‘yxatni yuklab oling va pedagoglarga tarqating. Ular birinchi kirishda parolni o‘zgartiradilar.</p>
      <div style="max-height:200px;overflow-y:auto;background:var(--card);border-radius:6px;margin:10px 0;border:1px solid var(--ln)">
        <table>
          <thead><tr><th>Login</th><th>Vaqtinchalik Parol</th><th>F.I.Sh.</th><th>Fan</th></tr></thead>
          <tbody>
            ${list.map(c => `<tr><td><b>${esc(c.login)}</b></td><td><code>${esc(c.pw)}</code></td><td>${esc(c.name)}</td><td>${esc(c.subject || '—')}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <button class="p" onclick="downloadCredsCSV(${JSON.stringify(list).replace(/"/g, '&quot;')})">📥 Parollarni CSV faylda yuklab olish</button>
    </div>
  `;
}

// Global yordamchi funksiyalar
window.viewPortfolio = uid => { renderPort($('#main-view'), uid); };

window.deleteEntry = async id => {
  if (!confirm('Ushbu arizani o‘chirishni xohlaysizmi?')) return;
  try {
    await api.deleteEntry(id);
    await syncData();
    render();
  } catch (err) {
    alert('O‘chirishda xatolik: ' + err.message);
  }
};

window.reviewEntry = async (id, status) => {
  const e = STATE.entries.find(x => x.id === id);
  if (!e) return;
  const note = prompt(status === 'approved' ? 'Izoh (ixtiyoriy):' : 'Rad etish sababini yozing:');
  if (status === 'rejected' && note === null) return;

  try {
    await api.updateEntry(id, {
      status,
      note: note || '',
      rev: ME.id
    });
    await syncData();
    render();
  } catch (err) {
    alert('Tasdiqlashda xatolik: ' + err.message);
  }
};

window.resetUserPw = async uid => {
  const u = STATE.users.find(x => x.id === uid);
  if (!u) return;
  const np = tempPw();
  try {
    await api.updateUser(uid, { pw: np, must_change: 1 });
    u.pw = np;
    u.must_change = 1;
    alert(`Yangi vaqtinchalik parol berildi:\nLogin: ${u.login}\nParol: ${np}`);
    render();
  } catch (err) {
    alert('Parolni tiklashda xatolik: ' + err.message);
  }
};

window.updateUserRole = async (uid, role) => {
  try {
    await api.updateUser(uid, { role });
    await syncData();
    render();
  } catch (err) {
    alert('Rolni o‘zgartirishda xatolik: ' + err.message);
  }
};

window.updateUserRanked = async (uid, rk) => {
  try {
    await api.updateUser(uid, { ranked: rk ? 1 : 0 });
    await syncData();
    render();
  } catch (err) {
    alert('Reyting holatini o‘zgartirishda xatolik: ' + err.message);
  }
};

window.toggleUserActive = async uid => {
  const u = STATE.users.find(x => x.id === uid);
  if (!u) return;
  const newActive = u.active ? 0 : 1;
  try {
    await api.updateUser(uid, { active: newActive });
    await syncData();
    render();
  } catch (err) {
    alert('Holatni o‘zgartirishda xatolik: ' + err.message);
  }
};

window.downloadCredsCSV = list => {
  const b = new Blob(['\ufeffLogin;Vaqtinchalik Parol;F.I.Sh.;Fan\n' + list.map(c => `${c.login};${c.pw};${c.name};${c.subject || ''}`).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'pedagoglar_parollari.csv';
  a.click();
};

window.exportRankingCSV = () => {
  const ranking = getRanking();
  const b = new Blob(['\ufeffO‘rin;F.I.Sh.;Fan;Salohiyat (50);Yutuqlar (30);Rag‘bat (50);Jami (130)\n' + ranking.map(r => `${r.rank};${r.name};${r.subject};${r.A};${r.B};${r.C};${r.T}`).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'pedagoglar_reytingi_hisobot.csv';
  a.click();
};

// Dasturni ishga tushirish: Supabase bilan sinxronlash
(async function init() {
  ME = loadSession();
  try {
    await syncData();
  } catch (err) {
    console.error('Boshlang‘ich yuklash xatosi:', err);
  }
  render();
})();
