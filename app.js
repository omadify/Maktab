// Norin tuman ixtisoslashtirilgan maktabi — Pedagoglar reyting platformasi (26-AF buyruq)
// 100% Serverless & Ultra-yengil Dinamik Frontend (Supabase + LocalStorage sinxronizatsiyasi)

const CFG = {
  SUPABASE_URL: localStorage.getItem('supabase_url') || 'https://melqpmfjwqivylnmucwc.supabase.co',
  SUPABASE_KEY: localStorage.getItem('supabase_key') || '',
  STORAGE_KEY: 'maktab_reyting_v1'
};

// 26-AF buyruq bo‘yicha 15 ta indikator (Jami 130 ball)
const SEC = {
  A: ['Pedagoglar salohiyati', 50],
  B: ['O‘quvchilar yutuqlari', 30],
  C: ['Fan bo‘yicha faollik va rag‘bat', 50]
};

const _I = [
  [1, 'A', 'Ilmiy daraja', 10, 'N.Meliboyeva', 'Diplom, ilmiy daraja guvohnomasi', [['DSc / professor', 10], ['PhD / dotsent', 8], ['TOP–1000 OTM diplomi', 6]]],
  [2, 'A', 'Malaka toifasi', 5, 'N.Meliboyeva', 'Attestatsiya guvohnomasi', [['Oliy toifa', 5], ['Birinchi toifa', 4], ['Ikkinchi toifa', 3]]],
  [3, 'A', 'Mutaxassislik fanidan sertifikat', 5, 'D.Rasulova', 'IELTS, CEFR, SAT, TESOL, milliy sertifikat', [['Xalqaro sertifikat', 5], ['Milliy sertifikat', 3]]],
  [4, 'A', 'Boshqa fandan sertifikat', 10, 'D.Rasulova', 'Sertifikat nusxasi', [['Xalqaro sertifikat', 5], ['Milliy sertifikat', 3]]],
  [5, 'A', 'Malaka oshirish va stajirovka', 5, 'N.Meliboyeva', 'Sertifikat, buyruq, QR-kodli hujjat', [['Stajirovka', 3], ['Malaka oshirish kursi', 2]]],
  [6, 'A', 'Pedagog tanlovlari', 5, 'D.Rasulova', 'Diplom, buyruq', [['Xalqaro g‘olib', 5], ['Respublika g‘olibi', 4], ['Viloyat g‘olibi', 2], ['Pedagog sifatida ishtirok', 1]]],
  [7, 'A', 'Metodik va mualliflik ishlari', 10, 'D.Rasulova', 'Qo‘llanma, maqola, videodars, fan kengashi qarori', [['Metodik qo‘llanma', 4], ['Ilmiy maqola', 2], ['Videodars', 2], ['Ommalashtirilgan tajriba', 2]]],
  [14, 'B', 'Olimpiada va tanlov g‘oliblari (o‘quvchi)', 10, 'D.Rasulova, S.Murodov', 'Diplom, buyruq', [['Xalqaro g‘olib', 5], ['Respublika g‘olibi', 3], ['Viloyat g‘olibi', 2], ['Ishtirokchi', 1]]],
  [15, 'B', 'O‘quvchilar sertifikatlari', 5, 'S.Murodov, D.Rasulova', 'IELTS, CEFR, SAT, milliy sertifikat', [['Xalqaro sertifikat', 2], ['Milliy sertifikat', 1]]],
  [16, 'B', 'STEAM, StartUp, ilmiy loyihalar', 10, 'S.Murodov, D.Rasulova', 'Loyiha, patent, grant, diplom', [['Tanlov g‘olibi', 5], ['Loyiha ishtiroki', 2]]],
  [17, 'B', 'Ma’naviy-ma’rifiy va sport yutuqlari', 5, 'A.Karimjonov, S.Murodov', 'Diplom, bayonnoma', [['G‘olib', 2], ['Sovrindor', 1], ['Ishtirokchi', 1]]],
  [18, 'C', 'O‘quvchilar o‘zlashtirishi (fan bo‘yicha)', 20, 'D.Rasulova', 'Elektron jurnal, CHSB tahlili (sinf va chorak)', [['90% va yuqori (sinf/chorak)', 4], ['80–89% (sinf/chorak)', 3], ['70–79% (sinf/chorak)', 2]]],
  [19, 'C', 'Fan tanlovlarida ishtirok (o‘quvchi va pedagog)', 10, 'D.Rasulova', 'Ishtirokchilar ro‘yxati, buyruq, sertifikat', [['Xalqaro tanlovda o‘quvchi ishtiroki', 2], ['Respublika tanlovida o‘quvchi ishtiroki', 1], ['Pedagogning o‘zi ishtiroki', 2]]],
  [20, 'C', 'Sport va ma’naviy-ma’rifiy tadbirlardagi ishtirok', 10, 'A.Karimjonov, S.Murodov', 'Tadbirlar rejasi, bayonnoma, foto/video, buyruq', [['O‘quvchini tayyorlab qatnashtirish', 1], ['Pedagogning o‘zi ishtiroki', 1], ['Tashkilotchi / murabbiy', 2], ['Sovrinli o‘rin (o‘quvchi)', 3]]],
  [21, 'C', 'Sertifikat olgan o‘quvchilarni tayyorlagan ustoz', 10, 'S.Murodov, D.Rasulova', 'IELTS, CEFR, SAT, milliy sertifikat nusxasi', [['Xalqaro sertifikat (o‘quvchi uchun)', 3], ['Milliy sertifikat (o‘quvchi uchun)', 2]]]
];

