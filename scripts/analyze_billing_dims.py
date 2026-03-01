import pandas as pd

# Load the Excel file
file_path = 'c:/Users/shubh/Downloads/Dimentions Audit Authenticator/DimensionsMasterLatest.xlsx'
xl = pd.ExcelFile(file_path)

# Load 'Billing Dimensions' sheet
df = xl.parse('Billing Dimensions')

# Print columns to identify weight fields
print("Columns in 'Billing Dimensions':")
for col in df.columns:
    print(f"- {col}")

# Display first 5 rows to see data examples
print("\nFirst 5 rows:")
print(df.head().to_string())

# Check if there are any other relevant sheets or hidden logic (volumetric divisor usually 5000)
print("\nChecking for common weight patterns in columns...")
weight_cols = [col for col in df.columns if 'weight' in str(col).lower() or 'kg' in str(col).lower()]
print(f"Weight-related columns found: {weight_cols}")

dim_cols = [col for col in df.columns if 'length' in str(col).lower() or 'width' in str(col).lower() or 'height' in str(col).lower() or 'dim' in str(col).lower()]
print(f"Dimension-related columns found: {dim_cols}")
