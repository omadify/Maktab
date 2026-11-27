// Comprehensive Automated Test Suite for Norin Pedagog Reyting V4.0
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  IND,
  IMAP,
  SEC,
  calcAuthoritativePts,
  calcScores,
  filterEntriesByPeriod,
  getRanking,
  makeLogin,
  tempPw,
  extractSubjectLabel
} from '../js/config.js';
import { validateProofFile } from '../js/api.js';
import { csvCell } from '../js/ui.js';

let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log(`PASS: ${name}`);
}

// 1. Rating Engine & 26-AF Decree Compliance
await test('26-AF schema has 15 indicators and 130 max points (A=50, B=30, C=50)', () => {
  assert.equal(IND.length, 15);
  assert.equal(SEC.A[1], 50);
  assert.equal(SEC.B[1], 30);
  assert.equal(SEC.C[1], 50);
  assert.equal(SEC.A[1] + SEC.B[1] + SEC.C[1], 130);
  const sumA = IND.filter(i => i.sec === 'A').reduce((s, i) => s + i.max, 0);
  const sumB = IND.filter(i => i.sec === 'B').reduce((s, i) => s + i.max, 0);
  const sumC = IND.filter(i => i.sec === 'C').reduce((s, i) => s + i.max, 0);
  assert.equal(sumA, 50);
  assert.equal(sumB, 30);
  assert.equal(sumC, 50);
});

await test('calcAuthoritativePts validates indicator, type, qty and caps at indicator max', () => {
  assert.equal(calcAuthoritativePts(1, 'PhD / dotsent', 2), 10); // 8*2=16 capped at 10
  assert.equal(calcAuthoritativePts(18, '90% va yuqori (sinf/chorak)', 3), 12);
  assert.equal(calcAuthoritativePts(18, '90% va yuqori (sinf/chorak)', 10), 20); // capped at 20
  assert.equal(calcAuthoritativePts(999, 'Oliy toifa', 1), null);
  assert.equal(calcAuthoritativePts(1, 'Noto‘g‘ri tur', 1), null);
  assert.equal(calcAuthoritativePts(1, 'Oliy toifa', 0), null);
  assert.equal(calcAuthoritativePts(1, 'Oliy toifa', 51), null);
});

await test('calcScores caps per-indicator approved & pending and excludes rejected', () => {
  const rows = [
    { ind: 1, status: 'approved', pts: 8 },
    { ind: 1, status: 'approved', pts: 6 }, // capped at 10
    { ind: 1, status: 'pending', pts: 5 },  // 10-10 = 0 remaining wait
    { ind: 2, status: 'pending', pts: 4 },
    { ind: 14, status: 'approved', pts: 5 },
    { ind: 18, status: 'rejected', pts: 10 }
  ];
  const sc = calcScores(rows);
  assert.equal(sc.by[1].ok, 10);
  assert.equal(sc.by[1].wait, 0);
  assert.equal(sc.by[2].ok, 0);
  assert.equal(sc.by[2].wait, 4);
  assert.equal(sc.A, 10);
  assert.equal(sc.B, 5);
  assert.equal(sc.C, 0);
  assert.equal(sc.T, 15);
});

await test('getRanking sorts by Total DESC, Section A DESC, Name ASC and excludes inactive/unranked', () => {
  const users = [
    { id: 1, name: 'Alisher Xolmatov', role: 'director', ranked: 0, active: 1 },
    { id: 2, name: 'Bobur Karimov', subject: '10-A | Fizika', role: 'teacher', ranked: 1, active: 1 },
    { id: 3, name: 'Anvar Alimov', subject: '9-B | Matematika', role: 'teacher', ranked: 1, active: 1 },
    { id: 4, name: 'Disabled Teacher', subject: 'Kimyo', role: 'teacher', ranked: 1, active: 0 }
  ];
  const entries = [
    { uid: 2, ind: 1, status: 'approved', pts: 8, date: '2026-11-10' },
    { uid: 2, ind: 14, status: 'approved', pts: 2, date: '2026-11-10' }, // T=10, A=8
    { uid: 3, ind: 1, status: 'approved', pts: 6, date: '2026-11-10' },
    { uid: 3, ind: 14, status: 'approved', pts: 4, date: '2026-11-10' }  // T=10, A=6
  ];
  const rk = getRanking(users, entries);
  assert.equal(rk.length, 2);
  assert.equal(rk[0].id, 2); // Higher Section A breaks tie
  assert.equal(rk[0].rank, 1);
  assert.equal(rk[1].id, 3);
  assert.equal(rk[1].rank, 2);
});

