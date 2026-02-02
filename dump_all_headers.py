import pandas as pd

# Load 'Billing Dimensions' with header=1 (row 2 in Excel)
file_path = 'c:/Users/shubh/Downloads/Dimentions Audit Authenticator/DimensionsMasterLatest.xlsx'
df = pd.read_excel(file_path, sheet_name='Billing Dimensions', header=1)

print("ALL HEADERS:")
print(list(df.columns))

print("\n--- Row 0 Values ---")
row0 = df.iloc[0]
for col in df.columns:
    print(f"{col}: {row0[col]}")
