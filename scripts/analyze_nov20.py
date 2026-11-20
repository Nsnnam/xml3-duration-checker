import openpyxl
from collections import defaultdict
import datetime

file_path = r'C:\Users\Admin\Downloads\XML3_20261101000000-20261120235959.xlsx'
wb = openpyxl.load_workbook(file_path, read_only=True)
sheet = wb.active

headers = None
records = []
row_idx = 0

for row in sheet.iter_rows(values_only=True):
    row_idx += 1
    if row_idx == 1:
        headers = {col: i for i, col in enumerate(row)}
        continue
    
    ma_nhom = str(row[headers['MA_NHOM']] or '').strip()
    ma_lk = str(row[headers['MA_LK']] or '').strip()
    ma_bn = str(row[headers.get('MA_BA', headers.get('MA_BN', 0))] or '').strip()
    ho_ten = str(row[headers.get('HO_TEN', 0)] or '').strip()
    ma_khoa = str(row[headers['MA_KHOA']] or '').strip()
    ma_giuong = str(row[headers['MA_GIUONG']] or '').strip()
    ngay_yl = str(row[headers['NGAY_YL']] or '').strip()
    ngay_th = str(row[headers['NGAY_TH_YL']] or '').strip()
    ngay_kq = str(row[headers['NGAY_KQ']] or '').strip()
    thanh_tien = float(row[headers['THANH_TIEN_BH']] or row[headers['THANH_TIEN_BV']] or 0)
    
    records.append({
        'ma_lk': ma_lk, 'ma_bn': ma_bn, 'ho_ten': ho_ten,
        'ma_nhom': ma_nhom, 'ma_khoa': ma_khoa, 'ma_giuong': ma_giuong,
        'ngay_yl': ngay_yl, 'ngay_th': ngay_th, 'ngay_kq': ngay_kq,
        'thanh_tien': thanh_tien, 'row_idx': row_idx
    })

print(f"Total records in file: {len(records)}")
bed_records = [r for r in records if r['ma_nhom'] in ('14', '15')]
print(f"Total bed records (nhóm 14, 15): {len(bed_records)}")
all_pts = set(r['ma_lk'] for r in records)
bed_pts = set(r['ma_lk'] for r in bed_records)
print(f"Total patients: {len(all_pts)}, Patients with beds: {len(bed_pts)}")

# Check minute duplicates for same patient
minute_dup_count = 0
bed_by_pt = defaultdict(list)
for r in bed_records:
    bed_by_pt[r['ma_lk']].append(r)

for lk, r_list in bed_by_pt.items():
    r_list.sort(key=lambda x: x['ngay_th'])
    for k in range(len(r_list) - 1):
        if r_list[k]['ngay_kq'] and r_list[k+1]['ngay_th'] and r_list[k]['ngay_kq'] == r_list[k+1]['ngay_th']:
            minute_dup_count += 1

print(f"Minute duplicates (prev.NGAY_KQ == next.NGAY_TH_YL): {minute_dup_count}")

# Check bed sharing in same khoa and ma_giuong
bed_by_khoa_giuong = defaultdict(list)
for r in bed_records:
    if r['ma_khoa'] and r['ma_giuong']:
        bed_by_khoa_giuong[(r['ma_khoa'], r['ma_giuong'])].append(r)

def parse_dt(s):
    if len(s) >= 12:
        try:
            return datetime.datetime.strptime(s[:12], '%Y%m%d%H%M')
        except:
            return None
    return None

sharing_rows = set()
multi_day_overlap_rows = set()
dept_stats = defaultdict(lambda: {'count': 0, 'multi_day': 0, 'pts': set(), 'loss': 0.0})

for (khoa, giuong), r_list in bed_by_khoa_giuong.items():
    if len(r_list) <= 1:
        continue
    for i in range(len(r_list)):
        r1 = r_list[i]
        dt1_s = parse_dt(r1['ngay_th'])
        dt1_e = parse_dt(r1['ngay_kq'])
        if not dt1_s or not dt1_e:
            continue
        for j in range(i + 1, len(r_list)):
            r2 = r_list[j]
            if r1['ma_lk'] == r2['ma_lk']:
                continue
            dt2_s = parse_dt(r2['ngay_th'])
            dt2_e = parse_dt(r2['ngay_kq'])
            if not dt2_s or not dt2_e:
                continue
            
            overlap_s = max(dt1_s, dt2_s)
            overlap_e = min(dt1_e, dt2_e)
            if overlap_e > overlap_s:
                overlap_days = (overlap_e.date() - overlap_s.date()).days + 1
                sharing_rows.add(r1['row_idx'])
                sharing_rows.add(r2['row_idx'])
                dept_stats[khoa]['pts'].add(r1['ma_lk'])
                dept_stats[khoa]['pts'].add(r2['ma_lk'])
                if overlap_days >= 2:
                    multi_day_overlap_rows.add(r1['row_idx'])
                    multi_day_overlap_rows.add(r2['row_idx'])

print(f"Total sharing rows: {len(sharing_rows)}")
print(f"Multi-day overlap rows (>= 2 days): {len(multi_day_overlap_rows)}")

total_loss = 0.0
for r in bed_records:
    if r['row_idx'] in sharing_rows:
        dept_stats[r['ma_khoa']]['count'] += 1
        loss = r['thanh_tien'] * 0.5
        dept_stats[r['ma_khoa']]['loss'] += loss
        total_loss += loss
        if r['row_idx'] in multi_day_overlap_rows:
            dept_stats[r['ma_khoa']]['multi_day'] += 1

print(f"Total loss estimation: {total_loss:,.0f} VND")
print("\nDepartment breakdown:")
for k, v in sorted(dept_stats.items(), key=lambda x: x[1]['loss'], reverse=True):
    cnt = v['count']
    md = v['multi_day']
    num_pts = len(v['pts'])
    loss_val = v['loss']
    print(f"Khoa {k}: {cnt} dong ({md} goi dau), {num_pts} BN, {loss_val:,.0f} VND")
