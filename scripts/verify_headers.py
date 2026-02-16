import pandas as pd

# Load 'Billing Dimensions' with header=1 (row 2 in Excel)
file_path = 'c:/Users/shubh/Downloads/Dimentions Audit Authenticator/DimensionsMasterLatest.xlsx'
df = pd.read_excel(file_path, sheet_name='Billing Dimensions', header=1)

print("Headers found (Row 1):")
for i, col in enumerate(df.columns):
    print(f"{i}: {col}")

print("\n--- Sample Data (First 3 rows) ---")
# Print selected columns to check data types
print(df.head(3).to_string())