const IND = _I.map(a => ({ id: a[0], sec: a[1], name: a[2], max: a[3], resp: a[4], doc: a[5], types: a[6] }));
const IMAP = Object.fromEntries(IND.map(i => [i.id, i]));
const ROLE = {
  teacher: 'Pedagog',
  reviewer: 'Mas’ul (ekspert)',
  it_admin: 'IT mutaxassis',
  director: 'Maktab direktori'
};

// Boshlang‘ich ma’lumotlar bazasi
function getInitialData() {
  return {
    users: [
      { id: 1, login: 'direktor', name: 'Alisher Xolmatov', subject: 'Maktab direktori', role: 'director', ranked: 0, pw: 'Direktor#2026', active: 1, must_change: 0 },
      { id: 2, login: 'it_admin', name: 'Hasanboy Toshboyev', subject: 'Informatika va IT', role: 'it_admin', ranked: 0, pw: 'Admin#2026', active: 1, must_change: 0 },
      { id: 3, login: 'n.meliboyeva', name: 'N.Meliboyeva', subject: 'O‘IBDO‘ / Metodist', role: 'reviewer', ranked: 1, pw: 'Masul#2026', active: 1, must_change: 0 },
      { id: 4, login: 'd.rasulova', name: 'D.Rasulova', subject: 'O‘IBDO‘ / Metodist', role: 'reviewer', ranked: 1, pw: 'Masul#2026', active: 1, must_change: 0 },
      { id: 5, login: 's.murodov', name: 'S.Murodov', subject: 'Aniq fanlar metodisti', role: 'reviewer', ranked: 1, pw: 'Masul#2026', active: 1, must_change: 0 },
      { id: 6, login: 'a.karimjonov', name: 'A.Karimjonov', subject: 'MMIBDO‘', role: 'reviewer', ranked: 1, pw: 'Masul#2026', active: 1, must_change: 0 }
    ],
    entries: [],
    nextUserId: 7,
    nextEntryId: 1
  };
}

const DB = {
  load() {
    try {
      const s = localStorage.getItem(CFG.STORAGE_KEY);
      return s ? JSON.parse(s) : this.reset();
    } catch { return this.reset(); }
  },
  save(data) {
    localStorage.setItem(CFG.STORAGE_KEY, JSON.stringify(data));
  },
  reset() {
    const d = getInitialData();
    this.save(d);
    return d;
  }
};

let STATE = DB.load();
let ME = null;
let CUR_TAB = 'home';

const $ = s => document.querySelector(s);
const esc = s => String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

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
  const users = STATE.users.filter(u => u.active && u.ranked);
  const byUid = {};
  for (const e of STATE.entries) {
    (byUid[e.uid] = byUid[e.uid] || []).push(e);
  }
  const res = users.map(u => {
    const k = calcScores(byUid[u.id] || []);
    return { id: u.id, name: u.name, subject: u.subject || '—', A: k.A, B: k.B, C: k.C, T: k.T };
  });
  res.sort((x, y) => y.T - x.T || y.A - x.A || x.name.localeCompare(y.name));
  res.forEach((x, i) => x.rank = i + 1);
  return res;
}

