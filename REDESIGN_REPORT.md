# REDESIGN REPORT — MAKTAB PLATFORM V6 (APPLE LIQUID GLASS ULTIMATE)

## 1. Umumiy O‘zgarishlar (V4/V5 -> V6)
V4 va V5 dagi odatiy oq/kulrang SaaS shablon ko‘rinishidan voz kechilib, **Liquid Institutional** dizayn tizimi asosida to‘liq 3 qatlamli (suzuvchi shisha navigatsiya, scrollga sezgir sarlavha, o‘qiladigan solid kontent) native-sifatdagi ilova arxitekturasi yaratildi.

## 2. Har Bir Sahifa Bo‘yicha Batafsil Hisobot

| Sahifa | Oldingi muammo | V6 da qilingan o‘zgarish | Nima uchun yaxshiroq | Interaksiya va tekshiruv |
|---|---|---|---|---|
| **Ilova qobig‘i (Shell & Nav)** | Oddiy yopishgan sidebar, mobil uchun qulay dock yo‘q. | Suzuvchi `Liquid Navigation Glass` chap panel (`256px`/`76px`), scroll-aware topbar (`.is-scrolled`), mobil pastki dock (`.mobile-bottom-nav`) va drawer. | Desktopda chuqurlik va ko‘rish aniqligi; mobilda native ilova ergonomikasi. | `320px–1920px` da 0 overflow, drawer va bottom dock Playwright da tekshirildi. |
| **Kirish sahifasi (`auth.js`)** | Chap tomonda og‘ir qora `#0F172A` to‘rtburchak, o‘ngda oddiy karta. | Ambient fon, 4 ta `glass-nav` imkoniyat plitkalari va `glass-frosted` kirish kartasi; alohida Dark Mode kalibratsiyasi. | Og‘ir qora blok o‘rniga yengil, zamonaviy va institutsional Apple-uslubi. | Light va Dark rejimlarda form validatsiya, parol ko‘rish va yuklanish holati tekshirildi. |
| **Direktor va Pedagog Dashboard (`dashboard.js`)** | Bir xil tekis KPI kartalar, 130 ballik vizual markaz yo‘q, UTC sana xatosi. | Ijrochi `hero-panel` + `scoreRingSvg` (130 ball halqasi), asimmetrik bento grafiklar, `Asia/Tashkent` sana tuzatishi. | Rahbar va pedagog eng muhim ko‘rsatkichni darhol ko‘radi. | Barcha 4 rol (`director`, `it_admin`, `reviewer`, `teacher`) da tekshirildi. |
| **Reyting jadvali (`ranking.js`)** | Oddiy podium kartalar, Blob URL xotira sizishi. | Metall aksentli Top-3 podium, global o‘rin saqlanishi, tezkor qisman DOM qidiruv, `URL.revokeObjectURL` tozalash. | O‘rin ierarxiyasi aniq, qidiruvda fokus sakramaydi. | Saralash, filtr, CSV eksport va mobil kartalar tekshirildi. |
| **Pedagog profili (`profile.js`)** | 4 tabli oddiy karta, avatar tahrirlash/muqova/bio yo‘q, maxfiy `wait` ko‘rinib qolgan. | **Telegram uslubidagi profil:** 5 ta muqova + rasm yuklash, avatar lightbox + **Canvas Crop/Zoom**, 7 ta ruxsatga bog‘liq tab, Media & Documents, Edit Profile Drawer (`setModalCloseGuard`), `wait` himoyasi. | Haqiqiy shaxsiy kabinet hissi, lekin keraksiz chat qo‘shilmagan. | Profil, Hujjatlar tabi, Edit Drawer, Lightbox va mobil ko‘rinish tekshirildi. |
| **Tasdiqlash markazi (`entries.js`)** | Mobilda qator tagiga tushib qoladigan split panel. | Desktopda split-panel + mobilda tanlanganda to‘liq ekran `openDetailDrawer` varag‘i; `Asia/Tashkent` sana. | Mobil qurilmalarda arizalarni ko‘rib chiqish qulay. | Split view va atomik tasdiqlash oqimi tekshirildi. |
| **Admin va Sozlamalar (`admin.js`)** | 1 ustunli sodda sozlamalar, faol sessiya boshqaruvi yo‘q, checkbox xatoda qaytmas edi. | 2 ustunli Sozlamalar (*Profil, Ko‘rinish, Bildirishnomalar, Xavfsizlik, Sessiyalar, Hisob*), `liquid-switch` togglelar, `get_my_sessions`/`revoke_my_session`, checkbox rollback. | Foydalanuvchi shaffoflik, bildirishnoma va qurilma sessiyalarini boshqara oladi. | Admin paneli va Sessiyalar bo‘limi tekshirildi. |
| **3 ta Yangi Modul** | Mavjud emas edi. | `Mening faoliyatim`, `Murojaatlar va apellyatsiyalar`, `Rivojlanish rejasi` to‘liq SQL + UI bilan qo‘shildi. | Pedagoglar uchun shaxsiy rivojlanish, shaffof faoliyat va murojaat mexanizmi. | Uchala modul ham sintetik sessiya bilan brauzerda tekshirildi. |

## 3. 3 Bosqichli Vizual Iteratsiya Natijalari (Screenshotlar Asosida)
1. **1-pass (Layout & Kontrast):** `06-profile-telegram.png` da nom va badgelar gradient muqova ustiga chiqib qolgani aniqlandi -> `.profile-avatar-float` ajratilib, matn oq/qorong‘i kontent yuzasiga tushirildi.
2. **2-pass (Tipografiya & Sana formati):** `10-my-activity.png` va `12-dev-plan.png` da Chromium ICU `2026 M11 27` chiqargani ko‘rindi -> `formatDateUz`, `formatDateTimeTashkent` va `getDeadlines` da aniq o‘zbekcha oy nomlari (`27 noy, 2026`, `2 dek, 2026`) joriy etildi.
3. **3-pass (Mobil Ergonomika):** `14-mobile-dashboard-390.png` da mobil topbar sarlavhasi qisqargani ko‘rindi -> mobil kenglikda breadcrumb ildizi, tezkor tugma va profil chevroni yashirilib, sarlavha to‘liq ko‘rsatildi va yopiq drawer uchun `visibility: hidden` qo‘shildi.

## 4. Qolgan Cheklovlar
- Masofaviy Supabase bazasiga `20261127_v4_security_monitoring.sql` va `20261127_v6_platform_upgrade.sql` qo‘llanmaguncha jonli serverda V6 RPC lari ko‘rinmaydi (shuning uchun ilova V4/legacy bazada xavfsiz fallback bilan ishlaydi va yangi modullarda sozlash eslatmasini ko‘rsatadi).
- Brauzer testlari sandbox ichida **lokal statik server + sintetik in-memory Supabase mock** yordamida bajarildi; jonli Supabase bilan E2E sinov staging muhitida migratsiyadan keyin o‘tkazilishi kerak.
