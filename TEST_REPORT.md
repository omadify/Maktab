# TEST REPORT — V4.0

## 1. Bajarilgan Avtomatlashtirilgan Testlar (`tests/run-tests.mjs`)

Tekshiruv buyrug‘i: `node tests/run-tests.mjs`

| # | Test nomi | Natija | Izoh |
|---|---|---|---|
| 1 | `26-AF schema has 15 indicators and 130 max points (A=50, B=30, C=50)` | PASS | 15 ta indikator va A(50)+B(30)+C(50)=130 ball tekshirildi. |
| 2 | `calcAuthoritativePts validates indicator, type, qty and caps at indicator max` | PASS | Limitdan oshish, noto‘g‘ri indikator/tur va miqdor chegaralari (`1..50`) tekshirildi. |
| 3 | `calcScores caps per-indicator approved & pending and excludes rejected` | PASS | Har bir indikator limiti va `rejected` ballarni chiqarib tashlash tekshirildi. |
| 4 | `getRanking sorts by Total DESC, Section A DESC, Name ASC and excludes inactive/unranked` | PASS | Tie-breaking va faolsiz/reytingdan tashqari hisoblar filtrlandi. |
| 5 | `Parity check against Python config.py calc_scores` | PASS | JS `calcScores` va Python `config.py:calc_scores` natijalari 100% mos keldi. |
| 6 | `csvCell neutralizes formula injection payloads` | PASS | `=`, `+`, `@` bilan boshlangan qiymatlar neytrallandi. |
| 7 | `tempPw uses CSPRNG and produces strong temporary format without Math.random` | PASS | `crypto.getRandomValues` ishlatilishi va `Math.random` yo‘qligi tasdiqlandi. |
| 8 | `validateProofFile verifies real PDF/PNG/JPEG magic bytes` | PASS | Soxta kengaytmali HTML/skript fayllar rad etildi, haqiqiy PDF/PNG/JPEG o‘tdi. |
| 9 | `makeLogin handles Uzbek transliteration and deduplication` | PASS | O‘zbekcha transliteratsiya va dublikat login raqamlash tekshirildi. |
| 10 | `All ES modules, assets, emoji-free UI, and non-blocking dialogs pass audit` | PASS | Barcha 14 ta JS modul import/exportlari, `index.html` havolalari, emoji yo‘qligi va `alert/confirm/prompt` yo‘qligi tasdiqlandi. |
| 11 | `SQL V4 migration contains all 15 indicators and security tables` | PASS | 15 ta indikator, 5 ta yangi jadval va RLS qoidalari SQL faylda tekshirildi. |

## 2. Qo‘shimcha Sintaksis va Build Tekshiruvlari
- `node --check` barcha 14 ta JS faylda **PASS**.
- `node scripts/build-public.mjs` (`dist/` frontend yig‘ish) **PASS**.
- `python3 -m py_compile app.py config.py db.py importer.py` **PASS**.

## 3. Tekshirilmagan Qismlar (Muhit Cheklovlari)
- **Haqiqiy brauzer (Chromium/Playwright) va Screenshotlar (`SCREENSHOTS/`):** Ushbu konteynerda brauzer dasturi (`chrome`/`chromium`/`playwright`) o‘rnatilmagan va tarmoq izolyatsiyasi sababli jonli UI render, `320px–1920px` vizual screenshotlar hamda Lighthouse o‘lchovlari ishga tushirilmadi.
- **Jonli Supabase SQL migratsiya va RLS testlari:** Tashqi tarmoqqa chiqilmagani va production bazaga ruxsatsiz o‘zgartirish taqiqlangani sababli `20261127_v4_security_monitoring.sql` jonli Postgres’da bajarib test qilinmadi.
