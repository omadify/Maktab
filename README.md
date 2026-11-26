# Pedagoglar Reyting Platformasi

**Norin tuman ixtisoslashtirilgan maktabi** (26-AF-sonli buyruq asosida).
Ultra-yengil, 100% Serverless & Render Static Site + Supabase platformasi.

---

## 1. Tizim Akkauntlari

| Rol | F.I.Sh. | Login | Boshlang‘ich Parol | Huquqlari |
|---|---|---|---|---|
| **Maktab Direktori** | **Alisher Xolmatov** | `direktor` | *Administrator tomonidan beriladi* | **Mutlaq Super-Admin:** 4 ta roldagi barcha ishlarni bajarish (tasdiqlash, hisobotlar, tahlil). |
| **IT Mutaxassis** | **Hasanboy Toshboyev** | `it_admin` | *Administrator tomonidan beriladi* | **Texnik boshqaruv:** O‘qituvchilarni yuklash (Excel/CSV), parollarni berish va tiklash. |
| **Mas’ul (Ekspert)** | **N.Meliboyeva** | `n.meliboyeva` | *Administrator tomonidan beriladi* | Ilmiy daraja, malaka toifasi va stajirovkalarni tekshirish. |
| **Mas’ul (Ekspert)** | **D.Rasulova** | `d.rasulova` | *Administrator tomonidan beriladi* | Fan sertifikatlari, tanlovlar, metodik ishlar, o‘zlashtirishni tekshirish. |
| **Mas’ul (Ekspert)** | **S.Murodov** | `s.murodov` | *Administrator tomonidan beriladi* | Olimpiada, sertifikatlar, STEAM/StartUp loyihalarini tekshirish. |
| **Mas’ul (Ekspert)** | **A.Karimjonov** | `a.karimjonov` | *Administrator tomonidan beriladi* | Sport va ma’naviy-ma’rifiy tadbirlarni tekshirish. |
| **Pedagog** | *O‘qituvchilar* | *avtomatik* | *Mktb#XXXXX* | Shaxsiy natija, yutuq kiritish, skan yuklash, reyting, A4 portfolio chop etish. |

---

## 2. Supabase Bazani Sozlash

1. Supabase panelida **SQL Editor** bo‘limini oching.
2. `supabase_schema.sql` faylidagi kodni to‘liq nusxalab ishga tushiring (**Run**).
3. Barcha jadvallar, xavfsiz RPC funksiyalar (`login_user`, `change_user_password`), `proofs` saqlash qutisi va boshlang‘ich akkauntlar avtomatik yaratiladi.

---

## 3. O‘qituvchilarni Ommaviy Yuklash (Baza to‘lmasligi)

- **Fayl formatlari:** `.xlsx`, `.csv`, `.txt`
- Brauzerda xotirada o‘qiladi va serverda hech qanday fayl saqlanmaydi (0 KB server yuki).
- Har bir o‘qituvchiga avtomatik login va vaqtinchalik parol generatsiya qilinadi.
- Bir tugma bilan `pedagoglar_parollari.csv` yuklab olinadi.

---

## 4. Render-da Ishga Tushirish

1. Ushbu repo Render-ga **Static Site** sifatida ulanadi.
2. Build command: `echo "Build complete"`
3. Publish directory: `.`
