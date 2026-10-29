"""สร้างหน้าเว็บ docs/index.html สำหรับ GitHub Pages จาก Index.html
หน้าเว็บจะเชื่อมต่อฐานข้อมูลจริงผ่าน URL ของ Google Apps Script ที่ตั้งไว้ใน docs/config.js
ใช้คำสั่ง: python3 build/build.py
"""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'Index.html').read_text(encoding='utf-8').replace('<!--TEST_HOOK-->\n', '')
out = ('<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
       '<script src="config.js"></script>\n</head>\n<body>\n' + html + '\n</body>\n</html>\n')
docs = root / 'docs'
docs.mkdir(exist_ok=True)
(docs / 'index.html').write_text(out, encoding='utf-8')
cfg = docs / 'config.js'
if not cfg.exists():
    cfg.write_text("// ใส่ URL ของเว็บแอป Google Apps Script (ลงท้ายด้วย /exec) ระหว่างเครื่องหมาย ' '\n"
                   "window.PBL_API_URL = '';\n", encoding='utf-8')
print('สร้าง docs/index.html แล้ว', len(out), 'ไบต์')
