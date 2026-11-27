// Core configuration, 26-AF decree scoring criteria, and pure business logic

export const CFG = {
  SUPABASE_URL: 'https://melqpmfjwqivylnmucwc.supabase.co',
  SUPABASE_KEY: 'sb_publishable_EGUiTu1TGcU1EnhZqKkptQ_Wk2jyQpt',
  STORAGE_BUCKET: 'proofs'
};

export const SEC = {
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

export const IND = _I.map(a => ({
  id: a[0],
  sec: a[1],
  name: a[2],
  max: a[3],
  resp: a[4],
  respStr: a[4].join(', '),
  doc: a[5],
  types: a[6]
}));

export const IMAP = Object.fromEntries(IND.map(i => [i.id, i]));

export const ROLE = {
  teacher: 'Pedagog',
  reviewer: 'Mas’ul baholovchi',
  it_admin: 'IT mutaxassis',
  director: 'Maktab direktori'
};

export function calcScores(rows) {
  const ok = {};
  const wait = {};
  for (const r of rows) {
    if (IMAP[r.ind] && (r.status === 'approved' || r.status === 'pending')) {
      const bucket = r.status === 'approved' ? ok : wait;
      bucket[r.ind] = (bucket[r.ind] || 0) + Number(r.pts || 0);
    }
  }
  const by = {};
  const S = { A: 0, B: 0, C: 0 };
  for (const i of IND) {
    const o = Math.round(Math.min(ok[i.id] || 0, i.max) * 100) / 100;
    const w = Math.round(Math.min(wait[i.id] || 0, i.max - o) * 100) / 100;
    by[i.id] = { ok: o, wait: w };
    S[i.sec] += o;
  }
  const A = Math.round(S.A * 100) / 100;
  const B = Math.round(S.B * 100) / 100;
  const C = Math.round(S.C * 100) / 100;
  return { by, A, B, C, T: Math.round((A + B + C) * 100) / 100 };
}

export function filterEntriesByPeriod(entries, period = 'all') {
  if (!period || period === 'all') return entries;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return entries.filter(e => {
    if (!e.date || !/^\d{4}-\d{2}/.test(e.date)) return false;
    const [ey, em] = e.date.split('-').map(Number);
    if (period === 'this_month') return ey === y && em === m + 1;
    if (period === 'prev_month') {
      const pm = m === 0 ? 12 : m;
      const py = m === 0 ? y - 1 : y;
      return ey === py && em === pm;
    }
    if (period === 'quarter') {
      const d = new Date(e.date);
      const cut = new Date(y, m - 2, 1);
      return d >= cut;
    }
    if (period === 'this_year') return ey === y;
    return true;
  });
}

export function getRanking(users, entries, period = 'all') {
  const rankedUsers = (users || []).filter(u => u.active && u.ranked);
  const filteredEntries = filterEntriesByPeriod(entries || [], period);
  const byUid = {};
  for (const e of filteredEntries) {
    (byUid[e.uid] = byUid[e.uid] || []).push(e);
  }
  const res = rankedUsers.map(u => {
    const userRows = byUid[u.id] || [];
    const k = calcScores(userRows);
    const approvedCount = userRows.filter(e => e.status === 'approved').length;
    const pendingCount = userRows.filter(e => e.status === 'pending').length;
    return {
      id: u.id,
      name: u.name,
      subject: u.subject || '—',
      A: k.A,
      B: k.B,
      C: k.C,
      T: k.T,
      approvedCount,
      pendingCount
    };
  });
  res.sort((x, y) => y.T - x.T || y.A - x.A || x.name.localeCompare(y.name));
  res.forEach((x, i) => { x.rank = i + 1; });
  return res;
}

export function extractSubjectLabel(subjectField) {
  const raw = String(subjectField || '').trim();
  if (!raw) return 'Belgilanmagan';
  if (raw.includes('|')) {
    const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || raw;
  }
  return raw;
}

export function makeLogin(name, existingLogins = null, users = []) {
  const tr = {
    sh: 'sh', ch: 'ch', yo: 'yo', yu: 'yu', ya: 'ya', ye: 'ye',
    "o'": 'o', "g'": 'g', 'o‘': 'o', 'g‘': 'g', 'o`': 'o', 'g`': 'g',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ҳ': 'h',
    'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'i', 'ь': '', 'э': 'e',
    'ю': 'yu', 'я': 'ya', 'ў': 'o', 'ғ': 'g', 'қ': 'q'
  };
  let s = String(name || '').toLowerCase();
  for (const [k, v] of Object.entries(tr)) s = s.split(k).join(v);
  const words = s.match(/[a-z]+/g) || [];
  const base = words.length > 1
    ? `${words[0][0]}.${words[1]}`.slice(0, 18)
    : (words[0] || 'pedagog').slice(0, 15);
  let login = base;
  let idx = 2;
  const isTaken = l => (existingLogins ? existingLogins.has(l) : users.some(u => u.login === l));
  while (isTaken(login) && idx < 1000) {
    login = `${base}${idx++}`;
  }
  if (existingLogins) existingLogins.add(login);
  return login;
}

export function tempPw() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let p = 'Mktb#';
  for (let i = 0; i < 5; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

export function getDeadlines() {
  const n = new Date();
  const t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  let d20 = new Date(n.getFullYear(), n.getMonth(), 20);
  if (d20 < t0) d20 = new Date(n.getFullYear(), n.getMonth() + 1, 20);
  let d25 = new Date(n.getFullYear(), n.getMonth(), 25);
  if (d25 < t0) d25 = new Date(n.getFullYear(), n.getMonth() + 1, 25);
  const n20 = Math.round((d20 - t0) / 864e5);
  const n25 = Math.round((d25 - t0) / 864e5);
  const fmt = d => d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
  return { d20Label: fmt(d20), d25Label: fmt(d25), n20, n25 };
}
