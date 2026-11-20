import openpyxl
from collections import defaultdict
from datetime import datetime

file_path = r'C:\Users\Admin\Downloads\other\XML3_20261101000000-20261120235959.xlsx'
wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
ws = wb.active

header_map = {}
rows = []

def parse_date(s):
    if not s: return None
    s = str(s).strip()
    digits = ''.join(c for c in s if c.isdigit())
    if len(digits) >= 12:
        try:
            return datetime.strptime(digits[:12], "%Y%m%d%H%M")
        except:
            pass
    return None

def get_col(r, col_name, default=''):
    idx = header_map.get(col_name)
    if idx is not None and idx < len(r) and r[idx] is not None:
        return r[idx]
    return default

for idx, r in enumerate(ws.iter_rows(values_only=True)):
    if idx == 0:
        header_map = {str(c).strip(): i for i, c in enumerate(r) if c is not None}
        continue
    nhom = str(get_col(r, 'MA_NHOM')).strip()
    if nhom in ('14', '15'):
        stt = get_col(r, 'STT')
        ma_lk = str(get_col(r, 'MA_LK')).strip()
        ma_khoa = str(get_col(r, 'MA_KHOA')).strip().upper()
        ma_giuong = str(get_col(r, 'MA_GIUONG')).strip().upper()
        ngay_th = parse_date(get_col(r, 'NGAY_TH_YL'))
        ngay_kq = parse_date(get_col(r, 'NGAY_KQ'))
        thanh_tien = float(get_col(r, 'THANH_TIEN_BH') or get_col(r, 'THANH_TIEN') or 0)
        muc_huong = float(get_col(r, 'MUC_HUONG') or 100)
        
        if ma_giuong and ngay_th and ngay_kq:
            rows.append({
                'idx': idx,
                'stt': stt,
                'ma_lk': ma_lk,
                'ma_khoa': ma_khoa,
                'ma_giuong': ma_giuong,
                'ngay_th': ngay_th,
                'ngay_kq': ngay_kq,
                'thanh_tien': thanh_tien,
                'muc_huong': muc_huong,
                'tien_bh': thanh_tien * (muc_huong / 100.0)
            })
wb.close()

print(f"Total bed records in file: {len(rows)}")

# Find overlaps between different patients
by_bed = defaultdict(list)
for r in rows:
    by_bed[(r['ma_khoa'], r['ma_giuong'])].append(r)

clusters = []
for bed_key, bed_rows in by_bed.items():
    if len(bed_rows) <= 1:
        continue
    n = len(bed_rows)
    adj = defaultdict(set)
    has_overlap = False
    for i in range(n):
        for j in range(i + 1, n):
            rA = bed_rows[i]
            rB = bed_rows[j]
            if rA['ma_lk'] == rB['ma_lk']:
                continue
            start_max = max(rA['ngay_th'], rB['ngay_th'])
            end_min = min(rA['ngay_kq'], rB['ngay_kq'])
            if end_min > start_max:
                overlap_mins = (end_min - start_max).total_seconds() / 60.0
                if overlap_mins > 240:
                    adj[i].add(j)
                    adj[j].add(i)
                    has_overlap = True
    
    if not has_overlap:
        continue
        
    visited = set()
    for i in range(n):
        if i in adj and i not in visited:
            comp = []
            q = [i]
            visited.add(i)
            while q:
                curr = q.pop(0)
                comp.append(bed_rows[curr])
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        q.append(neighbor)
            if len(comp) > 1:
                clusters.append(comp)

print(f"Total overlap clusters (>4h): {len(clusters)}")

total_loss_all = 0
total_loss_keep_one = 0
total_beds_kept = 0
total_beds_rejected = 0

for comp in clusters:
    # Sort: highest thanh_tien first, then earliest start
    comp_sorted = sorted(comp, key=lambda x: (-x['thanh_tien'], x['ngay_th']))
    kept = comp_sorted[0]
    rejected = comp_sorted[1:]
    
    total_beds_kept += 1
    total_beds_rejected += len(rejected)
    
    for r in comp:
        total_loss_all += r['tien_bh'] * 0.5
        
    for r in rejected:
        total_loss_keep_one += r['tien_bh']

print(f"Old logic total refusal (50% all): {total_loss_all:,.0f} VND")
print(f"New logic: Kept {total_beds_kept} highest beds, Rejected {total_beds_rejected} remaining beds")
print(f"New logic total refusal (100% of rejected): {total_loss_keep_one:,.0f} VND")
