# Dimension Import Guide

## 🎯 One-Time Dimension Import

Import Length, Width, Height for all products from Excel.

---

## 📊 Prepare Your Excel File

**Format:**
```
Product_Code | Length | Width | Height
-------------|--------|-------|--------
PROD001      | 10.5   | 5.2   | 3.1
PROD002      | 12.0   | 6.0   | 4.5
```

**Requirements:**
- Column 1: Product_Code (must match existing products)
- Column 2: Length (decimal)
- Column 3: Width (decimal)
- Column 4: Height (decimal)

---

## 🚀 Import Steps

### Step 1: Prepare Excel
1. Open your dimension Excel file
2. Ensure Product_Code matches CRM products exactly
3. Save as `.csv` or `.xlsx`

### Step 2: Import to Zoho CRM

1. **Go to:** Products module
2. **Click:** ⋮ (three dots) → **Import**
3. **Upload:** Your Excel file
4. **Map Columns:**
   - Product_Code → Product Code (or Product Name)
   - Length → Length
   - Width → Width
   - Height → Height
5. **Import Settings:**
   - **Action:** Update existing records
   - **Match by:** Product Code
6. **Click:** Import

### Step 3: Verify

1. Open a few Product records
2. Check Length, Width, Height are populated
3. All done! ✅

---

## ⚠️ Important Notes

- This is a **one-time import**
- Dimensions won't change after this
- Make sure Product_Code matches exactly
- Backup your data before importing

---

**After import:** Dimensions are ready for weight audit tool!
