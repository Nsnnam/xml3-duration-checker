import openpyxl

wb = openpyxl.load_workbook(r'J:\Users\Admin\Desktop\2026\11.2026\0-Văn bản\20261110 - BHXH - Canh bao\26193_KET_QUA_KT251_KT252.xlsx', read_only=True)

# 1. Inspect KT251 headers
ws1 = wb['KT251']
header1 = None
for r in ws1.iter_rows(values_only=True):
    header1 = [str(c) for c in r]
    break
print('KT251 Full Headers:', header1)

# 2. Inspect KT252 headers
ws2 = wb['KT252']
header2 = None
for r in ws2.iter_rows(values_only=True):
    header2 = [str(c) for c in r]
    break
print('\nKT252 Full Headers:', header2)