// Avtomatik login yaratish
function makeLogin(name) {
  const tr = {
    'sh':'sh','ch':'ch','yo':'yo','yu':'yu','ya':'ya','ye':'ye',
    "o'":'o',"g'":'g','o‘':'o','g‘':'g','o`':'o','g`':'g',
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'j',
    'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
    'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'x','ҳ':'h',
    'ц':'ts','ч':'ch','ш':'sh','щ':'sh','ъ':'','ы':'i','ь':'','э':'e',
    'ю':'yu','я':'ya','ў':'o','ғ':'g','қ':'q'
  };
  let s = name.toLowerCase();
  for (const [k, v] of Object.entries(tr)) s = s.split(k).join(v);
  const words = s.match(/[a-z]+/g) || [];
  let base = words.length > 1 ? `${words[0][0]}.${words[1]}`.slice(0, 18) : (words[0] || 'pedagog').slice(0, 15);
  let login = base;
  let idx = 2;
  while (STATE.users.some(u => u.login === login)) {
    login = `${base}${idx++}`;
  }
  return login;
}

function tempPw() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let p = 'Mktb#';
  for (let i = 0; i < 5; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

// UI Rendering
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
          <input id="lg" placeholder="masalan: direktor yoki it_admin" required autofocus>
          <label for="pw">Parol</label>
          <input id="pw" type="password" required>
          <p class="err" id="le"></p>
          <button class="p" type="submit" style="width:100%;margin-top:10px">Kirish</button>
        </form>
      </div>
    </div>
  `;
  $('#lf').onsubmit = e => {
    e.preventDefault();
    const l = $('#lg').value.trim().toLowerCase();
    const p = $('#pw').value;
    const u = STATE.users.find(x => x.login === l && x.pw === p && x.active);
    if (!u) {
      $('#le').textContent = 'Login yoki parol noto‘g‘ri!';
      return;
    }
    ME = u;
    CUR_TAB = 'home';
    render();
  };
}

function renderPasswordChange(forced) {
  $('#root').innerHTML = `
    <div class="login-wrap">
      <div class="login-box">
        <h1>${forced ? 'Yangi parol o‘rnating' : 'Parolni o‘zgartirish'}</h1>
        <p class="sub">${forced ? 'Xavfsizlik yuzasidan birinchi kirishda parolingizni o‘zgartirishingiz shart.' : ''}</p>
        <form id="pf">
          <label>Joriy parol</label>
          <input id="po" type="password" required>
          <label>Yangi parol (kamida 8 belgi)</label>
          <input id="pn" type="password" minlength="8" required>
          <p class="err" id="pe"></p>
          <div class="row" style="margin-top:14px">
            <button class="p" type="submit">Saqlash</button>
            ${!forced ? '<button class="s" type="button" id="pc">Bekor qilish</button>' : ''}
          </div>
        </form>
      </div>
    </div>
  `;
  if (!forced) $('#pc').onclick = () => render();
  $('#pf').onsubmit = e => {
    e.preventDefault();
    if ($('#po').value !== ME.pw) return $('#pe').textContent = 'Joriy parol noto‘g‘ri!';
    const np = $('#pn').value;
    if (np.length < 8) return $('#pe').textContent = 'Parol kamida 8 belgi bo‘lsin!';
    ME.pw = np;
    ME.must_change = 0;
    const idx = STATE.users.findIndex(u => u.id === ME.id);
    if (idx !== -1) STATE.users[idx] = ME;
    DB.save(STATE);
    render();
  };
}

function getTabs() {
  const t = [];
  if (['teacher', 'reviewer', 'director'].includes(ME.role)) {
    t.push(['home', 'Mening natijam'], ['add', 'Yutuq qo‘shish']);
  }
  t.push(['rank', 'Reyting jadvali']);
  if (['teacher', 'reviewer', 'director'].includes(ME.role)) {
    t.push(['port', 'Shaxsiy Portfolio']);
  }
  if (['reviewer', 'director'].includes(ME.role)) {
    t.push(['rev', 'Tasdiqlash (Ekspert)']);
  }
  if (['director', 'reviewer', 'it_admin'].includes(ME.role)) {
    t.push(['ctl', 'Nazorat va Statistika']);
  }
  if (['it_admin', 'director'].includes(ME.role)) {
    t.push(['users', 'Foydalanuvchilar']);
  }
  return t;
}

function renderApp() {
  const tabs = getTabs();
  if (!tabs.some(t => t[0] === CUR_TAB)) CUR_TAB = tabs[0][0];

  $('#root').innerHTML = `
    <div class="shell">
      <nav class="noprint">
        <div class="brand">
          <div class="title">Pedagoglar Reytingi</div>
          <small>Norin tuman ixtisoslashtirilgan maktabi</small>
        </div>
        ${tabs.map(([id, label]) => `<button class="nav-btn ${CUR_TAB === id ? 'on' : ''}" data-tab="${id}">${label}</button>`).join('')}
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
      <main id="main-view"></main>
    </div>
  `;

  document.querySelectorAll('[data-tab]').forEach(b => {
    b.onclick = () => { CUR_TAB = b.dataset.tab; render(); };
  });
  $('#logout-btn').onclick = () => { ME = null; render(); };
  $('#pw-btn').onclick = () => renderPasswordChange(false);

  renderTab();
}

function renderTab() {
  const main = $('#main-view');
  if (CUR_TAB === 'home') return renderHome(main);
  if (CUR_TAB === 'add') return renderAdd(main);
  if (CUR_TAB === 'rank') return renderRank(main);
  if (CUR_TAB === 'port') return renderPort(main);
  if (CUR_TAB === 'rev') return renderRev(main);
  if (CUR_TAB === 'ctl') return renderCtl(main);
  if (CUR_TAB === 'users') return renderUsers(main);
}

// Tab: Mening natijam
function renderHome(el) {
  const myEntries = STATE.entries.filter(e => e.uid === ME.id);
  const k = calcScores(myEntries);
  const ranking = getRanking();
  const myRank = ranking.find(r => r.id === ME.id);

  el.innerHTML = `
    <div class="page-head">
      <h2>Mening natijam — ${esc(ME.name)}</h2>
      <button class="p" onclick="CUR_TAB='add';render()">+ Yangi yutuq kiritish</button>
    </div>
    <div class="grid">
      <div class="card"><div class="k">Jami ball</div><div class="v" style="color:var(--teal)">${k.T} <small>/ 130</small></div><div class="bar"><i class="a" style="width:${k.A/130*100}%"></i><i class="b" style="width:${k.B/130*100}%"></i><i class="c" style="width:${k.C/130*100}%"></i></div></div>
      <div class="card"><div class="k">A — Salohiyat</div><div class="v">${k.A} <small>/ 50</small></div><div class="bar"><i class="a" style="width:${k.A/50*100}%"></i></div></div>
      <div class="card"><div class="k">B — O‘quvchi yutuqlari</div><div class="v">${k.B} <small>/ 30</small></div><div class="bar"><i class="b" style="width:${k.B/30*100}%"></i></div></div>
      <div class="card"><div class="k">C — Faollik va rag‘bat</div><div class="v">${k.C} <small>/ 50</small></div><div class="bar"><i class="c" style="width:${k.C/50*100}%"></i></div></div>
    </div>
    <div class="card">
      <h3>Mening arizalarim (${myEntries.length} ta)</h3>
      ${myEntries.length === 0 ? '<p class="msg">Hozircha hech qanday yutuq kiritilmagan. Yuqoridagi tugma orqali yutuqlaringizni qo‘shing.</p>' : `
        <div class="sc">
          <table>
            <thead><tr><th>Sana</th><th>Mezon</th><th>Yutuq turi</th><th>Ball</th><th>Holati</th><th>Hujjat</th><th>Amal</th></tr></thead>
            <tbody>
              ${myEntries.map(e => `
                <tr>
                  <td>${esc(e.date)}</td>
                  <td><b>${esc(IMAP[e.ind]?.name || '')}</b></td>
                  <td>${esc(e.type)} <div class="sub">${esc(e.descr)}</div></td>
                  <td><b>+${e.pts}</b></td>
                  <td><span class="pill st-${e.status}">${e.status === 'approved' ? 'Tasdiqlandi' : (e.status === 'rejected' ? 'Rad etildi' : 'Kutilmoqda')}</span>${e.note ? `<div class="sub">${esc(e.note)}</div>` : ''}</td>
                  <td>${e.file ? `<button class="s" onclick="viewFile('${e.id}')">Ko‘rish</button>` : '—'}</td>
                  <td>${e.status === 'pending' || ME.role === 'director' ? `<button class="d" onclick="deleteEntry(${e.id})">O‘chirish</button>` : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// Tab: Yutuq qo'shish
function renderAdd(el) {
  el.innerHTML = `
    <h2>Yangi yutuq qo‘shish</h2>
    <div class="card" style="max-width:760px">
      <form id="af">
        <label>Yo‘nalish (Mezon)</label>
        <select id="ai" required>
          <option value="">Tanlang...</option>
          ${IND.map(i => `<option value="${i.id}">[${i.sec}] ${i.name} (max: ${i.max} ball) — Mas’ul: ${i.resp}</option>`).join('')}
        </select>
        <div id="at-wrap" style="display:none">
          <label>Yutuq turi</label>
          <select id="at" required></select>
          <div id="adoc" class="sub" style="margin-top:6px;padding:8px;background:var(--teal-soft);border-radius:6px"></div>
        </div>
        <label>Soni</label>
        <input id="aq" type="number" min="1" max="20" value="1" required style="max-width:140px">
        <label>Yutuq tavsifi (o‘quvchi F.I.Sh., tanlov nomi, sana, sertifikat raqami va h.k.)</label>
        <textarea id="ad" placeholder="Masalan: 10-A sinf o‘quvchisi Anvarov Bobur IELTS 7.5 sertifikatini oldi..." required></textarea>
        <label>Yutuq sanasi</label>
        <input id="adt" type="date" value="${new Date().toISOString().slice(0, 10)}" required style="max-width:200px">
        <label>Tasdiqlovchi hujjat (PDF, JPG, PNG — 8 MB gacha)</label>
        <input id="af-file" type="file" accept=".pdf,.jpg,.jpeg,.png">
        <div class="row" style="margin-top:18px">
          <button class="p" type="submit">Yuborish (Tasdiqlashga)</button>
          <button class="s" type="button" onclick="CUR_TAB='home';render()">Bekor qilish</button>
        </div>
      </form>
    </div>
  `;

  $('#ai').onchange = () => {
    const id = Number($('#ai').value);
    const ind = IMAP[id];
    if (!ind) return $('#at-wrap').style.display = 'none';
    $('#at-wrap').style.display = 'block';
    $('#at').innerHTML = ind.types.map(t => `<option value="${t[0]}" data-pts="${t[1]}">${t[0]} (+${t[1]} ball)</option>`).join('');
    $('#adoc').innerHTML = `<b>Kerakli tasdiqlovchi hujjat:</b> ${esc(ind.doc)}<br><b>Mas’ul tekshiruvchi:</b> ${esc(ind.resp)}`;
  };

  $('#af').onsubmit = async e => {
    e.preventDefault();
    const indId = Number($('#ai').value);
    const selType = $('#at').selectedOptions[0];
    const qty = Number($('#aq').value);
    const pts = Number(selType.dataset.pts) * qty;
    const fileInp = $('#af-file').files[0];

    let fileData = null;
    if (fileInp) {
      if (fileInp.size > 8 * 1024 * 1024) return alert('Fayl hajmi 8 MB dan oshmasligi kerak!');
      fileData = await new Promise(res => {
        const r = new FileReader();
        r.onload = ev => res({ name: fileInp.name, data: ev.target.result });
        r.readAsDataURL(fileInp);
      });
    }

    const newEntry = {
      id: STATE.nextEntryId++,
      uid: ME.id,
      ind: indId,
      type: selType.value,
      qty,
      pts,
      descr: $('#ad').value.trim(),
      date: $('#adt').value,
      file: fileData,
      status: 'pending',
      note: '',
      created: Date.now()
    };

    STATE.entries.unshift(newEntry);
    DB.save(STATE);
    alert('Yutuq muvaffaqiyatli qo‘shildi va tasdiqlash uchun mas’ulga yuborildi!');
    CUR_TAB = 'home';
    render();
  };
}

// Tab: Reyting jadvali
function renderRank(el) {
  const ranking = getRanking();
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
        <thead><tr><th>O‘rin</th><th>Pedagog F.I.Sh.</th><th>Fan</th><th>Jami (130)</th><th style="min-width:140px">Diagramma</th><th>A (50)</th><th>B (30)</th><th>C (50)</th><th>Portfolio</th></tr></thead>
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
function renderPort(el, targetUid = ME.id) {
  const u = STATE.users.find(x => x.id === targetUid) || ME;
  const entries = STATE.entries.filter(e => e.uid === u.id && e.status === 'approved');
  const k = calcScores(entries);

  el.innerHTML = `
    <div class="page-head noprint">
      <h2>Pedagog Portfoliosi — ${esc(u.name)}</h2>
      <div class="row">
        <button class="p" onclick="window.print()">🖨️ A4 formatda chop etish (PDF)</button>
        ${targetUid !== ME.id ? '<button class="s" onclick="CUR_TAB=\'rank\';render()">Ortga</button>' : ''}
      </div>
    </div>
    <div class="card" style="border:2px solid #333">
      <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px">
        <h2 style="font-size:18px">O‘ZBEKISTON RESPUBLIKASI MAKTABGACHA VA MAKTAB TA’LIMI VAZIRLIGI</h2>
        <h3 style="font-size:16px;margin-top:4px">NORIN TUMAN IXTISOSLASHTIRILGAN MAKTABI</h3>
        <p style="margin:4px 0;font-size:13px">Pedagogning 26-AF-sonli buyruq asosidagi reyting portfoliosi</p>
      </div>
      <div class="row" style="justify-content:space-between;margin-bottom:16px">
        <div>
          <b>F.I.Sh:</b> ${esc(u.name)}<br>
          <b>Mutaxassislik fani:</b> ${esc(u.subject || '—')}<br>
          <b>Lavozimi:</b> ${ROLE[u.role] || u.role}
        </div>
        <div style="text-align:right">
          <b>Umumiy to‘plangan ball:</b> <span style="font-size:22px;color:var(--teal)">${k.T}</span> / 130<br>
          <small>A (Salohiyat): ${k.A}/50 | B (O‘quvchi): ${k.B}/30 | C (Faollik): ${k.C}/50</small>
        </div>
      </div>
      <h3>Tasdiqlangan yutuqlar ro‘yxati (${entries.length} ta)</h3>
      ${entries.length === 0 ? '<p class="msg">Hozircha tasdiqlangan yutuqlar mavjud emas.</p>' : `
        <table style="margin-top:10px">
          <thead><tr><th>№</th><th>Sana</th><th>Mezon</th><th>Yutuq va tavsifi</th><th>Ball</th></tr></thead>
          <tbody>
            ${entries.map((e, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${esc(e.date)}</td>
                <td><b>${esc(IMAP[e.ind]?.name || '')}</b></td>
                <td>${esc(e.type)} — ${esc(e.descr)}</td>
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

// Tab: Tasdiqlash (Ekspert & Direktor)
function renderRev(el) {
  const isDir = ME.role === 'director';
  const pending = STATE.entries.filter(e => e.status === 'pending');

  el.innerHTML = `
    <h2>Yutuqlarni Tekshirish va Tasdiqlash (${pending.length} ta ariza kutmoqda)</h2>
    <div class="card sc">
      ${pending.length === 0 ? '<p class="msg">Hozirda tasdiqlash kutayotgan yangi arizalar yo‘q.</p>' : `
        <table>
          <thead><tr><th>Sana</th><th>Pedagog</th><th>Mezon</th><th>Yutuq va tavsif</th><th>Ball</th><th>Hujjat</th><th>Amal</th></tr></thead>
          <tbody>
            ${pending.map(e => {
              const u = STATE.users.find(x => x.id === e.uid);
              const isOwn = e.uid === ME.id;
              return `
                <tr>
                  <td>${esc(e.date)}</td>
                  <td><b>${esc(u ? u.name : 'Noma’lum')}</b><div class="sub">${esc(u?.subject || '')}</div></td>
                  <td><b>${esc(IMAP[e.ind]?.name || '')}</b><div class="sub">Mas’ul: ${esc(IMAP[e.ind]?.resp || '')}</div></td>
                  <td>${esc(e.type)}<div class="sub">${esc(e.descr)}</div></td>
                  <td><b>+${e.pts}</b></td>
                  <td>${e.file ? `<button class="s" onclick="viewFile('${e.id}')">Hujjatni ochish</button>` : '—'}</td>
                  <td class="row">
                    ${isOwn && !isDir ? '<span class="sub" style="color:var(--amber)">O‘zingizniki (boshqa mas’ul tekshiradi)</span>' : `
                      <button class="p" style="padding:5px 12px;font-size:12px" onclick="reviewEntry(${e.id}, 'approved')">Tasdiqlash</button>
                      <button class="d" style="padding:5px 12px;font-size:12px" onclick="reviewEntry(${e.id}, 'rejected')">Rad etish</button>
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

// Tab: Nazorat va Statistika
function renderCtl(el) {
  const ranking = getRanking();
  const approved = STATE.entries.filter(e => e.status === 'approved').length;
  const pending = STATE.entries.filter(e => e.status === 'pending').length;
  const rejected = STATE.entries.filter(e => e.status === 'rejected').length;

  el.innerHTML = `
    <h2>Direktor va Ekspertlar Nazorat Paneli</h2>
    <div class="grid">
      <div class="card"><div class="k">Faol Pedagoglar</div><div class="v">${ranking.length}</div></div>
      <div class="card"><div class="k">Tasdiqlangan yutuqlar</div><div class="v" style="color:var(--green)">${approved}</div></div>
      <div class="card"><div class="k">Kutilayotgan arizalar</div><div class="v" style="color:var(--amber)">${pending}</div></div>
      <div class="card"><div class="k">Rad etilgan</div><div class="v" style="color:var(--red)">${rejected}</div></div>
    </div>
    <div class="card">
      <h3>Ustama va Rag‘batlantirish uchun Rasmiy Buyruq Loyihasi</h3>
      <p class="sub">Pedagoglar reyting ballari asosida oylik ustamalarni shakllantirish uchun Excel hisobotini oling.</p>
      <button class="p" onclick="exportRankingCSV()">📥 Rasmiy hisobotni Excel (CSV) ko‘rinishida yuklab olish</button>
    </div>
  `;
}

// Tab: Foydalanuvchilar (Ommaviy yuklash & Xotirani tejash)
function renderUsers(el, creds = null) {
  const users = STATE.users;

  el.innerHTML = `
    <h2>Foydalanuvchilar Boshqaruvi (${users.length} nafar)</h2>
    <div id="cred-zone">${creds ? renderCredBox(creds) : ''}</div>
    
    <div class="card" style="border-top:4px solid var(--teal)">
      <h3>Pedagoglarni Ommaviy Yuklash (Baza to‘lmasligi mexanizmi)</h3>
      <p class="sub">Excel (.xlsx, .csv, .txt) faylini tanlang yoki to‘g‘ridan-to‘g‘ri ro‘yxatni kiriting. Tizim har bir pedagog uchun avtomatik login va vaqtinchalik parol yaratadi. Yuklangan fayl brauzerda o‘qilib, xotiradan shu zahoti o‘chiriladi (serverda 0 KB joy egallaydi).</p>
      
      <div class="row" style="margin:12px 0">
        <input type="file" id="uf" accept=".xlsx,.csv,.txt" style="display:none">
        <button class="p" type="button" id="ub">📁 Excel / CSV faylini tanlash</button>
        <span id="fn" class="sub" style="margin-left:8px"></span>
      </div>

      <p class="sub">Yoki matn sifatida joylashtiring (Har qatorda: <code>F.I.Sh.; Fan</code>):</p>
      <textarea id="bt" rows="4" placeholder="Karimov Anvar Jo‘rayevich; Matematika&#10;Rasulova Ziyoda; Ingliz tili&#10;Sobirov Jamshid; Fizika"></textarea>
      <div class="row" style="margin-top:10px">
        <button class="p" id="bb">⚡ Barchasini qo‘shish va parollarni generatsiya qilish</button>
      </div>
    </div>

    <div class="card">
      <h3>Bitta pedagog qo‘shish</h3>
      <form id="nf" class="row">
        <input id="nn" placeholder="F.I.Sh. (To‘liq)" required style="flex:2">
        <input id="ns" placeholder="Fan" style="flex:1">
        <input id="nl" placeholder="Login (avtomatik yaratiladi)" style="flex:1">
        <button class="p" type="submit">Qo‘shish</button>
      </form>
    </div>

    <div class="card sc">
      <h3>Barcha xodimlar va pedagoglar ro‘yxati</h3>
      <table>
        <thead><tr><th>Login</th><th>F.I.Sh. / Fan</th><th>Rol</th><th>Reytingda</th><th>Amallar</th></tr></thead>
        <tbody>
          ${users.map(u => `
            <tr style="${u.active ? '' : 'opacity:.5'}">
              <td><b>${esc(u.login)}</b></td>
              <td>${esc(u.name)} <div class="sub">${esc(u.subject)}</div></td>
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
    // Avtomatik o'chirish (Clear file input from memory)
    $('#uf').value = '';
  };

  $('#bb').onclick = () => {
    const val = $('#bt').value.trim();
    if (!val) return alert('Iltimos, o‘qituvchilar ro‘yxatini kiriting!');
    const lines = val.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const created = [];
    for (const line of lines) {
      const delim = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
      const parts = line.split(delim).map(p => p.trim());
      if (!parts[0]) continue;
      const name = parts[0];
      const subject = parts[1] || '';
      const login = makeLogin(name);
      const pw = tempPw();
      const u = {
        id: STATE.nextUserId++,
        login,
        name,
        subject,
        role: 'teacher',
        ranked: 1,
        pw,
        active: 1,
        must_change: 1
      };
      STATE.users.push(u);
      created.push(u);
    }
    DB.save(STATE);
    renderUsers(el, created);
  };

  $('#nf').onsubmit = e => {
    e.preventDefault();
    const name = $('#nn').value.trim();
    const subject = $('#ns').value.trim();
    const login = $('#nl').value.trim().toLowerCase() || makeLogin(name);
    const pw = tempPw();
    const u = {
      id: STATE.nextUserId++,
      login,
      name,
      subject,
      role: 'teacher',
      ranked: 1,
      pw,
      active: 1,
      must_change: 1
    };
    STATE.users.push(u);
    DB.save(STATE);
    renderUsers(el, [u]);
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

// Yordamchi operatsiyalar
window.viewPortfolio = uid => { renderPort($('#main-view'), uid); };
window.deleteEntry = id => {
  if (!confirm('Ushbu arizani o‘chirishni xohlaysizmi?')) return;
  STATE.entries = STATE.entries.filter(e => e.id !== id);
  DB.save(STATE);
  render();
};
window.reviewEntry = (id, status) => {
  const e = STATE.entries.find(x => x.id === id);
  if (!e) return;
  const note = prompt(status === 'approved' ? 'Izoh (ixtiyoriy):' : 'Rad etish sababini yozing:');
  if (status === 'rejected' && note === null) return;
  e.status = status;
  e.note = note || '';
  DB.save(STATE);
  render();
};
window.resetUserPw = uid => {
  const u = STATE.users.find(x => x.id === uid);
  if (!u) return;
  const np = tempPw();
  u.pw = np;
  u.must_change = 1;
  DB.save(STATE);
  alert(`Yangi vaqtinchalik parol berildi:\nLogin: ${u.login}\nParol: ${np}`);
  render();
};
window.updateUserRole = (uid, role) => {
  const u = STATE.users.find(x => x.id === uid);
  if (u) { u.role = role; DB.save(STATE); render(); }
};
window.updateUserRanked = (uid, rk) => {
  const u = STATE.users.find(x => x.id === uid);
  if (u) { u.ranked = rk ? 1 : 0; DB.save(STATE); render(); }
};
window.toggleUserActive = uid => {
  const u = STATE.users.find(x => x.id === uid);
  if (u) { u.active = u.active ? 0 : 1; DB.save(STATE); render(); }
};
window.viewFile = eid => {
  const e = STATE.entries.find(x => x.id == eid);
  if (!e || !e.file) return alert('Hujjat fayli mavjud emas');
  const modal = $('#modal-root');
  modal.innerHTML = `
    <div class="modal-bg" onclick="closeModal()">
      <div class="modal-card" onclick="event.stopPropagation()">
        <div class="modal-head">
          <b>${esc(e.file.name || 'Hujjat')}</b>
          <button class="s" onclick="closeModal()">✕ Yopish</button>
        </div>
        <div class="modal-body">
          ${e.file.data.startsWith('data:application/pdf') ? `<iframe src="${e.file.data}"></iframe>` : `<img src="${e.file.data}">`}
        </div>
      </div>
    </div>
  `;
};
window.closeModal = () => { $('#modal-root').innerHTML = ''; };
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

// Dasturni ishga tushirish
render();
