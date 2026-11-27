# PROFILE SYSTEM — TELEGRAM-INSPIRED ERGONOMICS (V6)

## 1. Umumiy Arxitektura (`js/views/profile.js`)
Pedagog profili Telegram profil interfeysining aniqligi, avatar bilan ishlash qulayligi va sozlamalar ierarxiyasidan ilhomlanib qayta qurildi (keraksiz chat interfeysisiz).

## 2. Qahramon Qismi (Cover + Avatar + Identity)
- **Muqova (Profile Cover):**
  - 5 ta tayyor institusional uslub (`ocean-glass`, `emerald-mist`, `indigo-slate`, `warm-sand`, `midnight-aurora`) hamda shaxsiy rasm yuklash (`custom`, `cover_url`).
  - Muqova ustida o‘ng yuqori burchakda tezkor "Muqovani o‘zgartirish" tugmasi.
- **Avatar Tizimi:**
  - Kattalashtirish (Lightbox preview) — avatarni bosganda to‘liq ko‘rish oynasi ochiladi.
  - **Interaktiv Crop & Reposition (`openAvatarCropperModal`):** HTML5 Canvas asosida rasmni surish (drag), masshtablash (zoom `1x–2.6x`), aylana kadrga joylash, `360×360` JPEG ga eksport qilish, Supabase Storage ga yuklash va o‘chirish.
  - Yuklanmagan holatda deterministik rangli bosh harflar (initials fallback).
  - Barcha sahifalarda (`sidebar`, `topbar`, `ranking`, `teachers`, `admin`, `reviews`, `appeals`) bir xil avatar ko‘rinishi saqlanadi.
- **Identifikatsiya va Maxfiylik:**
  - F.I.Sh., Fan/Lavozim, Rol, Holat, Reyting o‘rni, 130 ballik umumiy progress, qisqacha biografiya (`bio`).
  - Telefon va Telegram username **maxfiy himoyaga ega**: faqat profil egasi, direktor yoki `contact_public = true` bo‘lganda hamkasblarga ko‘rinadi.

## 3. 7 ta Ruxsatga Asoslangan Bo‘lim (Tabs)
1. **Umumiy ma’lumot:** A/B/C progress kartalari va 15 ta indikator jadvali (boshqa pedagog profilini ko‘rganda `wait` kutilayotgan ballar yashiriladi).
2. **Mening yutuqlarim:** Yutuqlar ro‘yxati, holatlar va hujjat havolalari.
3. **Reyting va statistika:** 130 ballik radial halqa, oylik dinamika, bo‘limlar ulushi va top indikatorlar.
4. **Portfolio:** Rasmiy A4 ko‘rinish va chop etish.
5. **Hujjatlar (Media & Documents):** 4 ta ichki tab (*Hujjatlar*, *Sertifikatlar*, *Yutuqlar*, *Mavjud fayllar*), Karta/Ro‘yxat rejimi, rasm preview va xavfsiz yuklab olish.
6. **Faollik** *(faqat o‘z profilida)*: Shaxsiy faoliyat xronologiyasi.
7. **Sozlamalar** *(faqat o‘z profilida)*: Muqova/maxfiylik qisqa ko‘rinishi va tizim sozlamalariga o‘tish.

## 4. Tahrirlash Oynasi (Edit Profile Drawer) va Xavfsizlik
- **Ajratilgan maydonlar:** Pedagog faqat shaxsiy maydonlarni (`bio`, `phone`, `telegram_handle`, `contact_public`, `cover_style`, `cover_url`, `avatar_url`) tahrirlay oladi. Rasmiy F.I.Sh., fan va rol maydonlari faqat o‘qish rejimida ko‘rsatiladi.
- **Saqlanmagan o‘zgarishlar himoyasi:** `setModalCloseGuard` orqali saqlanmasdan yopilganda tasdiq so‘raladi.
- **Server-side tekshiruv:** `update_my_profile` RPC faqat token egasining (`_verify_session`) ruxsat etilgan ustunlarini yangilaydi.
