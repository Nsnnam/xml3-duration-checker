import openpyxl

wb = openpyxl.load_workbook(r'J:\Users\Admin\Desktop\2026\11.2026\0-Văn bản\20261110 - BHXH - Canh bao\26193_KET_QUA_KT251_KT252.xlsx', read_only=True)

for sheetname in ['KT251', 'KT252']:
    print(f'=== INSPECTING SHEET {sheetname} ===')
    ws = wb[sheetname]
    row_count = 0
    header = None
    sample_rows = []
    error_types = {}
    total_xuat_toan = 0
    total_kiem_tra = 0
    
    for r in ws.iter_rows(values_only=True):
        row_count += 1
        if row_count == 1:
            header = [str(c) if c is not None else f'COL_{i}' for i, c in enumerate(r)]
            print('Header length:', len(header))
            print('Header columns:', header[:25])
            continue
        
        # Build dict for row
        row_dict = {}
        for i, val in enumerate(r):
            if i < len(header):
                row_dict[header[i]] = val
        
        ten_loi = str(row_dict.get('TEN_LOI_LOAI_TRU', '') or row_dict.get('TEN_LOI', '') or '')
        ma_loi = str(row_dict.get('MA_LOI_LOAI_TRU', '') or row_dict.get('MA_LOI', '') or '')
        key = f"{ma_loi} - {ten_loi}".strip(' -')
        error_types[key] = error_types.get(key, 0) + 1
        
        try:
            xt = float(row_dict.get('T_XUAT_TOAN_BHYT', 0) or 0)
            total_xuat_toan += xt
        except:
            pass
        
        try:
            kt = float(row_dict.get('T_KIEM_TRA_BHYT', 0) or 0)
            total_kiem_tra += kt
        except:
            pass
            
        if len(sample_rows) < 3:
            sample_rows.append(row_dict)
            
    print(f'Total rows in {sheetname}: {row_count}')
    print(f'Total T_XUAT_TOAN_BHYT: {total_xuat_toan:,.0f} đ')
    print(f'Total T_KIEM_TRA_BHYT: {total_kiem_tra:,.0f} đ')
    print('Error types breakdown:')
    for k, v in sorted(error_types.items(), key=lambda x: x[1], reverse=True)[:15]:
        print(f'  - [{v} rows] {k}')
    print()
