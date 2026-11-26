# Pedagoglar reyting platformasi

Norin tuman ixtisoslashtirilgan maktabi uchun (26-AF-son buyruq asosida).
Faqat **Python 3.9+** kerak, qo‘shimcha tashqi kutubxonalar talab etilmaydi.
Ma’lumotlar SQLite faylida (`data/reyting.db`), yuklangan skanlar `data/uploads` papkasida saqlanadi.

---

## 1. Tizim Akkauntlari va Rollar

| Rol | Egasi | Login | Boshlang‘ich Parol | Huquqlari |
|---|---|---|---|---|
| **Maktab Direktori** | **Alisher Xolmatov** | `direktor` | `Direktor#2026` | **Super-Admin (Barcha 4 ta vakolat):** Barcha arizalarni tasdiqlash/rad etish, pedagoglar nomidan kiritish, o‘qituvchilar yuklash/parollarni boshqarish, umumiy tahlillar va ustama hisobotlari |
| **IT Mutaxassis** | **Hasanboy Toshboyev** | `it_admin` | `Admin#2026` | **Texnik boshqaruv:** O‘qituvchilar ro‘yxatini yuklash (Excel/CSV), parollarni berish va tiklash, tizim monitoringi |
| **Mas’ul (Ekspert)** | **N.Meliboyeva** | `n.meliboyeva` | `Masul#2026` | Ilmiy daraja, malaka toifasi, malaka oshirish mezonlarini tekshirish |
| **Mas’ul (Ekspert)** | **D.Rasulova** | `d.rasulova` | `Masul#2026` | Fan sertifikatlari, tanlovlar, metodik ishlar, o‘zlashtirish mezonlarini tekshirish |
| **Mas’ul (Ekspert)** | **S.Murodov** | `s.murodov` | `Masul#2026` | Olimpiada, sertifikatlar, STEAM/StartUp loyihalarini tekshirish |
| **Mas’ul (Ekspert)** | **A.Karimjonov** | `a.karimjonov` | `Masul#2026` | Sport, ma’naviy-ma’rifiy tadbirlar va yutuqlarni tekshirish |
| **Pedagog** | *Maktab o‘qituvchilari* | *avtomatik* | *Mktb#XXXX* | Shaxsiy natija, yutuq kiritish, skan yuklash, reytingni ko‘rish, A4 portfolio chop etish |

---

## 2. Pedagoglarni Ommaviy Yuklash (Baza to‘lmasligi mexanizmi)

1. **Format:** Excel (`.csv`, `.txt`) yoki to‘g‘ridan-to‘g‘ri matn kiritish:
   ```text
   Karimov Anvar Jo‘rayevich; Matematika
   Rasulova Ziyoda; Ingliz tili
   Sobirov Jamshid; Fizika
   ```
2. **Avtomatik generatsiya:**
   - Login avtomatik hosil qilinadi (`k.anvar`, `r.ziyoda` va h.k.).
   - Parol avtomatik hosil qilinadi (`Mktb#8291`).
   - Roli avtomatik `teacher` bo‘ladi.
3. **Xotirani tejash (Auto-delete):**
   - Yuklangan fayl brauzerda o‘qilib, ma’lumotlar bazaga yoziladi va server diskida saqlanmaydi.
4. **Ro‘yxatni olish:**
   - Yuklangandan so‘ng bir tugma bilan `pedagoglar_parollari.csv` fayli yuklab olinadi va o‘qituvchilarga tarqatiladi.

---

## 3. Ishga tushirish

```bash
python3 app.py
```
Brauzerda: `http://localhost:8080`
Portni o‘zgartirish: `REYTING_PORT=3000 python3 app.py`
