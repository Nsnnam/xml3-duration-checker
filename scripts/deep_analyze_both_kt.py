import openpyxl
import re

wb = openpyxl.load_workbook(r'J:\Users\Admin\Desktop\2026\11.2026\0-Văn bản\20261110 - BHXH - Canh bao\26193_KET_QUA_KT251_KT252.xlsx', read_only=True)

# ----------------- ANALYZE KT251 -----------------
print("=================== ANALYZING KT251 ===================")
ws1 = wb['KT251']
h1 = None
total_rows1 = 0
sum_kt1 = 0
sum_xt1 = 0
dept_stats1 = {}
marks1 = {}
loi1 = {}
hs_trung_dist = {}
overlap_lt_4h = 0
overlap_gte_4h = 0
overlap_hours_list = []

for r in ws1.iter_rows(values_only=True):
    total_rows1 += 1
    if total_rows1 == 1:
        h1 = {col: i for i, col in enumerate(r)}
        continue
    
    def get1(name):
        idx = h1.get(name)
        return r[idx] if idx is not None and idx < len(r) else None

    kt = float(get1('T_KIEM_TRA_BHYT') or 0)
    xt = float(get1('T_XUATTOAN_BHTT') or 0)
    sum_kt1 += kt
    sum_xt1 += xt

    khoa = str(get1('TEN_KHOA') or get1('MA_KHOA') or 'KHAC').strip()
    mk = str(get1('MA_KHOA') or '').strip()
    key_khoa = f"{mk} - {khoa}"
    if key_khoa not in dept_stats1:
        dept_stats1[key_khoa] = {'count': 0, 'kt': 0, 'xt': 0, 'pts': set()}
    dept_stats1[key_khoa]['count'] += 1
    dept_stats1[key_khoa]['kt'] += kt
    dept_stats1[key_khoa]['xt'] += xt
    dept_stats1[key_khoa]['pts'].add(get1('MA_LK'))

    m = str(get1('MARK') or 'None')
    marks1[m] = marks1.get(m, 0) + 1

    l = str(get1('LOI') or 'None')
    loi1[l] = loi1.get(l, 0) + 1

    so_trung = get1('SO_HS_TRUNG')
    try:
        st = int(so_trung) if so_trung is not None else 0
    except:
        st = 0
    hs_trung_dist[st] = hs_trung_dist.get(st, 0) + 1

    # Check THONG_TIN_TRUNG for hours
    tt_trung = str(get1('THONG_TIN_TRUNG') or '')
    # Example format: 2967939464:16930496125:23.98|2970055279:16945979587:4.78
    if tt_trung:
        parts = tt_trung.split('|')
        for p in parts:
            p_parts = p.split(':')
            if len(p_parts) >= 3:
                try:
                    hrs = float(p_parts[2])
                    if hrs < 4.0:
                        overlap_lt_4h += 1
                    else:
                        overlap_gte_4h += 1
                except:
                    pass

print(f"KT251 Total Rows: {total_rows1 - 1}")
print(f"KT251 Total T_KIEM_TRA_BHYT: {sum_kt1:,.0f} VNĐ")
print(f"KT251 Total T_XUATTOAN_BHTT: {sum_xt1:,.0f} VNĐ")
print(f"Overlap pairs < 4.0 hours: {overlap_lt_4h}")
print(f"Overlap pairs >= 4.0 hours: {overlap_gte_4h}")
print("SO_HS_TRUNG Distribution:")
for k, v in sorted(hs_trung_dist.items()):
    print(f"  - SO_HS_TRUNG={k}: {v} rows")
print("MARK Distribution:", marks1)
print("LOI Distribution:", loi1)
print("\nTop 10 Khoa in KT251 by T_KIEM_TRA_BHYT:")
for k, v in sorted(dept_stats1.items(), key=lambda x: x[1]['kt'], reverse=True)[:10]:
    print(f"  {k}: {v['count']} dòng, {len(v['pts'])} BN, KT: {v['kt']:,.0f} đ, XT: {v['xt']:,.0f} đ")

