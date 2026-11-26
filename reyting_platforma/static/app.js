'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let CFG, ME, TAB = 'home', SEL = 1, PORT_UID = null;
const STX = { approved: 'Tasdiqlangan', pending: 'Tekshiruvda', rejected: 'Rad etilgan' };
const ROLE = { teacher: 'Pedagog', reviewer: 'Mas’ul (tasdiqlovchi)', it_admin: 'IT mutaxassis', director: 'Maktab direktori', admin: 'Administrator' };
const TOT = 130;

async function api(path, o = {}) {
  const r = await fetch('/api' + path, {
    method: o.method || (o.body ? 'POST' : 'GET'),
    headers: o.body ? { 'Content-Type': 'application/json' } : {},
    body: o.body ? JSON.stringify(o.body) : undefined, credentials: 'same-origin'
  });
  const t = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== '/login') { ME = null; loginView(); throw new Error('Tizimga kiring'); }
  if (!r.ok) throw new Error(t.error || 'Xatolik');
  return t;
}
const bar = (a, b, c) => `<div class="bar" role="img" aria-label="${a + b + c} ball"><i class="a" style="width:${a / TOT * 100}%"></i><i class="b" style="width:${b / TOT * 100}%"></i><i class="c" style="width:${c / TOT * 100}%"></i></div>`;
const one = (v, m, cls) => `<div class="bar"><i class="${cls}" style="width:${Math.min(100, v / m * 100)}%"></i></div>`;

function loginView() {
  $('#root').innerHTML = `<div class="login"><h1>Pedagoglar reytingi</h1><p class="sub">Norin tuman ixtisoslashtirilgan maktabi. Maktab bergan login va parol bilan kiring.</p>
  <form id="lf"><label for="lg">Login</label><input id="lg" autocomplete="username" required autofocus>
  <label for="pw">Parol</label><input id="pw" type="password" autocomplete="current-password" required>
  <p class="err" id="le" role="alert"></p><button class="p" type="submit">Kirish</button></form></div>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    try { await api('/login', { body: { login: $('#lg').value, password: $('#pw').value } }); start(); }
    catch (x) { $('#le').textContent = x.message; }
  };
}

function pwView(forced) {
  $('#root').innerHTML = `<div class="login"><h1>${forced ? 'Yangi parol belgilang' : 'Parolni almashtirish'}</h1>
  <p class="sub">${forced ? 'Birinchi kirishda vaqtinchalik parolni o‘zgartirish shart.' : ''} Yangi parol kamida 8 belgidan iborat bo‘lsin.</p>
  <form id="pf"><label for="po">Joriy parol</label><input id="po" type="password" autocomplete="current-password" required>
  <label for="pn">Yangi parol</label><input id="pn" type="password" autocomplete="new-password" minlength="8" required>
  <p class="err" id="pe" role="alert"></p><div class="row"><button class="p" type="submit">Parolni saqlash</button>${forced ? '' : '<button class="s" type="button" id="pc">Bekor qilish</button>'}</div></form></div>`;
  if (!forced) $('#pc').onclick = shell;
  $('#pf').onsubmit = async e => {
    e.preventDefault();
    try { await api('/password', { body: { old: $('#po').value, new: $('#pn').value } }); start(); }
    catch (x) { $('#pe').textContent = x.message; }
  };
}

function tabs() {
  const t = [];
  if (['teacher', 'reviewer', 'director'].includes(ME.role)) {
    t.push(['home', 'Mening natijam'], ['add', 'Natija qo‘shish']);
  }
  t.push(['rank', 'Reyting']);
  if (['teacher', 'reviewer', 'director'].includes(ME.role)) {
    t.push(['port', 'Portfolio']);
  }
  if (['reviewer', 'director', 'admin'].includes(ME.role)) {
    t.push(['rev', 'Tasdiqlash']);
  }
  if (['director', 'reviewer', 'it_admin', 'admin'].includes(ME.role)) {
    t.push(['ctl', 'Nazorat']);
  }
  if (['it_admin', 'director', 'admin'].includes(ME.role)) {
    t.push(['users', 'Foydalanuvchilar']);
  }
  return t;
}
function shell() {
  $('#root').innerHTML = `<div class="shell"><nav aria-label="Asosiy menyu"><div class="brand">Pedagoglar reytingi<small>Norin tuman ixtisoslashtirilgan maktabi</small></div>
  ${tabs().map(t => `<button data-t="${t[0]}" class="${TAB === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}
  <div class="sp"></div><div class="who">${esc(ME.name)}<br>${ROLE[ME.role]}</div>
  <button id="cp">Parolni almashtirish</button><button id="lo">Chiqish</button></nav><main id="main"><div class="msg">Yuklanmoqda…</div></main></div>`;
  document.querySelectorAll('nav [data-t]').forEach(b => b.onclick = () => { TAB = b.dataset.t; PORT_UID = null; shell(); });
  $('#cp').onclick = () => pwView(false);
  $('#lo').onclick = async () => { await api('/logout', { method: 'POST' }).catch(() => { }); ME = null; loginView(); };
  const v = { home: vHome, add: vAdd, rank: vRank, port: vPort, rev: vRev, ctl: vCtl, users: vUsers }[TAB];
  v().catch(e => { if (e.message !== 'Tizimga kiring') $('#main').innerHTML = `<div class="msg">${esc(e.message)}</div>`; });
}
const main = h => { $('#main').innerHTML = h; };

function nextDay(d) {
  const n = new Date(), t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  let t = new Date(n.getFullYear(), n.getMonth(), d); if (t < t0) t = new Date(n.getFullYear(), n.getMonth() + 1, d);
  return [t, Math.round((t - t0) / 864e5)];
}
const fmt = t => t.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });

