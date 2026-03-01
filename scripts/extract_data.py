import pandas as pd
import os

all_sheets = pd.read_excel('DimentionsMasterAudit.xlsx', sheet_name=None)

# Print sheet names and basic info
print(f"Sheets: {list(all_sheets.keys())}")
for name, df in all_sheets.items():
    print(f"\n{name}: {df.shape[0]} rows x {df.shape[1]} columns")
    print(f"Columns: {list(df.columns)}")
    # Save to CSV for easier viewing
    safe_name = name.replace(' ', '_').replace('/', '_')
    df.to_csv(f'{safe_name}.csv', index=False, encoding='utf-8')
    print(f"Saved to {safe_name}.csv")
