"""In-memory teacher importer (.xlsx, .csv, .txt) and login/password generator.
Files are parsed strictly in memory so no uploaded spreadsheet ever clutters storage."""
import csv
import io
import re
import secrets
import zipfile
import xml.etree.ElementTree as ET


_TRANSLIT = {
    "sh": "sh", "ch": "ch", "yo": "yo", "yu": "yu", "ya": "ya", "ye": "ye",
    "o'": "o", "g'": "g", "o‘": "o", "g‘": "g", "o`": "o", "g`": "g", "oʼ": "o", "gʼ": "g",
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e",
    "ё": "yo", "ж": "j", "з": "z", "и": "i", "й": "y", "к": "k",
    "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
    "с": "s", "т": "t", "у": "u", "ф": "f", "х": "x", "ҳ": "h",
    "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh", "ъ": "", "ы": "i",
    "ь": "", "э": "e", "ю": "yu", "я": "ya", "ў": "o", "ғ": "g", "қ": "q",
}


def make_login(name, exists_fn):
    """Generate a unique Latin login from a full name (e.g. 'Anvar Karimov' -> 'a.karimov')."""
    s = name.lower()
    for k, v in _TRANSLIT.items():
        s = s.replace(k, v)
    words = re.findall(r"[a-z]+", s)
    if not words:
        base = "pedagog"
    elif len(words) == 1:
        base = words[0][:18]
    else:
        base = f"{words[0][0]}.{words[1]}"[:22]
        if len(base) < 3:
            base = (words[0] + words[1])[:18]

    if len(base) < 3:
        base = (base + "000")[:3]

    login = base
    idx = 2
    while exists_fn(login):
        login = f"{base}{idx}"
        idx += 1
    return login


def temp_pw():
    """Generate a human-friendly temporary password (e.g. Mktb#7H9K2)."""
    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    return "Mktb#" + "".join(secrets.choice(chars) for _ in range(5))


def parse_xlsx_bytes(raw_bytes):
    """Parse the first worksheet of an .xlsx file purely in memory using stdlib zipfile + ET."""
    rows = []
    with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
        shared = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in root.iter():
                if si.tag.endswith("}si") or si.tag == "si":
                    txt = "".join(t.text or "" for t in si.iter() if t.tag.endswith("}t") or t.tag == "t")
                    shared.append(txt)

        sheet_name = None
        for name in sorted(zf.namelist()):
            if name.startswith("xl/worksheets/sheet") and name.endswith(".xml"):
                sheet_name = name
                break
        if not sheet_name:
            raise ValueError("Excel faylida varaq (sheet) topilmadi")

        sroot = ET.fromstring(zf.read(sheet_name))
        for row_el in sroot.iter():
            if not (row_el.tag.endswith("}row") or row_el.tag == "row"):
                continue
            row_vals = []
            for c_el in row_el:
                if not (c_el.tag.endswith("}c") or c_el.tag == "c"):
                    continue
                ref = c_el.attrib.get("r", "")
                col_letters = "".join(ch for ch in ref if ch.isalpha())
                col_idx = 0
                for ch in col_letters.upper():
                    col_idx = col_idx * 26 + (ord(ch) - ord("A") + 1)
                if col_idx > 0:
                    while len(row_vals) < col_idx - 1:
                        row_vals.append("")
                ctype = c_el.attrib.get("t", "")
                val = ""
                if ctype == "inlineStr":
                    val = "".join(t.text or "" for t in c_el.iter() if t.tag.endswith("}t") or t.tag == "t")
                else:
                    v_el = next((ch for ch in c_el if ch.tag.endswith("}v") or ch.tag == "v"), None)
                    if v_el is not None and v_el.text is not None:
                        if ctype == "s":
                            idx = int(v_el.text)
                            val = shared[idx] if 0 <= idx < len(shared) else ""
                        else:
                            val = v_el.text
                if col_idx > 0:
                    row_vals.append(val.strip())
                else:
                    row_vals.append(val.strip())
            if any(row_vals):
                rows.append(row_vals)
    return _normalize_rows(rows)


def parse_text_rows(text):
    """Parse semicolon, tab, or comma-delimited text into [(login, name, subject)]."""
    lines = [ln.strip() for ln in text.lstrip("\ufeff").splitlines() if ln.strip() and not ln.strip().startswith("#")]
    if not lines:
        return []
    sample = "\n".join(lines[:5])
    delim = ";" if ";" in sample else ("\t" if "\t" in sample else ",")
    reader = csv.reader(lines, delimiter=delim)
    rows = [[cell.strip() for cell in row] for row in reader if any(cell.strip() for cell in row)]
    return _normalize_rows(rows)


def _normalize_rows(rows):
    """Convert raw parsed cells into [(login, name, subject)], skipping headers and numbering columns."""
    out = []
    header_words = {"f.i.sh", "fish", "f.i.sh.", "ism", "familiya", "pedagog", "login", "№", "t/r", "no", "id"}
    for row in rows:
        cells = [c.strip() for c in row if c.strip()]
        if not cells:
            continue
        # Drop leading index number (1, 2, 3...) if Excel had a T/r column
        if cells[0].isdigit() and len(cells) >= 2:
            cells = cells[1:]
        if not cells:
            continue
        first_low = cells[0].lower().strip(".: ")
        if first_low in header_words:
            continue

        login = ""
        if len(cells) == 1:
            name, subject = cells[0], ""
        elif len(cells) == 2:
            if re.fullmatch(r"[a-z0-9._-]{3,30}", cells[0].lower()) and " " in cells[1]:
                login, name, subject = cells[0].lower(), cells[1], ""
            else:
                name, subject = cells[0], cells[1]
        else:
            if re.fullmatch(r"[a-z0-9._-]{3,30}", cells[0].lower()) and " " in cells[1]:
                login, name, subject = cells[0].lower(), cells[1], cells[2]
            else:
                name, subject = cells[0], cells[1]
        if name:
            out.append((login, name[:100], subject[:60]))
    return out