function indTable(k) {
  let h = '<table><tr><th>Indikator</th><th>Ball</th><th>Tekshiruvda</th></tr>', sec = '';
  CFG.ind.forEach(i => {
    if (i.sec !== sec) { sec = i.sec; h += `<tr><td colspan="3"><b>${esc(CFG.sec[sec][0])}</b> <span class="sub">(${CFG.sec[sec][1]} ball)</span></td></tr>`; }
    const x = k.by[i.id];
    h += `<tr><td>${i.id}. ${esc(i.name)}</td><td><b>${x.ok}</b> / ${i.max}${one(x.ok, i.max, i.sec.toLowerCase())}</td><td class="st-pending">${x.wait ? '+' + x.wait : '—'}</td></tr>`;
  });
  return h + '</table>';
}
function entryRows(es, canDel) {
  if (!es.length) return '<div class="msg">Hali natija kiritilmagan. “Natija qo‘shish” bo‘limidan boshlang.</div>';
  return '<table><tr><th>Sana</th><th>Yutuq</th><th>Ball</th><th>Holat</th><th></th></tr>' + es.map(e =>
    `<tr><td>${esc(e.date)}</td><td>${e.ind}. ${esc(e.type)} × ${e.qty}<div class="sub">${esc(e.descr)}${e.file ? ` · <a href="/files/${e.id}" target="_blank" rel="noopener">hujjat</a>` : ''}${e.note ? ' · Izoh: ' + esc(e.note) : ''}</div></td>
    <td>${e.pts}</td><td class="st-${e.status}">${STX[e.status]}</td><td>${canDel && e.status !== 'approved' ? `<button class="s" data-del="${e.id}">O‘chirish</button>` : ''}</td></tr>`).join('') + '</table>';
}

