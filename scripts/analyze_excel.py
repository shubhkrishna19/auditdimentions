import pandas as pd
import json

all_sheets = pd.read_excel('DimentionsMasterAudit.xlsx', sheet_name=None)

print("="*80)
print("EXCEL FILE ANALYSIS")
print("="*80)
print(f"\nTotal Sheets: {len(all_sheets)}")
print(f"Sheet Names: {list(all_sheets.keys())}")

for name, df in all_sheets.items():
    print("\n" + "="*80)
    print(f"SHEET: {name}")
    print("="*80)
    print(f"Shape: {df.shape} (rows x columns)")
    print(f"\nColumn Names:")
    for i, col in enumerate(df.columns):
        print(f"  {i+1}. '{col}'")
    print(f"\nData Types:")
    print(df.dtypes.to_string())
    print(f"\n--- FULL DATA (All Rows) ---")
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', None)
    pd.set_option('display.max_colwidth', 50)
    pd.set_option('display.max_rows', None)
    print(df.to_string())
    print("\n")
