"""สร้างหน้าตัวอย่าง docs/index.html จาก Index.html + ส่วน CORE ของ Code.gs + build/mock.js
ใช้คำสั่ง: python3 build/build.py
"""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'Index.html').read_text(encoding='utf-8')
gs = (root / 'Code.gs').read_text(encoding='utf-8')
core = gs.split('// ==== CORE START', 1)[1].split('// ==== CORE END', 1)[0]
mock = (root / 'build' / 'mock.js').read_text(encoding='utf-8')
page = html.replace('<!--PREVIEW_MOCK-->', '<script>\n' + core + '\n' + mock + '\n</script>')
out = ('<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
       '</head>\n<body>\n' + page + '\n</body>\n</html>\n')
(root / 'docs').mkdir(exist_ok=True)
(root / 'docs' / 'index.html').write_text(out, encoding='utf-8')
print('สร้าง docs/index.html แล้ว', len(out), 'ไบต์')