async function vHome() {
  const d = await api('/my'), k = d.calc;
  const gaps = CFG.ind.map(i => ({ i, g: i.max - k.by[i.id].ok - k.by[i.id].wait })).filter(x => x.g > 0).sort((a, b) => b.g - a.g).slice(0, 4);
  const [d20, n20] = nextDay(20), [d25, n25] = nextDay(25);
  main(`<h2>Mening natijam</h2>
  <div class="grid"><div class="card"><div class="k">Umumiy ball</div><div class="v">${k.T} <small>/ ${TOT}</small></div>${bar(k.A, k.B, k.C)}
  <div class="sub" style="margin-top:8px">Reytingdagi o‘rin: ${d.rank ? d.rank + ' / ' + d.total : '—'}</div></div>
  ${['A', 'B', 'C'].map(s => `<div class="card"><div class="k">${esc(CFG.sec[s][0])}</div><div class="v">${k[s]} <small>/ ${CFG.sec[s][1]}</small></div>${one(k[s], CFG.sec[s][1], s.toLowerCase())}</div>`).join('')}</div>
  <div class="card sc"><h3>Indikatorlar kesimida</h3>${indTable(k)}</div>
  <div class="card"><h3>Muddatlar</h3><p>Har oyning 20-sanasigacha mas’ullarga ma’lumot topshiriladi: <b>${fmt(d20)}</b> (${n20} kun qoldi).<br>O‘IBDO‘ga yozma hisobot muddati: <b>${fmt(d25)}</b> (${n25} kun qoldi).</p></div>
  <div class="card"><h3>Keyingi qadamlar</h3>${gaps.length ? gaps.map(x => `<p><b>${x.i.id}. ${esc(x.i.name)}</b> — yana ${x.g} ball mumkin.<br><span class="sub">Mas’ul: ${esc(x.i.resp)}. Kerakli hujjat: ${esc(x.i.doc)}</span></p>`).join('') : 'Barcha indikatorlar bo‘yicha maksimal ball!'}</div>
  <div class="card sc"><h3>Mening yutuqlarim</h3>${entryRows(d.entries, true)}</div>`);
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Yutuq o‘chirilsinmi?')) return;
    try { await api('/entries/' + b.dataset.del, { method: 'DELETE' }); vHome(); } catch (e) { alert(e.message); }
  });
}

async function vAdd() {
  const i = CFG.ind.find(x => x.id === SEL);
  main(`<h2>Yangi natija qo‘shish</h2><div class="card"><form id="af">
  <label for="fi">Indikator</label><select id="fi">${CFG.ind.map(x => `<option value="${x.id}" ${x.id === SEL ? 'selected' : ''}>${x.id}. ${esc(x.name)} (maks ${x.max})${x.sec === 'C' ? ' ★' : ''}</option>`).join('')}</select>
  <label for="ft">Yutuq turi</label><select id="ft">${i.types.map(t => `<option value="${esc(t[0])}">${esc(t[0])} — ${t[1]} ball</option>`).join('')}</select>
  <label for="fq">Soni (o‘quvchilar yoki sinflar soni)</label><input id="fq" type="number" min="1" max="20" value="1">
  <label for="fd">Tavsif (nomi, tashkilot, sinf/chorak)</label><input id="fd" maxlength="300" required placeholder="Masalan: IELTS 7.5, 2026-oktyabr">
  <label for="fx">Sana</label><input id="fx" type="date" value="${new Date().toISOString().slice(0, 10)}" required>
  <label for="ff">Tasdiqlovchi hujjat (PDF, JPG, PNG; 8 MB gacha)</label><input id="ff" type="file" accept=".pdf,.jpg,.jpeg,.png">
  <p class="sub">Kerakli hujjat: ${esc(i.doc)}. Mas’ul: ${esc(i.resp)}.${i.sec === 'C' ? ' ★ Rag‘bat indikatori: o‘z fanidan tayyorlagan ustozga qo‘shimcha ball.' : ''} Ball mas’ul tasdiqlagandan keyin hisoblanadi.</p>
  <p class="err" id="ae" role="alert"></p><button class="p" type="submit">Yuborish</button></form></div>`);
  $('#fi').onchange = e => { SEL = +e.target.value; vAdd(); };
  $('#af').onsubmit = async e => {
    e.preventDefault();
    const body = { ind: SEL, type: $('#ft').value, qty: +$('#fq').value, descr: $('#fd').value, date: $('#fx').value };
    const f = $('#ff').files[0];
    try {
      if (f) {
        if (f.size > 8 * 1024 * 1024) throw new Error('Fayl 8 MB dan oshmasin');
        body.file = { name: f.name, data: await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.onerror = no; r.readAsDataURL(f); }) };
      }
      await api('/entries', { body }); TAB = 'home'; shell();
    } catch (x) { $('#ae').textContent = x.message; }
  };
}

