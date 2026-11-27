# DEPLOYMENT CHECKLIST — V4.0

## 1. Oldindan Tekshirish (Pre-Deployment)
- [x] `node tests/run-tests.mjs` — barcha 11 ta avtomatik test o‘tdi.
- [x] `node --check` — barcha JS modullar xatosiz.
- [x] `node scripts/build-public.mjs` — toza frontend `dist/` papkasi yaratilishi tekshirildi.
- [ ] Brauzerda barcha 4 ta rol va `320px–1920px` ekranlarda vizual ko‘rik.

## 2. Supabase (Production Database) — Ruxsatdan Keyin
- [ ] Supabase bazaning to‘liq backupini olish.
- [ ] SQL Editor’da [20261127_v4_security_monitoring.sql](file:///workspaces/Maktab/supabase/migrations/20261127_v4_security_monitoring.sql) ni ishga tushirish.
- [ ] 4 ta rol bilan kirib (`auth_login`), `activity_logs`, `login_history`, `user_presence` yozuvlari shakllanishini tekshirish.
- [ ] Anon key bilan `/rest/v1/users` ga to‘g‘ridan-to‘g‘ri so‘rov `401/403` yoki bo‘sh RLS qaytarishini tasdiqlash.
- [ ] (Ixtiyoriy, Signed URL tayyor bo‘lgach) [20261127_v4_private_storage_optional.sql](file:///workspaces/Maktab/supabase/migrations/20261127_v4_private_storage_optional.sql) ni qo‘llash.

## 3. Render Static Site
- [ ] `render.yaml` va Render Dashboard sozlamalarida:
  - Tavsiya etilgan xavfsiz variant: **Build Command:** `node scripts/build-public.mjs` va **Publish Directory:** `dist` (shunda Python fayllar, `.sql` migratsiyalar va `.md` hisobotlar public webga chiqmaydi).
  - Joriy moslik varianti: **Build Command:** `echo "Build complete"` va **Publish Directory:** `.` (hozirgi holatda ham ishlaydi, lekin backend/SQL fayllarni yopish uchun `dist` tavsiya etiladi).

## 4. Rollback Rejasi
- GitHub’da avvalgi commit (`e5f2a95`) ga revert qilish yoki Render Dashboard’dan oldingi muvaffaqiyatli deployni tiklash ("Rollback to this deploy").
