# ✅ IMMEDIATE ACTION CHECKLIST - Fix Data Display in Zoho

## Problem
Data is being synced to Zoho but NOT showing in Product Detail pages because:
1. Custom fields don't exist yet in Zoho CRM
2. Even if they exist, they're not added to the Page Layout (hidden)

## Solution: 3 Steps (15 minutes)

---

## ⚡ STEP 1: Create Custom Fields in Zoho CRM

### Navigate to:
```
Zoho CRM → Setup (⚙️ gear icon top-right) 
→ Customization 
→ Modules and Fields
→ Parent_MTP_SKU (or your MTP module name)
→ Fields tab
→ Click "Create & Edit Fields"
```

### Create These 7 Fields:

| # | Field Label | Field Type | Options/Properties |
|---|-------------|------------|-------------------|
| 1 | **Billed Physical Weight** | Decimal | Precision: 3 decimal places |
| 2 | **Billed Volumetric Weight** | Decimal | Precision: 3 decimal places |
| 3 | **Billed Chargeable Weight** | Decimal | Precision: 3 decimal places |
| 4 | **BOM Weight** | Decimal | Precision: 3 decimal places |
| 5 | **Weight Category Billed** | Pick List | Values: `5kg`, `10kg`, `20kg`, `50kg`, `100kg`, `500kg`, `500kg+` |
| 6 | **Audit History Log** | Long Text | Allow rich text: No |
| 7 | **Processing Status** | Pick List | Values: `Y`, `N` (add more if needed) |

**💡 Pro Tip:** Create a new Section called **"Weight & Audit Details"** and place all these fields there.

---

## ⚡ STEP 2: Add Fields to Page Layout

Even if fields exist, they might be hidden from the Detail View.

### Navigate to:
```
Same location as Step 1
→ Layouts tab (next to Fields tab)
→ Edit "Standard Layout" (or whichever layout you use)
```

### Action:
1. Look for **"Unused Fields"** panel on the left side
2. Drag the 7 fields you just created into the main layout area
3. Organize them in a section called **"Weight & Audit Details"**
4. **Save Layout**

---

## ⚡ STEP 3: Verify API Names (CRITICAL)

Our sync script uses specific API names. Zoho might auto-generate different ones.

### Navigate to:
```
Same place → Fields tab → Click "API Names" (top-right toggle or button)
```

### Check These Match EXACTLY:
```
Billed_Physical_Weight
Billed_Volumetric_Weight
Billed_Chargeable_Weight
BOM_Weight
Weight_Category_Billed
Audit_History_Log
Processing_Status
```

### ⚠️ If Different:
- **Option A (Recommended):** Rename the API names in Zoho to match above
- **Option B:** Tell me the actual API names (e.g., `Decimal_1`) and I'll update the code

---

## ✅ STEP 4: Verify Subform Exists

This should already be there, but double-check:

### Field Name: `Bill Dimension Weight` (or similar)
### Type: Subform
### Columns in Subform:
- Box_Number
- Length (cm)
- Width (cm)
- Height (cm)
- Weight (kg)
- Box_Measurement
- Weight_Measurement

If missing, create it as a **Subform** field type.

---

## 🎯 AFTER COMPLETING THESE STEPS:

1. Open any Parent MTP SKU record in Zoho
2. You should now see the **"Weight & Audit Details"** section
3. The fields will be empty (until we sync data)
4. Come back and tell me "Fields created" - then we'll run the sync!

---

## 🆘 Quick Reference: Where Things Are

- **Create Fields:** Setup → Customization → Modules → Parent_MTP_SKU → Fields → Create & Edit
- **Add to Layout:** Same location → Layouts → Edit Standard Layout → Drag fields
- **Check API Names:** Same location → Fields → API Names toggle

---

## 📸 What Success Looks Like

After Step 2, when you edit a Parent MTP SKU record, you'll see:

```
┌─────────────────────────────────────────┐
│ Product Information                     │
│ Product Code: ABC-123                   │
│ Product Name: Some Product              │
├─────────────────────────────────────────┤
│ Weight & Audit Details          [Edit]  │
│ Billed Physical Weight: [empty]         │
│ Billed Volumetric Weight: [empty]       │
│ Billed Chargeable Weight: [empty]       │
│ BOM Weight: [empty]                     │
│ Weight Category: [empty]                │
│ Processing Status: [empty]              │
├─────────────────────────────────────────┤
│ Bill Dimension Weight      [+ Add Row]  │
│ (Empty table for now)                   │
└─────────────────────────────────────────┘
```

The fields will populate once we run the sync!

---

**Go do this now, then come back and say "Done" - I'll wait!** ⏳
