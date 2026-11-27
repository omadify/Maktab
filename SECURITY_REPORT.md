# SECURITY REPORT — MAKTAB PLATFORM V6

## 1. Autentifikatsiya va Sessiya Boshqaruvi
- V4 migratsiyada joriy etilgan `pgcrypto` (`bcrypt` `pw_hash`), brute-force rate limit (10 daqiqada 5 urinish) va `SHA-256` tokenli `user_sessions` jadvali to‘liq saqlanadi.
- V6 da **Faol sessiyalar** boshqaruvi (`get_my_sessions`, `revoke_my_session`) qo‘shildi: foydalanuvchi o‘z qurilmalarini ko‘rib, begona/eski sessiyalarni serverda bekor qila oladi.
- `app.js` va `js/api.js` da sessiya muddati tugashi yoki serverda bekor qilinishi aniqlansa, ilova xavfsiz tarzda login ekraniga qaytariladi (`handleLogout` + barcha modul holatlarini tozalash).

## 2. Rollarga Asoslangan Ruxsatlar (RBAC & RLS)
- **Default-Deny RLS:** V4 va V6 jadvallarining barchasida (`users`, `entries`, `user_sessions`, `login_history`, `activity_logs`, `user_presence`, `notifications`, `appeals`, `appeal_messages`, `development_goals`, `development_tasks`) Row Level Security yoqilgan va `anon`/`authenticated` rollaridan to‘g‘ridan-to‘g‘ri jadval huquqlari (`REVOKE ALL`) olingan.
- **Profil tahrirlash xavfsizligi (`update_my_profile`):** Foydalanuvchi faqat shaxsiy maydonlarni (`bio`, `avatar_url`, `cover_style`, `cover_url`, `phone`, `telegram_handle`, `contact_public`) yangilay oladi. `role`, `name`, `subject`, `ranked`, `active` maydonlari brauzer orqali o‘zgartirilishi serverda bloklangan.
- **Aloqa ma’lumotlari maxfiyligi:** `phone` va `telegram_handle` faqat profil egasiga, direktorga yoki `contact_public = true` bo‘lganda ko‘rinadi.
- **Shaxsiy faoliyat izolyatsiyasi (`get_my_activity`):** Har bir pedagog faqat o‘zining harakatlari va o‘z arizalariga oid qarorlarni ko‘radi; boshqa pedagoglarning shaxsiy audit yozuvlari hech qachon ochilmaydi.
- **Murojaatlar va Rivojlanish rejasi:**
  - `create_appeal` murojaatchining `entry_id` ga egaligini serverda tekshiradi va **hech qachon `entries.pts` yoki `entries.status` ni avtomatik o‘zgartirmaydi**.
  - `get_dev_goals`, `upsert_dev_goal`, `upsert_dev_task` faqat `v_sess.uid` egasining maqsadlariga ruxsat beradi.

## 3. Fayl va Media Tekshiruvi
- Hujjatlar (`validateProofFile`: PDF, PNG, JPEG <= 15 MB) va profil rasmlari (`validateImageFile`: PNG, JPG, WEBP <= 5 MB) haqiqiy **magic header baytlari** bo‘yicha tekshiriladi.
- CSV eksportlarda `csvCell()` formula injection (`=`, `+`, `-`, `@`) ni neytrallaydi.
- `tempPw()` Web Crypto API (`crypto.getRandomValues`) dan foydalanadi.

## 4. Production Ogohlantirish
- `20261127_v4_security_monitoring.sql` va `20261127_v6_platform_upgrade.sql` Supabase production bazasiga qo‘lda (backupdan keyin) qo‘llanmaguncha, masofaviy bazada avvalgi jadval/RPC qoidalari amal qiladi.
