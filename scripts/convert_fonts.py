"""One-time font conversion: TTF/OTF sources -> woff2 in public/fonts.
Originals are never modified. Requires: pip install fonttools brotli
Usage: python scripts/convert_fonts.py <the folder holding the font sources>
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont

if len(sys.argv) != 2:
    raise SystemExit("usage: python scripts/convert_fonts.py <the folder holding the font sources>")
SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parents[1] / "public" / "fonts"

FILES = [
    ("Clash Display/ClashDisplay-Regular.otf", "ClashDisplay-Regular.woff2"),
    ("Clash Display/ClashDisplay-Medium.otf", "ClashDisplay-Medium.woff2"),
    ("Clash Display/ClashDisplay-Bold.otf", "ClashDisplay-Bold.woff2"),
    ("Bodoni_Moda/BodoniModa-VariableFont_opsz,wght.ttf", "BodoniModa-Var.woff2"),
    ("Bodoni_Moda/BodoniModa-Italic-VariableFont_opsz,wght.ttf", "BodoniModa-Italic-Var.woff2"),
    ("Geist Mono/GeistMono-VariableFont_wght.ttf", "GeistMono-Var.woff2"),
    ("Martian Mono/MartianMono-VariableFont_wdth,wght.ttf", "MartianMono-Var.woff2"),
]

OUT.mkdir(parents=True, exist_ok=True)
missing = []
for src, dst in FILES:
    p = SRC / src
    if not p.exists():
        missing.append(str(p))
        print(f"!! MISSING {p}")
        continue
    f = TTFont(str(p))
    f.flavor = "woff2"
    f.save(str(OUT / dst))
    print(f"ok {dst}")

if missing:
    raise SystemExit(f"{len(missing)} source font(s) missing - check the folder and the names above")
print("done")
