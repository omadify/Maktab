# DESIGN SYSTEM — MAKTAB PLATFORM V6 (LIQUID INSTITUTIONAL)

## 1. Vizual Identifikatsiya
- **Yo‘nalish:** *Liquid Institutional* — Apple Liquid Glass shaffofligi, iOS interaktiv silliqligi, macOS oyna aniqligi, Linear tipografiyasi va Telegram profil ergonomikasi uyg‘unligi.
- **Asosiy qoida:** Chiroyli va zamonaviy, lekin maktab rahbariyati va pedagoglar uchun sokin, o‘qilishi yuqori, ma’lumotga boy va professional interfeys.

## 2. Ranglar Tizimi (`css/tokens.css`)

### Light Mode
| Token | Qiymat | Vazifasi |
|---|---|---|
| `--bg` | `#F5F7FB` | Asosiy canvas foni |
| `--surface` | `#FFFFFF` | Asosiy karta va jadval yuzasi |
| `--surface-soft` | `#EDF2F8` | Yumshoq ikkilamchi yuza |
| `--primary` | `#3267DB` | Asosiy brend va CTA aksent |
| `--primary-hover` | `#2453BB` | Tugma hover holati |
| `--text` | `#101827` | Asosiy matn |
| `--text-2` | `#506077` | Ikkilamchi matn |
| `--text-muted` | `#748297` | Yordamchi izoh va meta |
| `--border` | `#DCE4EE` | Chegara chiziqlari |
| `--success` | `#16A34A` | Tasdiqlangan holat |
| `--warning` | `#D97706` | Kutilayotgan / ogohlantirish |
| `--error` / `--danger` | `#DC2626` | Rad etilgan / xavfli amal |

### Dark Mode (Alohida kalibrlangan)
| Token | Qiymat | Vazifasi |
|---|---|---|
| `--bg` | `#090D15` | Midnight asosiy fon |
| `--surface` | `#131A26` | Asosiy karta yuzasi |
| `--surface-elevated` | `#1D2634` | Yuqori qatlam yuzasi |
| `--primary` | `#82A8FF` | Yuqori kontrastli ko‘k aksent |
| `--text` | `#F4F7FC` | Asosiy yorug‘ matn |
| `--text-2` | `#C4CEDD` | Ikkilamchi matn |
| `--text-muted` | `#98A6BA` | Meta matn |
| `--border` | `#2B3748` | Qorong‘i rejim chegarasi |

## 3. Tipografiya va Masofa
- **Shrift:** `Inter`, tizim zaxirasi (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`) — O‘zbek lotin harflari (`o‘`, `g‘`, `sh`, `ch`) to‘liq qo‘llab-quvvatlanadi.
- **Raqamlar:** Barcha reyting ballari, jadvallar va KPIlarda `font-variant-numeric: tabular-nums`.
- **Spacing shkala:** `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64px`.

## 4. Uch Qatlamli Layout Arxitekturasi (`style.css`)
- **Desktop (`>=1024px`):**
  1. Suzuvchi `Liquid Navigation Glass` chap panel (`256px` / `76px` collapsed).
  2. Suzuvchi, scrollga sezgir `Liquid Navigation Glass` yuqori panel (`topbar`, breadcrumb, `Ctrl+K`, bildirishnomalar, mavzu, profil).
  3. Asimmetrik bento kontent qatlami (`hero-panel`, `kpi-grid`, `grid-asymmetric`, `podium-grid`).
- **Mobile (`<768px`):**
  - Ixcham yuqori sarlavha + pastki suzuvchi `mobile-bottom-nav` dock + to‘liq navigatsiya draweri + pastdan chiqadigan iOS uslubidagi bottom sheet modallar (`safe-area-inset-bottom`).
