# 🚨 IMMEDIATE ACTION: Field Setup & Real-Time Sync

**Problem:** Fields exist in layout but no API names → Data won't sync  
**Solution:** Create fields properly + Add real-time sync to app  
**Time to Fix:** 30 minutes

---

## ⚡ PART 1: CREATE FIELDS WITH API NAMES (15 min)

### **Step 1: Verify Existing Fields**

1. **Go to Zoho CRM Setup**
2. **Navigate:** Setup → Customization → Modules and Fields
3. **Select Module:** Parent MTP SKU (or Products)
4. **Click:** "Fields" tab

### **Step 2: Check If Fields Exist**

**Look for these fields:**

| Field Label | Expected API Name | Data Type | Status |
|-------------|-------------------|-----------|--------|
| Billed Physical Weight | `Billed_Physical_Weight` | Decimal | ❓ Check |
| Billed Volumetric Weight | `Billed_Volumetric_Weight` | Decimal | ❓ Check |
| Billed Chargeable Weight | `Billed_Chargeable_Weight` | Decimal | ❓ Check |
| BOM Weight | `BOM_Weight` | Decimal | ❓ Check |
| Weight Category Billed | `Weight_Category_Billed` | Picklist | ❓ Check |
| Total Weight | `Total_Weight` | Decimal | ❓ Check |

**For each field, check:**
- ✅ Has API Name column filled
- ✅ API Name matches expected (no spaces, underscores)
- ✅ Data type is correct

---

### **Step 3: Create Missing Fields**

**If API Names are missing, CREATE NEW FIELDS:**

#### **3A. Create Weight Fields (Decimal)**

**For: Billed Physical Weight**

1. **Click:** "New Custom Field"
2. **Select Type:** Decimal Number
3. **Field Label:** Billed Physical Weight
4. **API Name:** (Auto-generates as `Billed_Physical_Weight`)
   - ⚠️ **VERIFY** it matches exactly!
5. **Decimal Places:** 2
6. **Default Value:** 0
7. **Mark as:** 
   - [ ] Mandatory ← Don't check (optional)
   - [x] Show in Standard Layout
8. **Click:** "Save"

**Repeat for:**
- Billed Volumetric Weight → `Billed_Volumetric_Weight`
- Billed Chargeable Weight → `Billed_Chargeable_Weight`
- BOM Weight → `BOM_Weight`
- Total Weight → `Total_Weight`

#### **3B. Create Weight Category (Picklist)**

1. **Click:** "New Custom Field"
2. **Select Type:** Pick List
3. **Field Label:** Weight Category Billed
4. **API Name:** `Weight_Category_Billed`
5. **Pick List Values:**
   ```
   500gm
   1kg
   2kg
   5kg
   10kg
   ```
6. **Default:** 10kg
7. **Click:** "Save"

---

### **Step 4: Add Fields to Page Layout**

1. **Setup → Customization → Modules and Fields**
2. **Select:** Parent MTP SKU
3. **Click:** "Page Layouts" → "Standard Layout"
4. **Drag and drop** all weight fields to visible section
5. **Create a new section:** "Billing Information"
6. **Add all fields**
7. **Click:** "Save"

---

### **Step 5: Verify API Names via Metadata API**

Use the test script in your app or run this curl:

```bash
curl "https://www.zohoapis.com/crm/v5/settings/fields?module=Parent_MTP_SKU" \
  -H "Authorization: Zoho-oauthtoken YOUR_ACCESS_TOKEN"
```

**✅ If you see API names → Fields are ready!**

---

## ⚡ PART 2: ADD REAL-TIME SYNC TO APP (15 min)

See `src/services/ZohoSyncService.js` for implementation details.

**Key Methods to Add:**
1. `updateProductRealtime(productData)` - Single product update
2. `updateProductsBatch(productsData)` - Batch updates (max 100)
3. Integration with Save button in UI

**Result:** Click Save → Immediately writes to Zoho → Refresh shows changes!
