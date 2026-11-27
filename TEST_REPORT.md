# TEST REPORT — MAKTAB PLATFORM V6

## 1. Avtomatlashtirilgan Unit va Integratsiya Testlari (`node tests/run-tests.mjs`)
Oxirgi tahrirlardan keyingi natija: **11 / 11 PASS**.

| # | Test | Natija |
|---|---|---|
| 1 | `26-AF schema has 15 indicators and 130 max points (A=50, B=30, C=50)` | PASS |
| 2 | `calcAuthoritativePts validates indicator, type, qty and caps at indicator max` | PASS |
| 3 | `calcScores caps per-indicator approved & pending and excludes rejected` | PASS |
| 4 | `getRanking sorts by Total DESC, Section A DESC, Name ASC and excludes inactive/unranked` | PASS |
| 5 | `Parity check against Python config.py calc_scores` | PASS |
| 6 | `csvCell neutralizes formula injection payloads` | PASS |
| 7 | `tempPw uses CSPRNG and produces strong temporary format without Math.random` | PASS |
| 8 | `validateProofFile & validateImageFile verify real magic bytes` | PASS |
| 9 | `makeLogin handles Uzbek transliteration and deduplication` | PASS |
| 10 | `All V6 ES modules, assets, emoji-free UI, and non-blocking dialogs pass audit` | PASS |
| 11 | `SQL V4 & V6 migrations contain all 15 indicators, security tables, and V6 module RPCs` | PASS |

## 2. Sintaksis va Build Tekshiruvlari
- `node --check` barcha 18 ta JS modul + `scripts/build-public.mjs` + `tests/run-tests.mjs`: **PASS**.
- `python3 -m py_compile app.py config.py db.py importer.py`: **PASS**.
- `node scripts/build-public.mjs` (`dist/` toza frontend yig‘ish): **PASS**.

## 3. Haqiqiy Brauzer Tekshiruvi (Playwright Chromium Headless + Sintetik Mock Server)
- **Tekshirilgan rollar:** `director` (`direktor`), `teacher` (`a.karimov`), `reviewer` (`d.rasulova`), `it_admin` (`it_admin`).
- **Tekshirilgan ekran o‘lchamlari (0 ta gorizontal overflow):** `320px`, `360px`, `375px`, `390px`, `430px`, `768px`, `1024px`, `1440px`, `1920px`.
- **Tekshirilgan oqimlar:** Login (Light/Dark), Direktor Dashboard, Tasdiqlash markazi, Admin foydalanuvchilar, Pedagog Dashboard, Reyting jadvali, Telegram-uslubidagi Profil + Hujjatlar + Tahrirlash draweri, `Mening faoliyatim`, `Murojaatlar va apellyatsiyalar`, `Rivojlanish rejasi`, `Sozlamalar -> Sessiyalar`, `Ctrl+K` Command Palette, Mobil pastki dock va mobil drawer.
- **Konsol va sahifa xatolari:** `ERRORS: 0` (tashqi Google Fonts / SheetJS CDN so‘rovlari oflayn muhitda bo‘sh `200` javob bilan stub qilingan).
- **Olingan screenshotlar (`screenshots/`):** 19 ta real PNG screenshot (`01-login-light.png` dan `19-reviewer-dashboard.png` gacha; `reviewer` roli faqat tekshiruvchi ekanligi va `add_entry`/`my_results` yo‘qligi tekshirildi).

## 4. Tekshirilmagan Qismlar (Muhit Cheklovlari)
- **Jonli Supabase Postgres:** Production/staging bazaga ruxsatsiz o‘zgartirish kiritilmagani sababli V4/V6 SQL skriptlari jonli PostgreSQL da bajarilmadi (sintaksis va struktura auditdan o‘tgan).
- **Core Web Vitals (LCP / CLS / INP) va Lighthouse:** Haqiqiy tarmoq/production muhitida deploydan keyin o‘lchanishi kerak (hujjatlarda maqsad ko‘rsatkichlar sifatida belgilangan).
