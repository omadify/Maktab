# Pedagoglar Reyting Platformasi

**Norin tuman ixtisoslashtirilgan maktabi** (26-AF-sonli buyruq asosida).
Ultra-yengil, 100% Serverless & Render Static Site + Supabase platformasi.

---

## 1. Tizim Akkauntlari

| Rol | F.I.Sh. | Login | Boshlang‘ich Parol | Huquqlari |
|---|---|---|---|---|
| **Maktab Direktori** | **Alisher Xolmatov** | `direktor` | `Direktor#2026` | **Mutlaq Super-Admin:** 4 ta roldagi barcha ishlarni bajarish (tasdiqlash, pedagog nomidan yozish, hisobotlar, tahlil). |
| **IT Mutaxassis** | **Hasanboy Toshboyev** | `it_admin` | `Admin#2026` | **Texnik boshqaruv:** O‘qituvchilarni yuklash (Excel/CSV), parollarni berish va tiklash. |
| **Mas’ul (Ekspert)** | **N.Meliboyeva** | `n.meliboyeva` | `Masul#2026` | Ilmiy daraja, malaka toifasi va stajirovkalarni tekshirish. |
| **Mas’ul (Ekspert)** | **D.Rasulova** | `d.rasulova` | `Masul#2026` | Fan sertifikatlari, tanlovlar, metodik ishlar, o‘zlashtirishni tekshirish. |
| **Mas’ul (Ekspert)** | **S.Murodov** | `s.murodov` | `Masul#2026` | Olimpiada, sertifikatlar, STEAM/StartUp loyihalarini tekshirish. |
| **Mas’ul (Ekspert)** | **A.Karimjonov** | `a.karimjonov` | `Masul#2026` | Sport va ma’naviy-ma’rifiy tadbirlarni tekshirish. |
| **Pedagog** | *O‘qituvchilar* | *avtomatik* | *Mktb#XXXX* | Shaxsiy natija, yutuq kiritish, skan yuklash, reyting, A4 portfolio chop etish. |

---

## 2. O‘qituvchilarni Ommaviy Yuklash (Baza to‘lmasligi)

- **Fayl formatlari:** `.xlsx`, `.csv`, `.txt`
- Brauzerda xotirada o‘qiladi va serverda hech qanday fayl saqlanmaydi (0 KB server yuki).
- Har bir o‘qituvchiga avtomatik login va vaqtinchalik parol generatsiya qilinadi.
- Bir tugma bilan `pedagoglar_parollari.csv` yuklab olinadi.

---

## 3. Render-da Ishga Tushirish

1. Ushbu repo Render-ga **Static Site** sifatida ulanadi.
2. Build command: `echo "Build complete"`
3. Publish directory: `.`
