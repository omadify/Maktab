# DATABASE MIGRATION GUIDE — V4.0

## 1. Umumiy Qoidalar
- Barcha o‘zgarishlar [20261127_v4_security_monitoring.sql](file:///workspaces/Maktab/supabase/migrations/20261127_v4_security_monitoring.sql) faylida jamlangan.
- Migratsiya **backward-compatible**, **idempotent** va **non-destructive** (`DROP TABLE` yoki `TRUNCATE` ishlatmaydi).
- Mavjud `users.id`, `entries.id`, `uid` bog‘lanishlari va hujjat havolalari (`fpath`) to‘liq saqlanadi.

## 2. Migratsiya Tartibi (Qo‘lda Tasdiqlash Bilan)
1. **Zaxira nusxa (Backup):** Supabase Dashboard -> Database -> Backups bo‘limidan joriy bazaning snapshotini oling.
2. **Asosiy V4 migratsiyani ishga tushirish:**
   - Supabase Dashboard -> SQL Editor ga kiring.
   - `supabase/migrations/20261127_v4_security_monitoring.sql` tarkibini nusxalab **Run** tugmasini bosing.
   - Ushbu skript:
     - `pgcrypto` ni yoqadi;
     - `users` va `entries` ga yangi ustunlarni (`pw_hash`, `last_login_at`, `last_active_at`, `reviewed_at`) qo‘shadi;
     - Mavjud ochiq parollarni `bcrypt` (`pw_hash`) ga o‘tkazadi;
     - `user_sessions`, `login_history`, `activity_logs`, `user_presence`, `notifications` jadvallarini yaratadi;
     - Barcha `SECURITY DEFINER` RPC larni yaratib, jadvallarda RLS ni yoqadi.
3. **Autentifikatsiyani tekshirish:**
   - Direktor, IT mutaxassis, mas’ul va pedagog akkauntlari bilan tizimga kirib ko‘ring.
   - Birinchi muvaffaqiyatli kirishlar `pw_hash` orqali tekshirilishini tasdiqlang.
4. **Ixtiyoriy tozalash (faqat barcha foydalanuvchilar tekshirilgandan keyin):**
   - Barcha `users` qatorlarida `pw_hash IS NOT NULL` ekanligini tekshirgach, eski ochiq matndagi `pw` ustunini bo‘shatish mumkin (`update public.users set pw = '' where pw_hash is not null;`).
5. **Private Storage ([20261127_v4_private_storage_optional.sql](file:///workspaces/Maktab/supabase/migrations/20261127_v4_private_storage_optional.sql)):**
   - Faqat Signed URL xizmati (masalan, Supabase Edge Function) deploy qilingandan so‘ng ishga tushiring; aks holda avvalgi public `fpath` havolalari ochilmay qoladi.

## 3. Rollback (Ortga Qaytarish) Rejasi
- Agar migratsiyadan keyin kutilmagan muammo yuzaga kelsa:
  1. 1-bosqichda olingan Supabase backup’ni tiklang, **yoki**
  2. `users` va `entries` jadvallarida `alter table ... disable row level security;` va eski `login_user` RPC grantsini tiklash orqali vaqtincha legacy rejimga qaytish mumkin (chunki `users` va `entries` ma’lumotlari o‘chirilmagan).