await test('Parity check against Python config.py calc_scores', () => {
  const pyOut = execSync(
    `python3 -c "import json; from config import calc_scores; print(json.dumps(calc_scores([(1,'approved',8),(1,'approved',6),(14,'approved',5),(18,'pending',4),(2,'rejected',5)])))"`,
    { encoding: 'utf8' }
  ).trim();
  const pyRes = JSON.parse(pyOut);
  const jsRes = calcScores([
    { ind: 1, status: 'approved', pts: 8 },
    { ind: 1, status: 'approved', pts: 6 },
    { ind: 14, status: 'approved', pts: 5 },
    { ind: 18, status: 'pending', pts: 4 },
    { ind: 2, status: 'rejected', pts: 5 }
  ]);
  assert.equal(jsRes.A, pyRes.A);
  assert.equal(jsRes.B, pyRes.B);
  assert.equal(jsRes.C, pyRes.C);
  assert.equal(jsRes.T, pyRes.T);
});

// 2. Security, CSV Injection, Crypto Temp Password, File Magic Bytes
await test('csvCell neutralizes formula injection payloads', () => {
  assert.equal(csvCell('=SUM(A1:A2)'), `"'=SUM(A1:A2)"`);
  assert.equal(csvCell('+cmd|calc'), `"'` + `+cmd|calc"`);
  assert.equal(csvCell('@IMPORTXML'), `"'@IMPORTXML"`);
  assert.equal(csvCell('Normal "Text"'), '"Normal ""Text"""');
});

await test('tempPw uses CSPRNG and produces strong temporary format without Math.random', () => {
  const pw = tempPw();
  assert.match(pw, /^Mktb#[2-9A-HJ-NP-Z]{6}$/);
  const cfgSrc = fs.readFileSync('js/config.js', 'utf8');
  assert.equal(cfgSrc.includes('Math.random'), false, 'config.js must not use Math.random');
});

await test('validateProofFile verifies real PDF/PNG/JPEG magic bytes', async () => {
  const makeMockFile = (name, bytes) => ({
    name,
    size: bytes.length,
    slice: (a, b) => ({ arrayBuffer: async () => bytes.slice(a, b).buffer })
  });
  await validateProofFile(makeMockFile('doc.pdf', new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])));
  await validateProofFile(makeMockFile('img.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
  await validateProofFile(makeMockFile('pic.jpg', new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])));
  await assert.rejects(() => validateProofFile(makeMockFile('fake.pdf', new Uint8Array([0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x3e]))));
  await assert.rejects(() => validateProofFile(makeMockFile('script.html', new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e, 0x00, 0x00]))));
});

// 3. Import & Login Uniqueness
await test('makeLogin handles Uzbek transliteration and deduplication', () => {
  const set = new Set(['o.karimov']);
  assert.equal(makeLogin('O‘tkir Karimov', set), 'o.karimov2');
  assert.equal(extractSubjectLabel('10-A sinf | Ingliz tili'), 'Ingliz tili');
});

// 4. Static Codebase Integrity (Imports, Exports, No Emoji, No Browser alert/confirm/prompt)
await test('All ES modules, assets, emoji-free UI, and non-blocking dialogs pass audit', async () => {
  const files = [
    'app.js', 'js/config.js', 'js/api.js', 'js/icons.js', 'js/ui.js', 'js/charts.js', 'js/command.js',
    'js/views/auth.js', 'js/views/dashboard.js', 'js/views/ranking.js', 'js/views/profile.js',
    'js/views/entries.js', 'js/views/admin.js', 'js/views/monitoring.js'
  ];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const dir = path.dirname(f);
    for (const m of src.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]([^'\"]+)['"]/g)) {
      const target = path.normalize(path.join(dir, m[2]));
      assert.ok(fs.existsSync(target), `Missing import ${target} in ${f}`);
      const mod = await import('../' + target);
      for (const sym of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
        const clean = sym.split(/\s+as\s+/)[0].trim();
        assert.ok(clean in mod, `Missing export ${clean} in ${target}`);
      }
    }
    const emojiMatch = src.match(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu);
    assert.equal(emojiMatch, null, `Emoji found in ${f}: ${emojiMatch}`);
    assert.equal(/\b(window\.)?(alert|confirm|prompt)\s*\(/.test(src), false, `Blocking browser dialog found in ${f}`);
  }
  const html = fs.readFileSync('index.html', 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const p = m[1];
    if (!p.startsWith('http')) assert.ok(fs.existsSync(p), `Missing HTML asset: ${p}`);
  }
});

// 5. SQL Migration Parity Check (All 15 indicator IDs exist in calc_authoritative_pts)
await test('SQL V4 migration contains all 15 indicators and security tables', () => {
  const sql = fs.readFileSync('supabase/migrations/20261127_v4_security_monitoring.sql', 'utf8');
  for (const ind of IND) {
    assert.ok(sql.includes(`when ${ind.id} then`), `Missing indicator ${ind.id} in SQL calc_authoritative_pts`);
  }
  for (const tbl of ['user_sessions', 'login_history', 'activity_logs', 'user_presence', 'notifications']) {
    assert.ok(sql.includes(`public.${tbl}`), `Missing table ${tbl} in SQL migration`);
  }
  assert.ok(sql.includes('enable row level security'), 'RLS must be enabled');
});

console.log(`\nALL ${passed} TESTS PASSED SUCCESSFULLY.`);
