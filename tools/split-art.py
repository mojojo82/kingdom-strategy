"""Art split (Harley, 11 Nov 2026): move packed-in base64 art out of test/index.html into test/assets/ as real files.

Each moved item becomes  ksA("assets/<name>-<hash8>.<ext>")  (start-up art: the splash preloads it and counts it on the loading bar)
or  ksA("assets/...", 1)  (lazy: loads on first use, not at start-up). ksA (defined at the top of the page) turns the path into one full
address, so code that compares picture addresses (e.g. city-skin water settings: CITY_SKINS[k].src === img.src) keeps working.
The hash in the name = the file's content, so a changed picture always gets a new name (phones never show an old copy, and TEST's
test/assets/ never touches LIVE's assets/).

Run: python3 tools/split-art.py NAME [NAME...]       NAME = the variable a data URI sits in (as the code reads, e.g. CITY_SKINS,
     KNIGHT_IDLE.img.src). Prefix with ~ for lazy (e.g. ~HERO_CARD_VIDEO). --dry lists what would move.
Only double-quoted "data:..." literals of 8 KB+ are moved; CSS url(data:...) and audio are left alone."""
import base64, hashlib, os, re, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
P = os.path.join(ROOT, "test/index.html"); OUT = os.path.join(ROOT, "test/assets"); os.makedirs(OUT, exist_ok=True)
DRY = "--dry" in sys.argv; args = [a for a in sys.argv[1:] if a != "--dry"]
want = {a.lstrip("~"): a.startswith("~") for a in args}
EXT = {"image/webp": "webp", "image/png": "png", "image/jpeg": "jpg", "video/mp4": "mp4", "video/webm": "webm", "image/gif": "gif"}
s = open(P, encoding="utf-8").read()
lines = s.split("\n"); cur = "?"; out = []; moved = 0; saved = 0
lit = re.compile(r'"data:((?:image|video)/[a-z0-9+]+);base64,([A-Za-z0-9+/=]{8000,})"')
for ln in lines:
    m = re.match(r"\s*(?:var|const|let)\s+([A-Za-z_][A-Za-z0-9_]*)", ln) or re.match(r"\s*([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*", ln)
    if m: cur = m.group(1)
    if cur in want and '"data:' in ln:
        def sub(mm):
            global moved, saved
            mime, b64 = mm.group(1), mm.group(2)
            if mime not in EXT: return mm.group(0)
            pre = ln[max(0, mm.start() - 400):mm.start()]
            k = re.findall(r"([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{[^{}]*$", pre)
            name = re.sub(r"[^a-z0-9]+", "-", (cur.split(".")[0] + "-" + (k[-1] if k else "x")).lower()).strip("-")
            data = base64.b64decode(b64); h = hashlib.sha1(data).hexdigest()[:8]
            fn = "%s-%s.%s" % (name, h, EXT[mime])
            if not DRY: open(os.path.join(OUT, fn), "wb").write(data)
            moved += 1; saved += len(mm.group(0))
            print("%-40s %7d KB%s" % (fn, len(data) // 1024, "  (lazy)" if want[cur] else ""))
            return 'ksA("assets/%s"%s)' % (fn, ", 1" if want[cur] else "")
        ln = lit.sub(sub, ln)
    out.append(ln)
print("moved", moved, "items, file shrinks by %.1f MB" % (saved / 1e6))
if not DRY: open(P, "w", encoding="utf-8").write("\n".join(out))
