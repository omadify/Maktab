# DATABASE MIGRATION GUIDE — V6.0

## 1. Migratsiya Fayllari Ketma-Ketligi
1. **Asosiy V4 Xavfsizlik va Monitoring migratsiyasi:** [20261127_v4_security_monitoring.sql](file:///workspaces/Maktab/supabase/migrations/20261127_v4_security_monitoring.sql)
2. **V6 Platforma Yangilanishi (Profil, Faoliyat, Murojaatlar, Rivojlanish Rejasi):** [20261127_v6_platform_upgrade.sql](file:///workspaces/Maktab/supabase/migrations/20261127_v6_platform_upgrade.sql)
3. **Ixtiyoriy Private Storage migratsiyasi:** [20261127_v4_private_storage_optional.sql](file:///workspaces/Maktab/supabase/migrations/20261127_v4_private_storage_optional.sql) *(faqat Signed URL backend xizmati yoqilgandan keyin)*

## 2. Xavfsizlik va Ma’lumotlarni Saqlash Kafolatlari
- Barcha migratsiyalar **additive**, **idempotent** va **non-destructive** (`DROP TABLE` yoki `TRUNCATE` ishlatilmaydi).
- Mavjud `users.id`, `entries.id`, `uid`, 26-AF ballari, portfoliolar va fayl havolalari to‘liq saqlanadi.
- Production bazaga o‘zgarish kiritishdan oldin **albatta staging’da sinov** va **to‘liq backup** olinishi shart.

## 3. V6 Qo‘shimcha Jadvallar va Ustunlar
- `public.users`: `bio`, `avatar_url`, `cover_style`, `cover_url`, `phone`, `telegram_handle`, `contact_public`, `preferences`.
- `public.appeals` va `public.appeal_messages`: murojaatlar, apellyatsiyalar va muhokama tarixi.
- `public.development_goals` va `public.development_tasks`: shaxsiy rivojlanish maqsadlari va vazifalar ro‘yxati.

## 4. Qo‘llash Tartibi
1. Supabase Dashboard -> Database -> Backups bo‘limidan snapshot oling.
2. SQL Editor’da avval `20261127_v4_security_monitoring.sql` ni (agar hali bajarilmagan bo‘lsa), so‘ng `20261127_v6_platform_upgrade.sql` ni ishga tushiring.
3. To‘rtta rol (`director`, `it_admin`, `reviewer`, `teacher`) bilan kirib, profil tahrirlash, murojaat yaratish, rivojlanish rejasi va `get_my_activity` ishlashini tekshiring.

## 5. Rollback Rejasi
- 1-variant: Backup snapshot’ni tiklash.
- 2-variant: V6 da qo‘shilgan jadvallar mavjud `users` va `entries` ishiga ta’sir qilmaydi; kerak bo‘lsa V6 RPC grantlarini bekor qilish kifoya.
