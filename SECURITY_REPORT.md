# SECURITY REPORT — V4.0

## 1. Autentifikatsiya va Sessiya Xavfsizligi
- **Oldingi holat (Production’dagi joriy sxema):** `supabase_schema.sql` da `users.pw` ochiq matnda saqlanadi; `sessionStorage` ichidagi rol client-side saqlanadi; V4 migratsiyasi qo‘llanmagan bazalarda `js/api.js` orqaga mos ravishda standart `login_user` RPC bilan ishlaydi.
- **V4 Migratsiya yechimi ([20261127_v4_security_monitoring.sql](file:///workspaces/Maktab/supabase/migrations/20261127_v4_security_monitoring.sql)):**
  - `pgcrypto` orqali `bcrypt` (`crypt(..., gen_salt('bf', 10))`) parol xeshlash (`users.pw_hash`).
  - `auth_login` RPC 10 daqiqa ichida 5 ta muvaffaqiyatsiz urinishdan keyin brute-force rate limit qo‘llaydi.
  - Server-side `user_sessions` jadvalida `SHA-256` token xeshi (`token_hash`) saqlanadi.
  - `_verify_session(p_token)` funksiyasi token muddati, `revoked_at`, `active = 1` va `u.role = s.role_snapshot` shartlarini tekshiradi — rol o‘zgarganda eski sessiya avtomatik bekor bo‘ladi.

## 2. RLS va Rollarga Asoslangan Ruxsatlar
- **Default-Deny RLS:** V4 migratsiyada `users`, `entries`, `user_sessions`, `login_history`, `activity_logs`, `user_presence`, `notifications` jadvallarida RLS yoqilib, `anon` va `authenticated` dan to‘g‘ridan-to‘g‘ri jadval ruxsatlari (`REVOKE ALL`) olib tashlanadi.
- **Client ma’lumotlariga ishonmaslik:**
  - `submit_entry` RPC ball (`pts`) qiymatini serverda `calc_authoritative_pts()` orqali qayta hisoblaydi.
  - `review_entry_atomic` RPC indikator egasini (`reviewer_can_review`) va o‘z arizasini tasdiqlamaslik qoidasini serverda tekshiradi hamda `FOR UPDATE` bilan race condition’ni oldini oladi.
  - `admin_create_users` va `admin_update_user` IT mutaxassisning direktor rolini berishi/tahrirlashini hamda oxirgi faol direktorning o‘chirilishini bloklaydi.
- **Maxfiy profil ma’lumotlari:** `get_workspace_data` oddiy `teacher` roliga boshqa pedagoglarning kutilayotgan/rad etilgan yutuqlari, izohlari, loginlari va hujjat havolalarini qaytarmaydi.

## 3. Storage va Fayl Xavfsizligi
- Brauzerda yuklashdan oldin `validateProofFile()` fayl hajmi (`<= 15 MB`), kengaytma va haqiqiy **magic header baytlari** (`%PDF`, `PNG`, `JPEG`) ni tekshiradi.
- DB yozish muvaffaqiyatsiz tugasa, `deleteProofObject()` yetim faylni o‘chiradi.
- `proofs` bucketni yopiq (`public = false`) holatga o‘tkazish uchun alohida [20261127_v4_private_storage_optional.sql](file:///workspaces/Maktab/supabase/migrations/20261127_v4_private_storage_optional.sql) tayyorlandi (Signed URL generatsiyasi tayyor bo‘lgandan keyin qo‘llanishi kerak).

## 4. Qolgan Xavflar (Migratsiya Qo‘llanmaguncha)
- **Muhim ogohlantirish:** Yuqoridagi V4 SQL migratsiyasi Supabase production bazasida hali ishga tushirilmagan! Migratsiya bajarilmaguncha production’da eski `supabase_schema.sql` qoidalari (ochiq matn parol va RLS’siz jadvallar) amal qiladi.
- `scripts/build-public.mjs` orqali `dist/` ga faqat frontend fayllari ajratilgan bo‘lsa-da, `render.yaml` yangilanmaguncha root `.` publish qilinishda davom etadi.
