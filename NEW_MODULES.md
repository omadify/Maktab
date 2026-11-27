# NEW MODULES — MAKTAB PLATFORM V6

Ushbu hujjat V6 da ruxsat etilgan uchta yangi funksional modulni hamda ularning backend va xavfsizlik arxitekturasini tavsiflaydi.

---

## 1. Mening faoliyatim (`js/views/activity.js`)
- **Maqsadi:** Pedagog va xodimlarga o‘zining tizimdagi shaxsiy harakatlari va baholash qarorlarini vaqt chizig‘ida ko‘rish imkonini berish (ma’muriy audit jurnalidan alohida).
- **Ko‘rsatiladigan hodisalar:** Yuborilgan yutuqlar, tasdiqlash/rad etish qarorlari, profil o‘zgarishlari, murojaatlar va javoblar, rivojlanish maqsadlari, parol va sessiya hodisalari.
- **Vaqt zonasi:** Barcha sanalar `UTC` da saqlanib, foydalanuvchiga `Asia/Tashkent` da ko‘rsatiladi.
- **Xavfsizlik:** `get_my_activity(p_token)` RPC faqat `actor_uid = v_sess.uid` yoki foydalanuvchining o‘z arizasi/murojaatiga taalluqli qarorlarni qaytaradi. Soxta hodisalar generatsiya qilinmaydi; V6 migratsiyasi qo‘llanmagan bazada aniq sozlash holati ko‘rsatiladi.

---

## 2. Murojaatlar va apellyatsiyalar (`js/views/appeals.js`)
- **Maqsadi:** Pedagoglarga baholash qarori yuzasidan tushuntirish so‘rash yoki qo‘shimcha hujjat bilan asosli apellyatsiya yuborish imkonini berish.
- **Muhim biznes qoidasi:** Murojaat yoki apellyatsiya rasmiy 26-AF reyting ballarini avtomatik o‘zgartirmaydi; rasmiy baholash faqat mavjud tasdiqlash tizimi orqali amalga oshiriladi.
- **Holatlar tizimi:**
  - `Yangi` (`new`)
  - `Ko‘rib chiqilmoqda` (`in_review`)
  - `Qo‘shimcha ma’lumot kerak` (`needs_info`)
  - `Hal qilindi` (`resolved`)
  - `Rad etildi` (`rejected`)
- **Rollar bo‘yicha imkoniyatlar:**
  - *Pedagog:* Yangi murojaat yaratish (yutuqqa bog‘lab yoki umumiy), hujjat biriktirish, holatni kuzatish, javob yozish.
  - *Mas’ul baholovchi:* O‘z mezonlariga tegishli yoki biriktirilgan murojaatlarni ko‘rish, javob berish, aniqlashtirish so‘rash, direktorga oshirish (`escalate`).
  - *Direktor:* Barcha murojaatlarni nazorat qilish, yakuniy qaror va izoh yozish.
- **Backend:** `public.appeals`, `public.appeal_messages`, `get_appeals`, `create_appeal`, `add_appeal_message`, `update_appeal_status` RPC lari bilan himoyalangan.

---

## 3. Rivojlanish rejasi (`js/views/dev_plan.js`)
- **Maqsadi:** Pedagogning kasbiy o‘sish maqsadlari va vazifalarini rejalashtirish uchun shaxsiy ish maydoni (AI chatbot emas).
- **Imkoniyatlar:**
  - 26-AF bo‘limlariga (`A`, `B`, `C` yoki `Umumiy`) va aniq indikatorga bog‘langan maqsadlar yaratish.
  - Maqsadli sana va tavsif belgilash.
  - Har bir maqsad ichida bajariladigan vazifalar (checklist) qo‘shish, belgilash va o‘chirish.
  - Avtomatik bajarilish foizi, eng yaqin muddat eslatmalari va bildirishnomalar (7 kun ichidagi muddatlar).
- **Qoidalar:** Shaxsiy rivojlanish rejasi rasmiy reyting ballariga to‘g‘ridan-to‘g‘ri ta’sir qilmaydi va faqat autentifikatsiyalangan foydalanuvchining o‘ziga ko‘rinadi (`get_dev_goals`, `upsert_dev_goal`, `delete_dev_goal`, `upsert_dev_task`, `delete_dev_task`).
