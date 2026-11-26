"""Configuration, 26-AF decree scoring criteria, and security constants."""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
DATA_DIR = os.environ.get("REYTING_DATA", os.path.join(BASE_DIR, "data"))
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
DB_FILE = os.path.join(DATA_DIR, "reyting.db")

HOST = os.environ.get("REYTING_HOST", "0.0.0.0" if (os.environ.get("PORT") or os.environ.get("RENDER")) else "127.0.0.1")
PORT = int(os.environ.get("PORT") or os.environ.get("REYTING_PORT") or "8080")
HTTPS = os.environ.get("REYTING_HTTPS") == "1" or bool(os.environ.get("RENDER"))

# Supabase configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://melqpmfjwqivylnmucwc.supabase.co").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY", "")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "proofs")

# Optional custom TLS CA bundle (useful on Android / custom environments)
ANDROID_CA = "/data/user/0/com.agy/files/usr/etc/tls/cert.pem"
SSL_CA_FILE = os.environ.get("SSL_CERT_FILE") or (ANDROID_CA if os.path.exists(ANDROID_CA) else None)

MAX_FILE = 8 * 1024 * 1024  # 8 MB
SESSION_TTL = 12 * 3600     # 12 hours

# 4 roles (+ legacy 'admin' mapped to director-level)
ROLES = ("teacher", "reviewer", "it_admin", "director", "admin")

ROLE_LABELS = {
    "teacher": "Pedagog",
    "reviewer": "Mas’ul (ekspert)",
    "it_admin": "IT mutaxassis",
    "director": "Maktab direktori",
    "admin": "Administrator",
}

# ---- 26-AF buyruq asosidagi 15 ta indikator (Jami 130 ball) ----
_RAW_INDICATORS = [
    (1, "A", "Ilmiy daraja", 10, "N.Meliboyeva", "Diplom, ilmiy daraja guvohnomasi", [("DSc / professor", 10), ("PhD / dotsent", 8), ("TOP–1000 OTM diplomi", 6)]),
    (2, "A", "Malaka toifasi", 5, "N.Meliboyeva", "Attestatsiya guvohnomasi", [("Oliy toifa", 5), ("Birinchi toifa", 4), ("Ikkinchi toifa", 3)]),
    (3, "A", "Mutaxassislik fanidan sertifikat", 5, "D.Rasulova", "IELTS, CEFR, SAT, TESOL, milliy sertifikat", [("Xalqaro sertifikat", 5), ("Milliy sertifikat", 3)]),
    (4, "A", "Boshqa fandan sertifikat", 10, "D.Rasulova", "Sertifikat nusxasi", [("Xalqaro sertifikat", 5), ("Milliy sertifikat", 3)]),
    (5, "A", "Malaka oshirish va stajirovka", 5, "N.Meliboyeva", "Sertifikat, buyruq, QR-kodli hujjat", [("Stajirovka", 3), ("Malaka oshirish kursi", 2)]),
    (6, "A", "Pedagog tanlovlari", 5, "D.Rasulova", "Diplom, buyruq", [("Xalqaro g‘olib", 5), ("Respublika g‘olibi", 4), ("Viloyat g‘olibi", 2), ("Pedagog sifatida ishtirok", 1)]),
    (7, "A", "Metodik va mualliflik ishlari", 10, "D.Rasulova", "Qo‘llanma, maqola, videodars, fan kengashi qarori", [("Metodik qo‘llanma", 4), ("Ilmiy maqola", 2), ("Videodars", 2), ("Ommalashtirilgan tajriba", 2)]),
    (14, "B", "Olimpiada va tanlov g‘oliblari (o‘quvchi)", 10, "D.Rasulova, S.Murodov", "Diplom, buyruq", [("Xalqaro g‘olib", 5), ("Respublika g‘olibi", 3), ("Viloyat g‘olibi", 2), ("Ishtirokchi", 1)]),
    (15, "B", "O‘quvchilar sertifikatlari", 5, "S.Murodov, D.Rasulova", "IELTS, CEFR, SAT, milliy sertifikat", [("Xalqaro sertifikat", 2), ("Milliy sertifikat", 1)]),
    (16, "B", "STEAM, StartUp, ilmiy loyihalar", 10, "S.Murodov, D.Rasulova", "Loyiha, patent, grant, diplom", [("Tanlov g‘olibi", 5), ("Loyiha ishtiroki", 2)]),
    (17, "B", "Ma’naviy-ma’rifiy va sport yutuqlari", 5, "A.Karimjonov, S.Murodov", "Diplom, bayonnoma", [("G‘olib", 2), ("Sovrindor", 1), ("Ishtirokchi", 1)]),
    (18, "C", "O‘quvchilar o‘zlashtirishi (fan bo‘yicha)", 20, "D.Rasulova", "Elektron jurnal, CHSB tahlili (sinf va chorak)", [("90% va yuqori (sinf/chorak)", 4), ("80–89% (sinf/chorak)", 3), ("70–79% (sinf/chorak)", 2)]),
    (19, "C", "Fan tanlovlarida ishtirok (o‘quvchi va pedagog)", 10, "D.Rasulova", "Ishtirokchilar ro‘yxati, buyruq, sertifikat", [("Xalqaro tanlovda o‘quvchi ishtiroki", 2), ("Respublika tanlovida o‘quvchi ishtiroki", 1), ("Pedagogning o‘zi ishtiroki", 2)]),
    (20, "C", "Sport va ma’naviy-ma’rifiy tadbirlardagi ishtirok", 10, "A.Karimjonov, S.Murodov", "Tadbirlar rejasi, bayonnoma, foto/video, buyruq", [("O‘quvchini tayyorlab qatnashtirish", 1), ("Pedagogning o‘zi ishtiroki", 1), ("Tashkilotchi / murabbiy", 2), ("Sovrinli o‘rin (o‘quvchi)", 3)]),
    (21, "C", "Sertifikat olgan o‘quvchilarni tayyorlagan ustoz", 10, "S.Murodov, D.Rasulova", "IELTS, CEFR, SAT, milliy sertifikat nusxasi", [("Xalqaro sertifikat (o‘quvchi uchun)", 3), ("Milliy sertifikat (o‘quvchi uchun)", 2)]),
]

IND = [
    {"id": a, "sec": b, "name": c, "max": d, "resp": e, "doc": f, "types": [list(t) for t in g]}
    for a, b, c, d, e, f, g in _RAW_INDICATORS
]
IMAP = {i["id"]: i for i in IND}
SEC = {
    "A": ["Pedagoglar salohiyati", 50],
    "B": ["O‘quvchilar yutuqlari", 30],
    "C": ["Fan bo‘yicha faollik va rag‘bat", 50],
}


def calc_scores(rows):
    """Calculate capped section scores and totals from [(ind, status, pts)]."""
    ok, wait = {}, {}
    for ind, st, pts in rows:
        if ind in IMAP and st in ("approved", "pending"):
            bucket = ok if st == "approved" else wait
            bucket[ind] = bucket.get(ind, 0) + float(pts)
    by = {}
    sections = {"A": 0.0, "B": 0.0, "C": 0.0}
    for i in IND:
        o = min(ok.get(i["id"], 0.0), float(i["max"]))
        w = min(wait.get(i["id"], 0.0), float(i["max"]) - o)
        by[i["id"]] = {"ok": round(o, 2), "wait": round(w, 2)}
        sections[i["sec"]] += o
    a = round(sections["A"], 2)
    b = round(sections["B"], 2)
    c = round(sections["C"], 2)
    return {"by": by, "A": a, "B": b, "C": c, "T": round(a + b + c, 2)}
