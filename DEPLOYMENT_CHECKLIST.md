# DEPLOYMENT CHECKLIST — MAKTAB PLATFORM V6

## 1. Oldindan Tekshirish (Bajarilgan)
- [x] `node --check` barcha ES modullarda o‘tdi.
- [x] `python3 -m py_compile app.py config.py db.py importer.py` o‘tdi.
- [x] `node tests/run-tests.mjs` — barcha 11 ta test o‘tdi.
- [x] `node scripts/build-public.mjs` — toza `dist/` frontend paketi yaratildi.
- [x] Playwright Chromium da barcha 4 ta rol, Light/Dark rejimlar va `320px–1920px` o‘lchamlar tekshirildi (`screenshots/` da 18 ta screenshot).

## 2. Supabase Migratsiyasi (Staging -> Tasdiq -> Production)
- [ ] **Staging** bazasida sinab ko‘rish va **Production** bazaning to‘liq snapshot backupini olish.
- [ ] SQL Editor’da [20261127_v4_security_monitoring.sql](file:///workspaces/Maktab/supabase/migrations/20261127_v4_security_monitoring.sql) ni ishga tushirish (agar hali bajarilmagan bo‘lsa).
- [ ] SQL Editor’da [20261127_v6_platform_upgrade.sql](file:///workspaces/Maktab/supabase/migrations/20261127_v6_platform_upgrade.sql) ni ishga tushirish.
- [ ] `proofs` bucket ichida `avatars/` va `covers/` papkalariga ruxsat ishlashini tekshirish.
- [ ] 4 ta rol (`director`, `it_admin`, `reviewer`, `teacher`) bilan kirib, profil tahrirlash, murojaatlar, rivojlanish rejasi va `get_my_activity` ni tekshirish.
- [ ] (Ixtiyoriy, Signed URL backend tayyor bo‘lgach) [20261127_v4_private_storage_optional.sql](file:///workspaces/Maktab/supabase/migrations/20261127_v4_private_storage_optional.sql) ni qo‘llash.

## 3. Render Static Site Deploy (Ruxsatdan Keyin)
- [ ] Render Dashboard’da:
  - Tavsiya etilgan: **Build Command:** `node scripts/build-public.mjs` va **Publish Directory:** `dist` (Python, SQL va `.md` hisobotlarni public webga chiqarmaslik uchun).
- [ ] Deploydan keyin Lighthouse / Core Web Vitals (`LCP <= 2.5s`, `CLS <= 0.1`, `INP <= 200ms`) ni jonli URL da o‘lchash.

## 4. Rollback Rejasi
- Git’da avvalgi barqaror commitga qaytish (`git revert`) va Render Dashboard’dan oldingi deployni tiklash; Supabase’da esa 2-bosqichdagi backup snapshotini tiklash.
