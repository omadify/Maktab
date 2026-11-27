# FUNCTIONAL REPORT — V4.0

## 1. Saqlangan Mavjud Funksiyalar
- **26-AF reyting tizimi:** Barcha 15 ta indikator (A: 1–7, B: 14–17, C: 18–21), bo‘lim limitlari (50 / 30 / 50 = 130 ball), mezon limitlari va mas’ul baholovchilar ro‘yxati 100% saqlandi.
- **4 ta rol:** `director`, `it_admin`, `reviewer`, `teacher` huquq va vazifalari saqlandi.
- **Import / Eksport:** `.xlsx` (SheetJS), `.csv`, `.txt` ommaviy yuklash, avtomatik login generatsiyasi (`makeLogin`), `pedagoglar_parollari.csv` va `pedagoglar_reytingi_hisobot.csv` saqlandi.
- **A4 Portfolio:** Rasmiy chop etish va PDF saqlash formati saqlandi va yaxshilandi.

## 2. Yangi Qo‘shilgan Monitoring va Boshqaruv Modullari
- **So‘nggi harakatlar (`js/views/monitoring.js`):** Audit log jadvali, amal va natija filtrlari, pagination va o‘ng tafsilot drawer.
- **Kirishlar tarixi (`js/views/monitoring.js`):** Bugungi noyob kirishlar, 7/30 kunlik statistika, muvaffaqiyatsiz urinishlar, qurilma kesimi va `Asia/Tashkent` vaqt zonasi.
- **Faol foydalanuvchilar (`js/views/monitoring.js`):** Onlayn (`<=2 daq.`), yaqinda faol (`<=15 daq.`) va oflayn holatlari, bitta tabli heartbeat sinxronizatsiyasi (`app.js`).
- **Report Center (`js/views/admin.js`):** Sana oralig‘i filtri bilan 5 xil hisobot eksporti (Umumiy reyting, Tasdiqlangan yutuqlar, Fanlar, Indikatorlar, Rad etilgan arizalar).
- **Notification Center va Command Palette (`js/command.js`):** O‘qilgan/o‘qilmagan holatlar, barchasini o‘qilgan deb belgilash va klaviatura (`↑`/`↓`/`Enter`/`Esc`) navigatsiyasi.

## 3. Tuzatilgan Funksional Xatolar
- Qidiruv inputlarida har bir harf kiritilganda sahifa fokus va scroll yo‘qotish muammosi qisman DOM yangilash orqali bartaraf etildi.
- `alert()`, `confirm()`, `prompt()` chaqiruvlari to‘liq non-blocking modal/toast tizimiga almashtirildi.
- Clipboard nusxalash natijasi endi real tekshiriladi (`copyToClipboard`).
- `renderAddEntry` da double-submit bloki, saqlanmagan forma ogohlantirishi va DB xatosida yuklangan faylni tozalash qo‘shildi.
- Davr filtri yoqilganda pedagogning global reyting o‘rni (`globalRank`) noto‘g‘ri qayta raqamlanishining oldi olindi.
