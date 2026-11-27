# DESIGN SYSTEM V2 — Institutional Intelligence

## 1. Vizual Identifikatsiya
- **Kontseptsiya:** *Institutional Intelligence* — Quiet Luxury, Apple Precision, Linear Simplicity va Stripe Analytics tamoyillari uyg‘unligi.
- **Prinsip:** Ortiqcha neon effektlar, marketing bannerlari, bolalarcha medallar va emoji ikonkalarsiz, ma’lumotlarga asoslangan sokin va aniq interfeys.

## 2. Ranglar Palitrasi (`css/tokens.css`)

### Light Theme
| Token | Qiymat | Vazifasi |
|---|---|---|
| `--bg` | `#F5F6F8` | Asosiy canvas foni |
| `--surface` | `#FFFFFF` | Kartalar, jadvallar va modallar |
| `--bg-subtle` | `#F0F2F5` | Ikkilamchi yuzalar, jadval sarlavhalari |
| `--primary` | `#2448C7` | Asosiy brend va CTA urg‘usi |
| `--primary-hover` | `#1D3BA7` | Tugma va interaktiv hover holati |
| `--text` | `#111827` | Asosiy matn va sarlavhalar |
| `--text-2` | `#475467` | Ikkilamchi matn |
| `--text-muted` | `#667085` | Yordamchi izohlar va label |
| `--border` | `#E4E7EC` | Nozik 1px chegaralar |
| `--success` | `#15803D` | Tasdiqlangan va muvaffaqiyatli holat |
| `--warning` | `#B45309` | Tekshiruvda va ogohlantirish |
| `--error` | `#B42318` | Rad etilgan va xatolik |

### Dark Theme (Kalibrlangan, inversiya emas)
| Token | Qiymat | Vazifasi |
|---|---|---|
| `--bg` | `#0B0E14` | Chuqur tungi canvas |
| `--surface` | `#121720` | Asosiy karta yuzasi |
| `--surface-elevated` | `#1A212C` | Yuqori qatlam yuzalari |
| `--border` | `#283140` | Qorong‘i rejim chegaralari |
| `--primary` | `#7B9AFF` | Yuqori kontrastli ko‘k aksent |
| `--text` | `#F3F4F6` | Asosiy yorug‘ matn |
| `--text-muted` | `#94A3B8` | Yordamchi matn |

### Reyting Top 3 Muted Podium Ranglari
- **1-o‘rin (Muted Gold):** `#A16207` / `#FEF9E7` (Dark: `#EAB308`)
- **2-o‘rin (Muted Silver):** `#475469` / `#F1F5F9` (Dark: `#CBD5E1`)
- **3-o‘rin (Muted Bronze):** `#9A3412` / `#FFF7ED` (Dark: `#FB923C`)

## 3. Tipografiya va O‘lchamlar
- **Shrift:** `Inter`, system fallback (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- **Raqamlar:** `font-variant-numeric: tabular-nums` barcha reyting jadvallari, KPI va grafiklarda.
- **Spacing tizimi:** `4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`.
- **Border Radius:** Inputlar `8px`, tugmalar `8–10px`, kartalar `12–14px`, modallar `18px`.

## 4. Komponentlar va Motion (`css/components.css`, `style.css`)
- **Ikonografiya:** `js/icons.js` — bir xil `1.75px` stroke va optik markazlashgan inline Lucide SVGlar.
- **Interaktiv elementlar:** Modallar va O‘ng tafsilot drawer (`openModal`, `openDetailDrawer`) fokus tuzog‘i (`Tab` focus trap) va `Escape` boshqaruvi bilan.
- **Liquid Glass:** Faqat yopishqoq `topbar`, `popover-menu`, `modal-backdrop` va `toast`larda me’yorida qo‘llanilgan.
- **Motion timing:** `120ms` micro, `160ms` fast, `220ms` standard, `300ms` modal/reveal (`cubic-bezier(0.22, 1, 0.36, 1)`), `prefers-reduced-motion` to‘liq qo‘llab-quvvatlanadi.
