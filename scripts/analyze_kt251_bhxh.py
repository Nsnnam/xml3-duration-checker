import openpyxl
import pandas as pd
import json

file_path = r'J:\Users\Admin\Desktop\2026\11.2026\0-Văn bản\20261110 - BHXH - Canh bao\26193_KET_QUA_KT251_KT252.xlsx'

print("--- Reading KT251 ---")
df_kt251 = pd.read_excel(file_path, sheet_name='KT251')
print("KT251 shape:", df_kt251.shape)
print("KT251 columns:", df_kt251.columns.tolist())
print("\nFirst 3 rows of KT251:")
print(df_kt251.head(3).to_dict(orient='records'))

print("\n--- Reading KT252 ---")
df_kt252 = pd.read_excel(file_path, sheet_name='KT252')
print("KT252 shape:", df_kt252.shape)
print("KT252 columns:", df_kt252.columns.tolist())
print("\nFirst 3 rows of KT252:")
print(df_kt252.head(3).to_dict(orient='records'))
