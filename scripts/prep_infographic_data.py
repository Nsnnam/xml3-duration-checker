import openpyxl
import json
from collections import defaultdict
from datetime import datetime

xml3_file = r'C:\Users\Admin\Downloads\other\XML3_20261101000000-20261120235959.xlsx'
wb = openpyxl.load_workbook(xml3_file, read_only=True, data_only=True)
ws = wb.active

header_map = {}
bed_rows = []

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
        ma_bn = str(get_col(r, 'MA_BN') or ma_lk).strip()
        ho_ten = str(get_col(r, 'HO_TEN') or f"Bệnh nhân {ma_lk}").strip()
        ma_khoa = str(get_col(r, 'MA_KHOA')).strip().upper()
        ma_giuong = str(get_col(r, 'MA_GIUONG')).strip().upper()
        ngay_th = parse_date(get_col(r, 'NGAY_TH_YL'))
        ngay_kq = parse_date(get_col(r, 'NGAY_KQ'))
        thanh_tien = float(get_col(r, 'THANH_TIEN_BH') or get_col(r, 'THANH_TIEN') or 0)
        muc_huong = float(get_col(r, 'MUC_HUONG') or 100)
        
        bed_rows.append({
            'idx': idx,
            'stt': stt,
            'ma_lk': ma_lk,
            'ma_bn': ma_bn,
            'ho_ten': ho_ten,
            'ma_khoa': ma_khoa,
            'ma_giuong': ma_giuong,
            'ngay_th': ngay_th,
            'ngay_kq': ngay_kq,
            'ngay_th_str': str(get_col(r, 'NGAY_TH_YL')),
            'ngay_kq_str': str(get_col(r, 'NGAY_KQ')),
            'thanh_tien': thanh_tien,
            'muc_huong': muc_huong,
            'tien_bh': thanh_tien * (muc_huong / 100.0)
        })
wb.close()

print(f"Total bed rows read: {len(bed_rows)}")

# Find overlapping bed intervals (> 240 mins) between different patients on the same bed and khoa
by_bed = defaultdict(list)
for r in bed_rows:
    if r['ma_giuong'] and r['ngay_th'] and r['ngay_kq']:
        by_bed[(r['ma_khoa'], r['ma_giuong'])].append(r)

retained_indices = set()
rejected_indices = set()
overlap_clusters = []
overlap_info_by_idx = defaultdict(list)
pair_multi_days = defaultdict(set)

for (ma_khoa, ma_giuong), rows in by_bed.items():
    if len(rows) <= 1:
        continue
    n = len(rows)
    adj = defaultdict(set)
    for i in range(n):
        for j in range(i + 1, n):
            rA = rows[i]
            rB = rows[j]
            if rA['ma_lk'] == rB['ma_lk']:
                continue
            start_max = max(rA['ngay_th'], rB['ngay_th'])
            end_min = min(rA['ngay_kq'], rB['ngay_kq'])
            if end_min > start_max:
                overlap_mins = (end_min - start_max).total_seconds() / 60.0
                if overlap_mins > 240:
                    adj[i].add(j)
                    adj[j].add(i)
                    h = round(overlap_mins / 60.0, 1)
                    overlap_info_by_idx[rA['idx']].append(f"{rB['ho_ten']} (LK: {rB['ma_lk']}, {h}h)")
                    overlap_info_by_idx[rB['idx']].append(f"{rA['ho_ten']} (LK: {rA['ma_lk']}, {h}h)")
                    day_key = start_max.strftime("%Y-%m-%d")
                    p_key = tuple(sorted([rA['ma_lk'], rB['ma_lk']])) + (ma_khoa, ma_giuong)
                    pair_multi_days[p_key].add(day_key)

    visited = set()
    for i in range(n):
        if i in adj and i not in visited:
            comp = []
            q = [i]
            visited.add(i)
            while q:
                curr = q.pop(0)
                comp.append(rows[curr])
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        q.append(neighbor)
            if len(comp) > 1:
                # Sort: highest thanh_tien first, then earliest start
                comp_sorted = sorted(comp, key=lambda x: (-x['thanh_tien'], x['ngay_th']))
                retained_indices.add(comp_sorted[0]['idx'])
                for r in comp_sorted[1:]:
                    rejected_indices.add(r['idx'])

# Also check minute-duplicate for same patient (12:00 -> 12:00)
minute_dup_indices = set()
by_patient = defaultdict(list)
for r in bed_rows:
    if r['ma_lk']:
        by_patient[r['ma_lk']].append(r)

