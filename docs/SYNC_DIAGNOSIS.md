# 🔍 SYNC DIAGNOSIS & TROUBLESHOOTING GUIDE

**Issue:** Data shows as "saved" but not visible in Zoho CRM  
**Date:** 2026-02-03  
**Priority:** CRITICAL

---

## 🎯 Current State Analysis

### **What You Reported:**
1. ❌ Click "Save" → Shows saved → Data NOT in Zoho
2. ❌ Restore button not visible
3. ❌ Synced data not showing in Parent MTP SKU cards
4. ⏳ Zoho needs to be SSOT (Single Source of Truth)

### **Most Likely Causes (In Order):**

1. **❌ App not running as Zoho Widget**
   - Running standalone = No Zoho SDK access
   - ZOHO.CRM.API calls will fail
   - Need to install as Zoho CRM widget

2. **❌ Fields not created in Zoho CRM**
   - Custom fields must be created manually first
   - See: `IMMEDIATE_ACTION_CHECKLIST.md`

3. **❌ Field API Names mismatch**
   - Our code uses: `Billed_Physical_Weight`
   - Zoho might have created: `Decimal_1`

4. **❌ Fields not on Page Layout**
   - Fields exist but hidden from card view
   - Need to add to layout

---

## ✅ DIAGNOSTIC CHECKLIST (Do These IN ORDER)

### **STEP 1: Verify App Installation**

**Question:** Is the app running inside Zoho CRM or standalone?

**Check:**
```
Current URL = http://localhost:5173 → ❌ STANDALONE (won't work!)
Current URL = https://crm.zoho.com/... → ✅ ZOHO WIDGET (good!)
```

**Fix if Standalone:**
1. Build the app: `npm run build`
2. Upload `dist/` folder to Zoho → Settings → Developer Space → Extensions
3. Install as widget in Zoho CRM
4. Open widget from within Zoho

---

### **STEP 2: Verify Zoho SDK Initialization**

**Open Browser Console (F12) and check for:**

✅ **Good:**
```
[ZohoSync] SDK initialized
[BulkUpload] Loaded 319 products
```

❌ **Bad:**
```
ZOHO is not defined
Cannot read property 'CRM' of undefined
```

**If you see errors:** App is not in Zoho context!

---

### **STEP 3: Verify Field Creation in Zoho**

**Do this manually:**

1. Open Zoho CRM
2. Go to: **Setup (⚙️) → Customization → Modules → Parent_MTP_SKU → Fields**
3. **Toggle "Show API Names"**
4. **Check if these exist:**

| Field Label | Expected API Name | Exists? |
|-------------|-------------------|---------|
| Billed Physical Weight | `Billed_Physical_Weight` | ☐ |
| Billed Volumetric Weight | `Billed_Volumetric_Weight` | ☐ |
| Billed Chargeable Weight | `Billed_Chargeable_Weight` | ☐ |
| BOM Weight | `BOM_Weight` | ☐ |
| Weight Category Billed | `Weight_Category_Billed` | ☐ |
| Processing Status | `Processing_Status` | ☐ |
| Bill Dimension Weight | `Bill_Dimension_Weight` | ☐ (subform) |

**If ANY are missing:** Create them! (See `IMMEDIATE_ACTION_CHECKLIST.md`)

---

### **STEP 4: Verify Field API Names Match**

**If fields exist but have DIFFERENT API names:**

Example:
- You created: "Billed Physical Weight"
- Zoho assigned: `Decimal_1` (not `Billed_Physical_Weight`)

**Fix:**
1. In Zoho → Setup → Fields → Edit each field
2. Change API Name to match our code
3. OR update our `field_mappings.json` with actual names

---

### **STEP 5: Verify Fields on Page Layout**

**Even if fields exist, they might be hidden!**

1. Go to: **Setup → Customization → Modules → Parent_MTP_SKU → Layouts**
2. Click **"Edit Standard Layout"**
3. Check **"Available Fields"** panel on right
4. **Drag our weight fields** to the layout (e.g., "Product Details" section)
5. **Click Save**

**If fields were in "Available Fields" (not on layout):**
- They existed in CRM
- But weren't showing on product cards
- This is why you couldn't see data!

---

### **STEP 6: Test with Single Product**

**Run this in browser console (inside Zoho widget):**

```javascript
// Test if ZOHO SDK works
console.log('ZOHO object:', typeof ZOHO);

// Test search
ZOHO.CRM.API.searchRecord({
    Entity: "Parent_MTP_SKU",
    Type: "criteria",
    Query: "(Product_Code:equals:WA-PYS-N)"
}).then(response => {
    console.log('Search result:', response);
    
    if (response.data && response.data.length > 0) {
        console.log('✅ Product found!');
        console.log('Current weight:', response.data[0].Billed_Physical_Weight);
    } else {
        console.log('❌ Product not found');
    }
});
```

**Expected:**
- `ZOHO object: object` ✅
- `Product found!` ✅
- `Current weight: null` (if not synced yet)

**If errors:** SDK not initialized or app not in Zoho context

---

### **STEP 7: Test Sync with console.log**

**Check if sync is actually running:**

