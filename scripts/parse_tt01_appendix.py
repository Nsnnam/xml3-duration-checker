import pypdf, re, json, os

pdf_path = r'C:\Users\Admin\Downloads\Documents\01-byt.pdf'
reader = pypdf.PdfReader(pdf_path)

# Extract PL2
pl2_text = ''
for p in range(25, 33):
    pl2_text += reader.pages[p].extract_text() + '\n'

lines = pl2_text.split('\n')
items = []
current = None

for line in lines:
    line_clean = line.strip()
    if not line_clean or line_clean.isdigit():
        continue
    if 'Phụ lục II' in line or 'Ghi chú:' in line:
        continue
    m = re.match(r'^(\d+)\.\s+(.*)', line_clean)
    if m:
        stt = int(m.group(1))
        if stt <= 106:
            if current:
                items.append(current)
            current = {'stt': stt, 'content': m.group(2).strip()}
    elif current and current['stt'] <= 106:
        current['content'] += ' ' + line_clean

if current and current['stt'] <= 106:
    items.append(current)

print(f"Extracted {len(items)} items from Phụ lục II.")

# Also extract PL1
pl1_text = ''
for p in range(18, 25):
    pl1_text += reader.pages[p].extract_text() + '\n'

pl1_lines = pl1_text.split('\n')
pl1_items = []
current1 = None
for line in pl1_lines:
    line_clean = line.strip()
    if not line_clean or line_clean.isdigit():
        continue
    if 'Phụ lục I' in line or 'Ghi chú:' in line:
        continue
    m = re.match(r'^(\d+)\.\s+(.*)', line_clean)
    if m:
        stt = int(m.group(1))
        if stt <= 62:
            if current1:
                pl1_items.append(current1)
            current1 = {'stt': stt, 'content': m.group(2).strip()}
    elif current1 and current1['stt'] <= 62:
        current1['content'] += ' ' + line_clean
if current1 and current1['stt'] <= 62:
    pl1_items.append(current1)

print(f"Extracted {len(pl1_items)} items from Phụ lục I.")

out_path = r'C:\Users\Admin\Projects\xml3-duration-checker\scripts\tt01_extracted.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump({'pl2': items, 'pl1': pl1_items}, f, ensure_ascii=False, indent=2)

print("Saved to", out_path)
