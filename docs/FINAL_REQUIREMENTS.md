# 🎯 COMPLETE REQUIREMENTS - AUDIT DIMENSIONS APP

## ✅ FINALIZED UNDERSTANDING

### **Parent-Child Product Relationship**
- **Parent (MTP SKU):** Colorless design template - NOT sold, used for internal reference
- **Child (Product):** Finished colored products - SOLD online
- **Relationship:** 1 Parent → Multiple Children | 1 Child → 1 Parent
- **Weight Logic:** Parent weight ≈ Child weight (same, with negligible variance due to finishing materials)
- **NO Weight Aggregation:** Parent weight is NOT sum of children

### **Weight Categories (Courier Brackets)**
Universal for all couriers:
```
0-5kg, 5-10kg, 10-20kg, 20-50kg, 50-100kg, 100-500kg
```
**Optimization Strategy:** If actual = 5.2kg → Set billed = 5.0kg to fall into 5kg bracket

### **Weight Types (All 4 Must Be Visible)**
1. **Physical Weight:** Sum of box weights (grams → kg)
2. **Volumetric Weight:** `(L×W×H) / 5000` per box, summed
3. **Chargeable Weight:** `MAX(Physical, Volumetric)`
4. **BOM/Theoretical Weight:** From design team calculations (Column S)

### **Zoho CRM Field Structure (From Screenshot)**
**Subform:** "MTP Box Dimensions" (same for Products and Parent_MTP_SKU modules)
- Fields visible: Width, Height, Weight Measurement, Weight
- Missing from screenshot: Length, Box Number (likely exist)
- **Need to verify exact API names via code inspection**

---

## 🎨 UI/UX REQUIREMENTS

### **Main Grid - Columns to Show:**
```
1. MTP SKU Name
2. Product Code (clickable → opens Zoho record)
3. Type (Parent/Child badge)
4. Physical Weight (kg)
5. Volumetric Weight (kg)
6. BOM Weight (kg)
7. Chargeable Weight (kg) ← Highlighted as primary billing weight
8. Audit Status
9. ✏️ Audit Button
```

### **Expanded Row (Dropdown):**
Show box dimensions in table format (like audit modal):
```
| Box | Length (cm) | Width (cm) | Height (cm) | Weight (kg) | Vol. Weight (kg) |
|-----|-------------|------------|-------------|-------------|------------------|
|  1  |     30      |     20     |     15      |    1.2      |      1.8         |
|  2  |     25      |     15     |     10      |    0.8      |      0.75        |
Total: 2.0 kg physical | 2.55 kg volumetric | 2.55 kg chargeable
```

### **Audit Modal Enhancements:**
- Show current billed dimensions pre-filled (read-only labels above inputs)
- Real-time variance display as user types:
  ```
  Billed Weight: 5.0kg
  Audited Weight: 5.2kg (as you type)
  Difference: +0.2kg (+4%) ← Red if higher, green if lower
  ```
- No "Copy from Billed" button
- No manual BOM entry

### **Audit History:**
- Implementation: Long Text field in Zoho (`Audit_History_Log`)
- UI: "📋 History" button next to dimensions
- Format:
  ```
  [2024-02-02 18:30] Audited by UserName
  Physical: 5.0kg → 5.2kg (+0.2kg)
  Volumetric: 4.8kg → 5.1kg (+0.3kg)
  Chargeable: 5.0kg → 5.2kg (+0.2kg)
  ---
  [2024-01-15 10:20] Audited by UserName
  ...
  ```

### **New Tab: "Weight Optimizer"**
- Shows products with optimization opportunities
- Displays:
  - Current chargeable weight
  - Current bracket
  - Next lower bracket
  - Required adjustment per box
  - Potential savings indicator
- Actions:
  - Calculate optimal dimensions
  - Apply adjustments to billed dimensions
  - Flag for production team

---

## 📊 DATA PROCESSING LOGIC

### **1. Bulk Upload - Billing Dimensions Excel**
**Source:** DimensionsMasterLatest.xlsx → "Billing Dimensions" sheet

**Process:**
```javascript
For each row (SKU in Column A):
  1. Read: Boxes (C-N), Weights (F,J,N), BOM (S), Status (T)
  2. Calculate:
     - Volumetric = Sum((L×W×H)/5000 per box)
     - Physical = Sum(box weights) / 1000
     - Chargeable = MAX(Volumetric, Physical)
  3. Zoho Action:
     - IF SKU exists: UPDATE billed dimensions (OVERWRITE)
     - IF SKU new: CREATE product record
     - UPDATE parent status (Column T value)
  4. Log: "Updated SKU-123: 5.0kg → 5.2kg"
```

**Output:** Summary report in app
- ✅ Updated: 245 products
- ➕ Created: 5 new products
- ⚠️ Skipped: 2 (errors)