Look for these console messages during sync:

```
[ZohoSync] Starting sync for 319 products
[ZohoSync] ✅ Transaction Manager initialized
[Checkpoint] Creating backup for WA-PYS-N...
[Checkpoint] ✅ Created: CHK_xxx
[ZohoSync] Processing 32 batches...
```

**If you don't see these:** Sync isn't running!

**If you see errors like:**
```
Field 'Billed_Physical_Weight' doesn't exist
```
→ Fields not created in Zoho

---

### **STEP 8: Check Actual API Response**

**Add this logging to ZohoSyncService.js temporarily:**

```javascript
// In updateProduct method, add:
console.log('[DEBUG] Sending to Zoho:', updateData);

const response = await ZOHO.CRM.API.updateRecord({...});

console.log('[DEBUG] Zoho response:', response);
```

**Check response:**

✅ **Success:**
```json
{
  "data": [{
    "code": "SUCCESS",
    "details": { "id": "abc123" }
  }]
}
```

❌ **Failure:**
```json
{
  "data": [{
    "code": "INVALID_DATA",
    "message": "invalid data",
    "details": {
      "api_name": "Billed_Physical_Weight",
      "message": "field doesn't exist"
    }
  }]
}
```

---

## 🔧 MOST LIKELY FIX

Based on symptoms, **90% chance it's one of these:**

### **Fix #1: Install App as Zoho Widget**

**If running standalone (localhost:5173):**

```bash
# Build the app
npm run build

# Zip the dist folder
# Upload to Zoho CRM
# Install as widget
```

### **Fix #2: Create Fields in Zoho**

**Follow:** `IMMEDIATE_ACTION_CHECKLIST.md`

Create all 7 fields manually in Zoho CRM.

### **Fix #3: Add Fields to Layout**

**After creating fields:**
1. Setup → Layouts → Parent_MTP_SKU
2. Edit Standard Layout
3. Drag fields from "Available" to layout
4. Save

---

## 🎯 Quick Test Script

**Run this diagnostic in browser console:**

```javascript
async function diagnose() {
    console.log('🔍 ZOHO SYNC DIAGNOSTIC');
    console.log('='.repeat(60));
    
    // 1. Check ZOHO object
    if (typeof ZOHO === 'undefined') {
        console.log('❌ ZOHO SDK not found - App not in Zoho context!');
        console.log('   → Build and upload to Zoho as widget');
        return;
    }
    console.log('✅ ZOHO SDK found');
    
    // 2. Check SDK initialization
    try {
        await new Promise((resolve) => {
            ZOHO.embeddedApp.on("PageLoad", resolve);
            ZOHO.embeddedApp.init();
        });
        console.log('✅ ZOHO SDK initialized');
    } catch (e) {
        console.log('❌ SDK init failed:', e);
        return;
    }
    
    // 3. Check field existence
    try {
        const meta = await ZOHO.CRM.META.getFields({ Entity: "Parent_MTP_SKU" });
        const fields = meta.fields.map(f => f.api_name);
        
        const REQUIRED = [
            'Billed_Physical_Weight',
            'Billed_Volumetric_Weight',
            'BOM_Weight',
            'Bill_Dimension_Weight'
        ];
        
        const missing = REQUIRED.filter(f => !fields.includes(f));
        
        if (missing.length > 0) {
            console.log('❌ Missing fields:', missing);
            console.log('   → Create these in Zoho Setup');
        } else {
            console.log('✅ All required fields exist');
        }
    } catch (e) {
        console.log('❌ Field check failed:', e);
    }
    
    // 4. Test product search
    try {
        const result = await ZOHO.CRM.API.searchRecord({
            Entity: "Parent_MTP_SKU",
            Type: "criteria",
            Query: "(Product_Code:equals:WA-PYS-N)"
        });
        
        if (result.data && result.data.length > 0) {
            console.log('✅ Product search works');
            console.log('   Sample product:', result.data[0].Product_Code);
            console.log('   Current weight:', result.data[0].Billed_Physical_Weight || '(empty)');
        } else {
            console.log('⚠️ Product WA-PYS-N not found');
        }
    } catch (e) {
        console.log('❌ Search failed:', e);
    }
    
    console.log('='.repeat(60));
    console.log('Diagnostic complete!');
}

diagnose();
```

---

## 📊 Next Steps Based on Results

### **If "ZOHO SDK not found":**
→ **Build and upload app to Zoho**
→ Install as CRM widget
→ Open from within Zoho

### **If "Missing fields":**
→ **Create fields in Zoho** (IMMEDIATE_ACTION_CHECKLIST.md)
→ Add to Page Layout
→ Re-run diagnostic

### **If "All checks pass":**
→ **Try syncing 1 product**
→ **Check product card in Zoho**
→ **If still not visible:** Check Page Layout

---

## 🆘 Still Not Working?

**Provide me with:**
1. URL you're accessing app from
2. Console output from diagnostic script
3. Screenshot of Zoho Fields page (API names visible)
4. Screenshot of product card in Zoho

I'll debug further!

---

**Run the diagnostic script above and tell me what you see!** 🔍
