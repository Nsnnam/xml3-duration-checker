import openpyxl

file_path = r'J:\Users\Admin\Desktop\2026\11.2026\0-Văn bản\20261110 - BHXH - Canh bao\26193_KET_QUA_KT251_KT252.xlsx'

wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
for sheet_name in wb.sheetnames:
    ws = wb[sheet_name]
    print(f"\n================ SHEET: {sheet_name} ================")
    row_count = 0
    headers = []
    for row in ws.iter_rows(values_only=True):
        row_count += 1
        if row_count == 1:
            headers = list(row)
            print("Headers (Row 1):", headers)
        elif row_count <= 5:
            print(f"Row {row_count}:", list(row)[:15])
        if row_count > 5:
            break
wb.close()
