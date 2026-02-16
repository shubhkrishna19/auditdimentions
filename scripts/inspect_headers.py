import pandas as pd

# Load the Excel file
file_path = 'c:/Users/shubh/Downloads/Dimentions Audit Authenticator/DimensionsMasterLatest.xlsx'
xl = pd.ExcelFile(file_path)

# Load 'Billing Dimensions' sheet with no header to inspect structure
df = xl.parse('Billing Dimensions', header=None, nrows=10)

print("Raw first 10 rows to identify header row:")
print(df.to_string())