### **2. Audit Upload - Audit Dimensions Excel**
**Source:** Latest audit file

**Process:**
```javascript
For each row (SKU):
  1. Read audited dimensions
  2. Calculate audited weights (all 4 types)
  3. Compare with billed (stored in Zoho)
  4. Show variances in grid
  5. DO NOT auto-update Zoho (manual save only)
  6. When user clicks "Sync to ZOHO":
     - Update audit fields (NOT billed)
     - Append to Audit_History_Log
     - Trigger parent status recalculation
```

### **3. Parent-Child Linking**
**Source:** SKU Aliases, Parent & Child Master Data (1).xlsx

**Implementation:**
```javascript
1. Load master data into memory
2. For each child SKU:
   - Lookup parent MTP SKU from master
   - Set Parent_MTP_SKU lookup field in Zoho
3. For each parent:
   - List all children (display only, no aggregation)
   - Status inherited from any child audit
```

### **4. Weight Optimization Calculator**
**Input:** Audited chargeable weight (e.g., 5.2kg)
**Logic:**
```javascript
function optimizeWeight(chargeableWeight) {
  const brackets = [5, 10, 20, 50, 100, 500];
  const currentBracket = brackets.find(b => chargeableWeight <= b);
  const targetBracket = currentBracket; // Stay in same bracket
  
  if (chargeableWeight > targetBracket) {
    // Need to reduce
    const reduction = chargeableWeight - targetBracket;
    return {
      action: 'REDUCE',
      amount: reduction,
      suggestion: `Remove ${reduction.toFixed(2)}kg to fit ${targetBracket}kg bracket`
    };
  }
  
  return { action: 'OK', message: 'Already optimized' };
}
```

**UI Display:**
```
Product: ABC-123
Current Weight: 5.2kg (Bracket: 10kg)
Opportunity: Reduce by 0.2kg → Move to 5kg bracket
Estimated Savings: ₹XX per shipment
```

---

## 🔧 ZOHO FIELD MAPPING (To Be Verified)

Based on screenshot + existing code:

### **Subform: `Bill_Dimension_Weight` (Billing) or `MTP_Box_Dimensions`?**
```javascript
{
  Box_Number: 1,
  Length: 30,        // cm
  Width: 20,         // cm  
  Height: 15,        // cm
  Weight_Measurement: 'kg',
  Weight: 1.2
}
```

### **Main Product Fields:**
```javascript
{
  Product_Code: 'ABC-123',                    // SKU
  Parent_MTP_SKU: { id: 'xxx', name: 'MTP-ABC' }, // Lookup
  
  // Billed weights (from Billing Dimensions Excel)
  Billed_Physical_Weight: 5.0,
  Billed_Volumetric_Weight: 4.8,
  Billed_Chargeable_Weight: 5.0,
  BOM_Weight: 4.9,
  
  // Audited weights (from audit upload)
  Audited_Physical_Weight: 5.2,
  Audited_Volumetric_Weight: 5.1,
  Audited_Chargeable_Weight: 5.2,
  
  // History
  Audit_History_Log: '[2024-02-02]...',
  
  // Status
  Processing_Status: 'Dimensions Verified'  // One of 6 values
}
```

---

## 🚀 IMPLEMENTATION PHASES

### **Phase 1: Data Population (PRIORITY)**
1. Inspect Zoho schema (fetch sample record to get exact field names)
2. Build bulk upload script for Billing Dimensions
3. Test with 5 products
4. Run full population (250+ products)
5. Verify in Zoho CRM

### **Phase 2: UI Enhancement**
1. Add weight columns to main grid
2. Enhance expanded row with box table
3. Update Audit Modal with variance display
4. Add History button + modal

### **Phase 3: Weight Optimizer**
1. Create new "Optimizer" tab
2. Build optimization algorithm
3. Add adjustment UI
4. Implement save to billed dimensions

### **Phase 4: Parent-Child Linking**
1. Parse master data file
2. Update lookup relationships
3. Add parent status sync logic

---

## ❓ REMAINING TECHNICAL QUESTIONS

1. **Exact Zoho Field API Names**
   - Need to fetch a sample product record to get precise names
   - Will run: `ZohoAPI.fetchProducts(1)` and inspect response

2. **Column R Formula Clarification**
   - Excel shows `=MAX(Q4,O4)` (grams vs cubic meters)
   - Should I ignore and calculate fresh: `MAX(volumetric_kg, physical_kg)`?
   - **User Answer Needed**

3. **BOM Weight Units in Audit Sheet**
   - Billing sheet Column S: 4800 (grams)
   - Audit sheet Column S: 122.4 (kg or grams?)
   - **User Answer Needed**

---

**Next Immediate Action:** Fetch Zoho product structure to get exact field names, then build population script!