# ----------------- ANALYZE KT252 -----------------
print("\n=================== ANALYZING KT252 ===================")
ws2 = wb['KT252']
h2 = None
total_rows2 = 0
sum_kt2 = 0
sum_xt2 = 0
service_stats2 = {}
performer_stats2 = {}
dept_stats2 = {}
loi2 = {}
bitru2 = {}
dungpvcm2 = {}
ky_qt2 = {}

for r in ws2.iter_rows(values_only=True):
    total_rows2 += 1
    if total_rows2 == 1:
        h2 = {col: i for i, col in enumerate(r)}
        continue
    
    def get2(name):
        idx = h2.get(name)
        return r[idx] if idx is not None and idx < len(r) else None

    kt = float(get2('T_KIEM_TRA_BHYT') or 0)
    xt = float(get2('T_XUATTOAN_BHTT') or 0)
    sum_kt2 += kt
    sum_xt2 += xt

    srv_code = str(get2('MA_CP') or '').strip()
    srv_name = str(get2('TEN_CP') or '').strip()
    srv_key = f"{srv_code} - {srv_name}"
    if srv_key not in service_stats2:
        service_stats2[srv_key] = {'count': 0, 'kt': 0, 'xt': 0}
    service_stats2[srv_key]['count'] += 1
    service_stats2[srv_key]['kt'] += kt
    service_stats2[srv_key]['xt'] += xt

    bs_code = str(get2('MA_BSI_THUC_HIEN') or '').strip()
    bs_name = str(get2('VANBANGCM') or '').strip()
    bs_key = f"{bs_code} (VB: {bs_name})"
    if bs_key not in performer_stats2:
        performer_stats2[bs_key] = {'count': 0, 'kt': 0, 'xt': 0}
    performer_stats2[bs_key]['count'] += 1
    performer_stats2[bs_key]['kt'] += kt
    performer_stats2[bs_key]['xt'] += xt

    khoa = str(get2('TEN_KHOA') or get2('MA_KHOA') or 'KHAC').strip()
    dept_stats2[khoa] = dept_stats2.get(khoa, 0) + 1

    l = str(get2('LOI') or 'None')
    loi2[l] = loi2.get(l, 0) + 1

    bt = str(get2('BI_TRU') or 'None')
    bitru2[bt] = bitru2.get(bt, 0) + 1

    pv = str(get2('DUNG_PVCM') or 'None')
    dungpvcm2[pv] = dungpvcm2.get(pv, 0) + 1

    kqt = str(get2('KY_QT') or 'None')
    ky_qt2[kqt] = ky_qt2.get(kqt, 0) + 1

print(f"KT252 Total Rows: {total_rows2 - 1}")
print(f"KT252 Total T_KIEM_TRA_BHYT: {sum_kt2:,.0f} VNĐ")
print(f"KT252 Total T_XUATTOAN_BHTT: {sum_xt2:,.0f} VNĐ")
print("KT252 Kỳ quyết toán:", ky_qt2)
print("KT252 LOI Distribution:", loi2)
print("KT252 BI_TRU Distribution:", bitru2)
print("KT252 DUNG_PVCM Distribution:", dungpvcm2)
print("\nTop 10 DVKT in KT252 by T_KIEM_TRA_BHYT:")
for k, v in sorted(service_stats2.items(), key=lambda x: x[1]['kt'], reverse=True)[:10]:
    print(f"  {k}: {v['count']} lượt, KT: {v['kt']:,.0f} đ, XT: {v['xt']:,.0f} đ")

print("\nTop 10 Người thực hiện in KT252 by T_KIEM_TRA_BHYT:")
for k, v in sorted(performer_stats2.items(), key=lambda x: x[1]['kt'], reverse=True)[:10]:
    print(f"  {k}: {v['count']} lượt, KT: {v['kt']:,.0f} đ")
