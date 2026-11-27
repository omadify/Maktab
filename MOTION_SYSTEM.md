# MOTION SYSTEM — MAKTAB PLATFORM V6

## 1. Asosiy Tamoyillar
- **Tabiiy va aniq:** Har bir animatsiya GPU-kompozit xossalar (`transform`, `opacity`, SVG `stroke-dashoffset`) da ishlaydi (`css/motion.css`, `js/motion.js`).
- **Bloklamaydigan:** Sahifa o‘tishlari va kaskadlar tezkor (`110ms–320ms`), foydalanuvchini kutishga majbur qilmaydi.
- **Aqlli takrorlanmaslik:** Fon yangilanishlari (`ctx.refresh()`) va bir xil marshrut ichidagi qayta chizishlarda (`skipPageAnim`) sahifa kirish va counter animatsiyalari qayta ishga tushmaydi.

## 2. Vaqt va Easing Parametrlari (`css/tokens.css`)
| Kategoriya | Davomiylik | Egri chiziq | Qo‘llanilishi |
|---|---|---|---|
| Press feedback | `110ms` (`--dur-press`) | `cubic-bezier(0.22, 1, 0.36, 1)` | Tugmalar (`scale(0.97)`), dock va nav elementlari |
| Micro-interactions | `160ms` (`--dur-micro`) | `--ease-out` | Hover, fokus halqasi, popover kirishi |
| Standard transitions | `240ms` (`--dur-base`) | `--ease-spring` | Liquid pill siljishi, toggle switch, toast |
| Dialogs & Sheets | `320ms` (`--dur-sheet`) | `--ease-spring` / `--ease-out` | Modallar, mobil bottom sheet, o‘ng drawer |
| Page transitions | `280ms` (`--dur-page`) | `--ease-out` | Sahifalararo silliq kirish (`v6PageEnter`) |
| Stagger intervals | `40ms` | `--ease-out` | KPI kartalar va qahramon bloklari (`25ms..225ms`) |

## 3. Maxsus Harakat Komponentlari (`js/motion.js`)
1. **`syncLiquidPills(root)`:** Aktiv tab (`.tab-btn.active`) koordinatalarini o‘lchab, `.liquid-pill-indicator` ni `translate3d` va spring egri chizig‘i bilan silliq siljitadi.
2. **`bindScrollAwareTopbar(topbarEl)`:** `requestAnimationFrame` bilan boshqariladigan passiv scroll tinglovchisi; `scrollY > 12px` bo‘lganda `.is-scrolled` klassini qo‘shadi.
3. **`scoreRingSvg(...)`:** 130 ballik natija halqasini SVG `stroke-dashoffset` (`v6RingDraw`, `720ms`) orqali chizadi.
4. **`animateCounters(container, skip)`:** Raqamli KPI ko‘rsatkichlarni `460ms` ichida `tabular-nums` bilan hisoblaydi.

## 4. Qulaylik (Accessibility)
- `@media (prefers-reduced-motion: reduce)` yoqilgan qurilmalarda barcha animatsiya va transitionlar `0.01ms` ga tushiriladi hamda `animateCounters` darhol yakuniy qiymatni ko‘rsatadi.
