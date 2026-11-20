import os
import pypdf

folder = r'J:\Users\Admin\Desktop\2026\11.2026\0-Văn bản\20261110 - BHXH - Canh bao'
files = [
    '20261110_CV_giuongghep_DVKT.pdf',
    '20261110_TAILIEUHUONGDAN _giuong nam ghep.pdf'
]

for f in files:
    full_path = os.path.join(folder, f)
    print(f"\n==================== {f} ====================")
    if not os.path.exists(full_path):
        print("Not found")
        continue
    reader = pypdf.PdfReader(full_path)
    print(f"Num pages: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        print(f"--- Page {i+1} ---")
        text = page.extract_text()
        print(text[:1500])