for lk, p_rows in by_patient.items():
    if len(p_rows) <= 1:
        continue
    p_rows_sorted = sorted([r for r in p_rows if r['ngay_th']], key=lambda x: x['ngay_th'])
    for k in range(len(p_rows_sorted) - 1):
        prev = p_rows_sorted[k]
        nxt = p_rows_sorted[k+1]
        if prev['ngay_kq_str'] and nxt['ngay_th_str'] and prev['ngay_kq_str'] == nxt['ngay_th_str']:
            minute_dup_indices.add(nxt['idx'])

# Prepare final violation items
final_items = []
dept_stats = defaultdict(lambda: {'count': 0, 'rejected': 0, 'retained': 0, 'multiDay': 0, 'loss': 0, 'pts': set()})

for r in bed_rows:
    idx = r['idx']
    is_rejected = idx in rejected_indices
    is_retained = idx in retained_indices and not is_rejected
    is_minute_dup = idx in minute_dup_indices
    is_violation = is_rejected or is_retained or is_minute_dup

    if not is_violation:
        continue

    khoa = r['ma_khoa'] or 'KHOA_KHAC'
    d = dept_stats[khoa]
    d['count'] += 1
    d['pts'].add(r['ma_lk'])

    loai = "Giường ghép"
    type_key = "bed-sharing"
    if is_minute_dup:
        loai = "Trùng phút 12:00"
        type_key = "minute-duplicate"
    elif is_rejected or is_retained:
        # Check if multi-day
        is_multi_day = False
        for p_key, days in pair_multi_days.items():
            if r['ma_lk'] in p_key and len(days) >= 2:
                is_multi_day = True
                break
        if is_multi_day:
            loai = "Gối đầu (≥2N)"
            type_key = "multi-day-overlap"
            d['multiDay'] += 1
        else:
            loai = "Giường ghép"
            type_key = "bed-sharing"

    tien_xt = 0
    tinh_trang = "Chỉ cảnh báo"
    action = "warning"

    if is_rejected:
        tien_xt = round(r['tien_bh'])
        tinh_trang = "Xuất toán do trùng"
        action = "rejected"
        d['rejected'] += 1
        d['loss'] += tien_xt
    elif is_retained:
        tien_xt = 0
        tinh_trang = "Được giữ lại (0 đ XT)"
        action = "retained"
        d['retained'] += 1
    elif is_minute_dup:
        tien_xt = 0
        tinh_trang = "Cảnh báo trùng phút 12:00"
        action = "warning"

    peers_str = " | ".join(overlap_info_by_idx.get(idx, []))
    if not peers_str and is_minute_dup:
        peers_str = f"Trùng mốc 12:00 cùng BN STT trước"

    def format_dt(dt_val):
        if not dt_val: return ""
        return dt_val.strftime("%d/%m/%Y %H:%M")

    final_items.append({
        'maLk': r['ma_lk'],
        'maBn': r['ma_bn'],
        'hoTen': r['ho_ten'],
        'stt': r['stt'] or '',
        'khoa': r['ma_khoa'],
        'giuong': r['ma_giuong'],
        'ngayTh': format_dt(r['ngay_th']),
        'ngayKq': format_dt(r['ngay_kq']),
        'loai': loai,
        'typeKey': type_key,
        'action': action,
        'isRetained': is_retained,
        'tinhTrang': tinh_trang,
        'trung': peers_str or '—',
        'chiTiet': f"Thành tiền: {r['thanh_tien']:,.0f} đ, Mức hưởng: {r['muc_huong']:.0f}%, Tiền BHYT: {r['tien_bh']:,.0f} đ.",
        'tienXuatToan': tien_xt
    })

dept_list = []
for k, v in dept_stats.items():
    dept_list.append({
        'khoa': k,
        'count': v['count'],
        'rejected': v['rejected'],
        'retained': v['retained'],
        'multiDay': v['multiDay'],
        'patientCount': len(v['pts']),
        'loss': v['loss']
    })
dept_list.sort(key=lambda x: (-x['loss'], -x['count']))

total_loss = sum(d['loss'] for d in dept_list)
total_rejected = sum(d['rejected'] for d in dept_list)
total_retained = sum(d['retained'] for d in dept_list)
total_violations = len(final_items)

print(f"Total violations found: {total_violations}")
print(f"Total rejected: {total_rejected} (Loss: {total_loss:,.0f} VND)")
print(f"Total retained: {total_retained} (0 VND)")
print(f"Total departments: {len(dept_list)}")

# Save json for infographic generation
with open(r'C:\Users\Admin\Projects\xml3-duration-checker\scripts\infographic_data.json', 'w', encoding='utf-8') as f:
    json.dump({
        'violations': final_items,
        'deptList': dept_list,
        'totalLoss': total_loss,
        'totalRejected': total_rejected,
        'totalRetained': total_retained,
        'totalViolations': total_violations
    }, f, ensure_ascii=False, indent=2)

print("Saved infographic_data.json successfully.")
