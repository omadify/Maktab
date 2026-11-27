# AUDIT REPORT — Norin Pedagog Reyting Platformasi

## 1. Asl Arxitektura Tavsifi
Repository ikki xil execution modelini o‘z ichiga oladi:
1. **Production Static Frontend (`render.yaml` -> `runtime: static`, `staticPublishPath: .`):**
   - `index.html`, `app.js`, `style.css`, `css/*`, `js/*`
   - To‘g‘ridan-to‘g‘ri Supabase (`https://melqpmfjwqivylnmucwc.supabase.co`) REST API, RPC va Storage xizmatlariga murojaat qiladi.
2. **Ixtiyoriy Lokal Python Server (`app.py`, `db.py`, `config.py`, `importer.py`):**
   - Python stdlib HTTP server (`SQLite` yoki `Supabase` backend). Render Static Site’da ishlamaydi.
3. **Legacy / Eski Nusxalar (`static/`, `reyting_platforma/`):**
   - Avvalgi server-rendered versiyadan qolgan fayllar. Production static deployda ishlatilmaydi.

## 2. Aniqlangan Muammolar, Sabablari va Yechimlari

| ID | Daraja | Yo‘nalish | Aniqlangan muammo | Sabab | Yechim |
|---|---|---|---|---|---|
| AUD-01 | Critical | Autentifikatsiya | `supabase_schema.sql` da parollar ochiq matnda (`pw` ustuni) saqlangan va `login_user` ochiq matnda tekshirgan. | Dastlabki tezkor prototipda `pgcrypto` ishlatilmagan. | `supabase/migrations/20261127_v4_security_monitoring.sql` da `pgcrypto` `bcrypt` (`pw_hash`), tokenli `user_sessions` va `auth_login` / `auth_change_password` RPC lar tayyorlandi. |
| AUD-02 | Critical | RLS & RBAC | `users` va `entries` jadvallarida Row Level Security (`ENABLE ROW LEVEL SECURITY`) yoqilmagan; client `sessionStorage` roli ishonch manbai bo‘lgan. | Anon key orqali to‘g‘ridan-to‘g‘ri PostgREST CRUD ruxsati ochiq qolgan. | V4 migratsiyada default-deny RLS, to‘g‘ridan-to‘g‘ri anon jadval ruxsatlarini bekor qilish va server-token tekshiruvchi `SECURITY DEFINER` RPC lar yaratildi. |
| AUD-03 | High | Reyting xavfsizligi | `entries.pts` qiymati brauzerda hisoblanib yuborilgan (`insertEntry`). | Client-side hisoblangan qiymat serverda qayta tekshirilmagan. | Serverda `calc_authoritative_pts(p_ind, p_type, p_qty)` va `submit_entry` RPC yaratildi (`config.py` / `js/config.js` bilan 100% mos). |
| AUD-04 | High | Concurrency | Bir vaqtda ikki mas’ul bitta arizani ko‘rib chiqganda race condition ehtimoli mavjud edi. | Shartsiz `PATCH` ishlatilgan. | `review_entry_atomic` RPC (`FOR UPDATE` qator qulfi) va legacy rejimda `status=neq.<status>` shartli `PATCH` qo‘shildi. |
| AUD-05 | High | Storage & Fayllar | `proofs` bucket `public = true`; fayl formatini tekshirish faqat kengaytma bilan cheklangan; DB xatosida yetim fayllar qolishi mumkin edi. | Storage siyosati ochiq va client magic-byte tekshiruvi yo‘q edi. | `validateProofFile` magic-byte (`%PDF`, `PNG`, `JPEG`) tekshiruvi va DB xatosida `deleteProofObject` orphan tozalash qo‘shildi; `20261127_v4_private_storage_optional.sql` tayyorlandi. |
| AUD-06 | High | Hosting xavfsizligi | `render.yaml` da `staticPublishPath: .` Python fayllar, `.sql` va hisobotlarni ham public URL ga ochib qo‘yadi. | Root papka to‘g‘ridan-to‘g‘ri publish qilingan. | `scripts/build-public.mjs` (`dist/` faqat frontend aktivlari) qo‘shildi; Render sozlamasini yangilash `DEPLOYMENT_CHECKLIST.md` ga kiritildi. |
| AUD-07 | Medium | Kriptografiya | `tempPw()` da `Math.random()` ishlatilgan. | Kriptografik generator (`crypto.getRandomValues`) ulanmagan edi. | `js/config.js` da `crypto.getRandomValues` va SQL da `gen_random_bytes` joriy qilindi. |
| AUD-08 | Medium | CSV & UX | `csvCell` formula injection (`=`, `+`, `-`, `@`) dan himoyalanmagan; qidiruv kiritishda sahifa to‘liq qayta chizilib fokus/scroll sakragan. | `el.innerHTML` har bir `oninput` da qayta yozilgan. | `csvCell` formula prefiksini neytrallaydi; Ranking, Directory, Reviews, Criteria va Admin sahifalari qisman DOM yangilashga o‘tkazildi. |
| AUD-09 | Medium | Monitoring | Tizimda real audit log, kirishlar tarixi va faol sessiyalar monitoringi yo‘q edi. | Static frontendda mos server jadvallari mavjud emas edi. | `activity_logs`, `login_history`, `user_presence`, `notifications` jadvallari va `js/views/monitoring.js` yaratildi. |