async function vRank() {
  const rk = await api('/ranking'), subs = [...new Set(rk.map(x => x.subject).filter(Boolean))].sort();
  main(`<h2>Pedagoglar reytingi</h2><div class="card"><div class="legend"><span class="a">Salohiyat (50)</span><span class="b">Yutuqlar (30)</span><span class="c">Rag‘bat (50)</span></div>
  <div class="row noprint" style="margin-bottom:10px"><select id="sf" style="max-width:260px"><option value="">Barcha fanlar</option>${subs.map(s => `<option>${esc(s)}</option>`).join('')}</select>
  ${ME.role !== 'teacher' ? '<a href="/api/export.csv" class="noprint">Excel (CSV) yuklab olish</a>' : ''}</div>
  <div class="sc"><table id="rt"></table></div><p class="sub">Faqat tasdiqlangan ballar hisoblanadi.</p></div>`);
  const draw = () => {
    const f = $('#sf').value;
    $('#rt').innerHTML = '<tr><th>#</th><th>Pedagog</th><th>Fan</th><th>Jami</th><th class="rk">Tarkibi</th></tr>' +
      rk.filter(x => !f || x.subject === f).map(x => `<tr class="${x.id === ME.id ? 'me' : ''}"><td>${x.rank}</td><td>${esc(x.name)}</td><td>${esc(x.subject || '—')}</td><td><b>${x.T}</b> / ${TOT}</td><td>${bar(x.A, x.B, x.C)}</td></tr>`).join('');
  };
  $('#sf').onchange = draw; draw();
}

