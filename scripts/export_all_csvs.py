import openpyxl
import csv

# 1. Export Andhra_Pradesh_Colleges_Additional_Emails.xlsx to CSV
wb_main = openpyxl.load_workbook('Andhra_Pradesh_Colleges_No_Website_Verified_List.xlsx', data_only=True)
wb_add = openpyxl.load_workbook('temp_export.xlsx', data_only=True)
ws_add = wb_add.active
add_rows = list(ws_add.iter_rows(values_only=True))

with open('Andhra_Pradesh_Colleges_Additional_Emails.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    for r in add_rows:
        writer.writerow([str(c or '').strip() for c in r])

print(f"Exported Andhra_Pradesh_Colleges_Additional_Emails.csv with {len(add_rows)-1} records.")

# 2. Export Excluded list (350 colleges) to CSV
ws_ex = wb_main['No Website & No Email Excluded']
ex_rows = list(ws_ex.iter_rows(values_only=True))

with open('Andhra_Pradesh_Colleges_Excluded_Cannot_Outreach.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    for r in ex_rows:
        writer.writerow([str(c or '').strip() for c in r])

print(f"Exported Andhra_Pradesh_Colleges_Excluded_Cannot_Outreach.csv with {len(ex_rows)-1} records.")

import os
os.remove('temp_export.xlsx')
