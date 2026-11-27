# LIQUID GLASS SYSTEM — MAKTAB PLATFORM V6

## 1. Kontseptsiya: Liquid Institutional
Maktab Platform V6 da shisha materiallar bezak uchun emas, **axborot ierarxiyasi va chuqurlikni** ajratib ko‘rsatish uchun yaratilgan. Tizim 4 ta aniq funksional material qatlamidan iborat (`css/liquid-glass.css` va `css/tokens.css`).

## 2. To‘rtta Material Qatlami

### Material 1 — Liquid Navigation Glass (`.glass-nav`)
- **Qayerda:** Suzuvchi chap `sidebar`, yopishqoq scroll-aware `topbar`, mobil pastki navigatsiya dock (`.mobile-bottom-nav`).
- **Xususiyatlari:**
  - `backdrop-filter: blur(22px) saturate(185%)`
  - Yorug‘ rejimda `rgba(255, 255, 255, 0.72)`, scroll bo‘lganda `.is-scrolled` holatida `rgba(255, 255, 255, 0.88)` (o‘qilishi oshadi).
  - Qorong‘i rejimda `rgba(19, 26, 38, 0.74)` -> scroll bo‘lganda `0.90`.
  - Yuqori chetda nozik spekulyar nur (`inset 0 1px 0 rgba(255,255,255,0.85)`).

### Material 2 — Frosted Surface (`.glass-frosted`)
- **Qayerda:** Modallar (`.modal-panel`), o‘ng tafsilot va profil tahrirlash drawerlari (`.drawer-right-panel`), popover menyular (`.popover-menu`), toast bildirishnomalar (`.toast`), grafik tooltip (`.chart-tooltip`) va kirish kartasi (`.auth-card`).
- **Xususiyatlari:** `blur(24px–26px) saturate(175%–180%)`, yuqori kontrastli fon (`0.86–0.88` shaffoflik), nozik ichki yorug‘ chegaralar va yumshoq chuqurlik soyasi.

### Material 3 — Solid Content Surface (`.surface-solid`, `.card`, `.table-wrap`)
- **Qayerda:** Katta ma’lumot jadvallari, 26-AF mezonlari, uzoq formalar, grafiklar va A4 Portfolio.
- **Xususiyatlari:** To‘liq o‘qiladigan `var(--surface)` (`#FFFFFF` / `#131A26`) va aniq `1px solid var(--border)`. O‘qiluvchanlik hech qachon shisha effekti uchun qurbon qilinmaydi.

### Material 4 — Interactive Liquid Controls (`.liquid-control-group`, `.tabs-pill`, `.liquid-switch`)
- **Qayerda:** Segmentli boshqaruv elementlari, aktiv tab indikatorlari, toggle switchlar va navigatsiya tugmalari.
- **Xususiyatlari:** `js/motion.js` (`syncLiquidPills`) orqali silliq siljuvchi `.liquid-pill-indicator` va bosilganda elastik kengayuvchi `.liquid-switch-thumb`.

## 3. Moslashuvchanlik va Fallback Mexanizmlari
- `@supports not (backdrop-filter: blur(1px))`: shaffofliksiz toza `var(--surface)` ga avtomatik o‘tadi.
- `@media (prefers-reduced-transparency: reduce)` va `[data-transparency="reduced"]`: foydalanuvchi sozlamalaridan ("Yuqori kontrast / Shaffofliksiz") yoki OS darajasidan blur va shaffoflikni o‘chiradi.
- **Unimdorlik:** Butun ekran bo‘ylab uzluksiz `backdrop-filter` animatsiyalari ishlatilmaydi; ambient radial qatlam (`.ambient-backdrop`) statik va `pointer-events: none` rejimda ishlaydi.