async function vPort() {
  let uid = PORT_UID || ME.id, pick = '';
  if (ME.role !== 'teacher') {
    const rk = await api('/ranking');
    pick = `<div class="noprint" style="margin-bottom:12px"><label for="pu">Pedagogni tanlang</label><select id="pu" style="max-width:320px">${rk.map(x => `<option value="${x.id}" ${x.id === uid ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>`;
  }
  const d = await api('/portfolio/' + uid), k = d.calc, ok = d.entries.filter(e => e.status === 'approved');
  main(`<h2>Shaxsiy portfolio</h2>${pick}
  <div class="card"><h3>${esc(d.user.name)}</h3><p>${esc(d.user.subject || '')}<br>Umumiy ball: <b>${k.T} / ${TOT}</b> · Reytingdagi o‘rin: ${d.rank || '—'}<br>Salohiyat: ${k.A}/50 · Yutuqlar: ${k.B}/30 · Rag‘bat: ${k.C}/50</p>
  <p class="sub print-only">Sana: ${new Date().toLocaleDateString('uz-UZ')}. Faqat tasdiqlangan yutuqlar kiritilgan.</p></div>
  <div class="card sc"><h3>Indikatorlar</h3>${indTable(k)}</div>
  <div class="card sc"><h3>Tasdiqlangan yutuqlar</h3>${entryRows(ok, false)}</div>
  <button class="p noprint" id="pr">Chop etish / PDF</button>`);
  $('#pr').onclick = () => window.print();
  if ($('#pu')) $('#pu').onchange = e => { PORT_UID = +e.target.value; vPort(); };
}

async function vRev() {
  const rows = await api('/entries?status=pending');
  main(`<h2>Tasdiqlash kutilmoqda (${rows.length})</h2><div class="card sc">${rows.length ? '<table><tr><th>Pedagog</th><th>Yutuq</th><th>Ball</th><th>Izoh va qaror</th></tr>' + rows.map(e =>
    `<tr><td>${esc(e.name)}</td><td>${e.ind}. ${esc(e.type)} × ${e.qty}<div class="sub">${esc(e.descr)} · ${esc(e.date)}${e.file ? ` · <a href="/files/${e.id}" target="_blank" rel="noopener">hujjat</a>` : ' · hujjatsiz'}</div></td><td>${e.pts}</td>
    <td><input id="n${e.id}" placeholder="Izoh (ixtiyoriy)" maxlength="300"><div class="row" style="margin-top:6px"><button class="s" data-r="approved" data-id="${e.id}">✓ Tasdiqlash</button><button class="s" data-r="rejected" data-id="${e.id}">✕ Rad etish</button></div></td></tr>`).join('') + '</table>' : '<div class="msg">Kutilayotgan yutuq yo‘q.</div>'}</div>`);
  document.querySelectorAll('[data-r]').forEach(b => b.onclick = async () => {
    try { await api(`/entries/${b.dataset.id}/review`, { body: { status: b.dataset.r, note: $('#n' + b.dataset.id).value } }); vRev(); } catch (e) { alert(e.message); }
  });
}

async function vCtl() {
  const s = await api('/stats');
  main(`<h2>Umumiy nazorat</h2><div class="grid">
  <div class="card"><div class="k">Pedagoglar</div><div class="v">${s.teachers}</div></div>
  <div class="card"><div class="k">O‘rtacha ball</div><div class="v">${s.avg} <small>/ ${TOT}</small></div></div>
  <div class="card"><div class="k">Tekshiruv kutmoqda</div><div class="v st-pending">${s.pending}</div></div>
  <div class="card"><div class="k">Tasdiqlangan / rad etilgan</div><div class="v">${s.approved} <small>/ ${s.rejected}</small></div></div></div>
  <div class="card sc"><h3>Fanlar kesimida o‘rtacha ball</h3><table><tr><th>Fan</th><th>Pedagoglar</th><th>O‘rtacha ball</th></tr>${s.subjects.map(x => `<tr><td>${esc(x.subject)}</td><td>${x.n}</td><td><b>${x.avg}</b>${one(x.avg, TOT, 'a')}</td></tr>`).join('')}</table></div>
  <div class="card sc"><h3>Indikatorlar bo‘yicha tasdiqlangan yutuqlar soni</h3><table>${CFG.ind.map(i => `<tr><td>${i.id}. ${esc(i.name)}</td><td>${s.ind[i.id] || 0}</td></tr>`).join('')}</table></div>
  <a href="/api/export.csv">Reytingni Excel (CSV) ko‘rinishida yuklab olish</a>`);
}

function credBox(list) {
  if (!list || !list.length) return '';
  const rows = list.map(c => `<tr><td><b>${esc(c.login)}</b></td><td><code style="background:#fef3c7;padding:2px 6px;border-radius:4px">${esc(c.password)}</code></td><td>${esc(c.name)}</td><td>${esc(c.subject || '—')}</td></tr>`).join('');
  return `<div class="card" style="border:2px solid #0a6c68;background:#e6f0ef">
    <h3 style="color:#0a6c68">✅ ${list.length} ta pedagog uchun login va parollar yaratildi!</h3>
    <p class="sub">Ushbu parollarni CSV fayl qilib yuklab oling va pedagoglarga tarqating. Ular birinchi kirishda parolni o‘zgartiradilar.</p>
    <div style="max-height:220px;overflow-y:auto;margin:10px 0;background:#fff;border-radius:6px;border:1px solid #d8e0de">
      <table>
        <thead><tr><th>Login</th><th>Parol</th><th>F.I.Sh.</th><th>Fan</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <button class="p" id="dl">📥 Parollarni CSV (Excel) faylda yuklab olish</button>
  </div>`;
}

async function vUsers(extra = '') {
  const us = await api('/users');
  main(`<h2>Foydalanuvchilar boshqaruvi</h2><div id="cr">${extra}</div>
  
  <div class="card" style="border-top:4px solid #0a6c68">
    <h3>Pedagoglarni ommaviy yuklash (Fayl yoki matn orqali)</h3>
    <p class="sub">Excel (.csv, .txt) faylini tanlang yoki to‘g‘ridan-to‘g‘ri ro‘yxatni kiriting. Tizim har bir pedagog uchun avtomatik login va vaqtinchalik parol yaratadi. Yuklangan fayl server xotirasini tejash uchun diskda saqlanmaydi.</p>
    
    <div class="row" style="margin-bottom:12px;gap:10px;align-items:center">
      <input type="file" id="uf" accept=".csv,.txt" style="display:none">
      <button class="s" type="button" id="ub" style="cursor:pointer;font-weight:600">📁 Excel / CSV fayldan yuklash</button>
      <span id="fn" class="sub"></span>
    </div>

    <p class="sub" style="margin-top:6px">Yoki quyidagi maydonga yozing/joylang (Har qatorda: <code>F.I.Sh.; Fan</code>):</p>
    <textarea id="bt" rows="4" placeholder="Karimov Anvar Jo‘rayevich; Matematika&#10;Rasulova Ziyoda; Ingliz tili&#10;Sobirov Jamshid; Fizika"></textarea>
    <div class="row" style="margin-top:8px">
      <button class="p" id="bb">⚡ Barchasini qo‘shish va parollar yaratish</button>
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
    <h3>Barcha foydalanuvchilar (${us.length} nafar)</h3>
    <table><tr><th>Login</th><th>F.I.Sh. / Fan</th><th>Rol</th><th>Reytingda</th><th>Amallar</th></tr>
    ${us.map(u => `<tr style="${u.active ? '' : 'opacity:.5'}">
      <td><b>${esc(u.login)}</b></td>
      <td>${esc(u.name)}<div class="sub">${esc(u.subject)}</div></td>
      <td>
        <select data-role="${u.id}">
          ${['teacher', 'reviewer', 'it_admin', 'director'].map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${ROLE[r] || r}</option>`).join('')}
        </select>
      </td>
      <td><input type="checkbox" data-rk="${u.id}" ${u.ranked ? 'checked' : ''} aria-label="Reytingda"></td>
      <td class="row">
        <button class="s" data-reset="${u.id}">Parolni tiklash</button>
        <button class="s" data-act="${u.id}" data-v="${u.active ? 0 : 1}">${u.active ? 'O‘chirish' : 'Yoqish'}</button>
      </td>
    </tr>`).join('')}
    </table>
  </div>`);

  const show = list => {
    vUsers(credBox(list)).then(() => {
      const dlBtn = $('#dl');
      if (dlBtn) {
        dlBtn.onclick = () => {
          const b = new Blob(['\ufeffLogin;Parol;F.I.Sh.;Fan\n' + list.map(c => [c.login, c.password, c.name || '', c.subject || ''].join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = 'pedagoglar_parollari.csv';
          a.click();
        };
      }
    });
  };

  const upd = (id, body) => api('/users/' + id, { body }).then(() => vUsers()).catch(e => { alert(e.message); vUsers(); });
  document.querySelectorAll('[data-role]').forEach(s => s.onchange = () => upd(s.dataset.role, { role: s.value }));
  document.querySelectorAll('[data-rk]').forEach(s => s.onchange = () => upd(s.dataset.rk, { ranked: s.checked }));
  document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => upd(b.dataset.act, { active: +b.dataset.v }));
  document.querySelectorAll('[data-reset]').forEach(b => b.onclick = async () => {
    if (confirm('Yangi vaqtinchalik parol berilsinmi?')) {
      try { show([await api('/users/' + b.dataset.reset, { body: { reset: 1 } })]); }
      catch (e) { alert(e.message); }
    }
  });

  $('#nf').onsubmit = async e => {
    e.preventDefault();
    try {
      show([await api('/users', { body: { name: $('#nn').value, subject: $('#ns').value, login: $('#nl').value, role: 'teacher' } })]);
    } catch (x) { alert(x.message); }
  };

  const ub = $('#ub');
  const uf = $('#uf');
  if (ub && uf) {
    ub.onclick = () => uf.click();
    uf.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      $('#fn').textContent = f.name + ' (' + Math.round(f.size/1024) + ' KB)';
      const r = new FileReader();
      r.onload = ev => { $('#bt').value = ev.target.result; };
      r.readAsText(f);
    };
  }

  $('#bb').onclick = async () => {
    const val = $('#bt').value.trim();
    if (!val) return alert('Iltimos, ro‘yxatni kiriting yoki fayl tanlang!');
    try {
      const r = await api('/users/bulk', { body: { text: val } });
      show(r.created);
      if (r.errors && r.errors.length) alert('Quyidagilarda xatolik:\n' + r.errors.join('\n'));
    } catch (x) { alert(x.message); }
  };
}

async function start() {
  try {
    ME = await api('/me');
    if (ME.must_change) return pwView(true);
    CFG = await api('/config');
    shell();
  } catch (e) { loginView(); }
}
start();
