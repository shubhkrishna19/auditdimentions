# Catalyst Slate Debugging Guide

## Current Status
✅ **Vercel Build**: Working perfectly - all data displays correctly
❌ **Catalyst Slate**: Deployed, needs verification

---

## How to Debug Catalyst Slate Deployment

### Step 1: Open Zoho Widget with DevTools

1. Open Zoho CRM
2. Open the Dimensions Audit widget
3. Press **F12** to open DevTools
4. Go to **Console** tab
5. Look for `[ZohoAPI]` logs

---

## Expected Console Logs (If Working)

### Initialization Logs:
```
[ZohoAPI] ZOHO SDK found, initializing...
[ZohoAPI] ZOHO SDK Initialized successfully
```

### Data Fetch Logs:
```
[ZohoAPI] Fetching products from CRM...
[ZohoAPI] Raw parent data keys: ["id", "Name", "Product_MTP_Name", "Product_Category", "Weight_Category_Billed", "Live_Status", "Billed_Physical_Weight", "Total_Weight", "MTP_Box_Dimensions"]
[ZohoAPI] Parent 0 sample: {id: "...", Name: "DC-CLV", Product_Category: "Furniture", Weight_Category_Billed: "50kg", Live_Status: "Y"}
[ZohoAPI] Fetched X parents, Y children
[ZohoAPI] Processed products count: Z
```

---

## Diagnostic Checklist

### ✅ Check 1: SDK Initialization
**Look for**: `[ZohoAPI] ZOHO SDK found, initializing...`

- ✅ **If present**: SDK loaded successfully
- ❌ **If missing**: SDK script not loaded or blocked
  - **Fix**: Check if `https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js` is blocked
  - Check Network tab for failed requests

### ✅ Check 2: Field Names
**Look for**: `[ZohoAPI] Raw parent data keys: [...]`

This shows the EXACT field names returned by Zoho CRM.

**Compare with expected fields**:
- `Product_Category` - Product category
- `Weight_Category_Billed` - Shipment category
- `Live_Status` - Live status (Y/NL)
- `Billed_Physical_Weight` - Billed weight
- `Total_Weight` - Fallback weight
- `Product_MTP_Name` - Product name

**If field names are different**: Update [src/services/ZohoAPI.js](src/services/ZohoAPI.js) line 111-117 mapping

### ✅ Check 3: Sample Data
**Look for**: `[ZohoAPI] Parent 0 sample: {...}`

This shows the actual values in the first product.

**Check if values are null**:
```javascript
{
  Product_Category: null,      // ❌ Category not set in CRM
  Weight_Category_Billed: null, // ❌ Shipment cat not set in CRM
  Live_Status: "Y"              // ✅ Live status is set
}
```

**If values are null**: The CRM fields are empty, not a code issue!

### ✅ Check 4: Processed Count
**Look for**: `[ZohoAPI] Processed products count: 615`

- ✅ **If count matches CRM**: Data fetched successfully
- ❌ **If count is 0**: Fetching failed
  - Check permissions in Zoho CRM
  - Check API scopes in widget settings

---

## Common Issues & Solutions

### Issue 1: No Logs Appear ❌
**Symptom**: Console is empty, no `[ZohoAPI]` logs

**Cause**: SDK not initialized or script blocked

**Fix**:
1. Check Network tab for `ZohoEmbededAppSDK.min.js`
2. If blocked by CSP, headers not applied
3. Verify widget settings in Zoho CRM

### Issue 2: Fields Show Null/Dash ❌
**Symptom**: Logs show `Product_Category: null`

**Cause**: CRM fields are empty (not a code issue!)

**Fix**:
1. Open a product in Zoho CRM manually
2. Check if `Product Category` field has a value
3. If empty, populate it in CRM
4. If field doesn't exist, create it in CRM Setup

### Issue 3: Field Name Mismatch ❌
**Symptom**: Logs show different field names like `Category` instead of `Product_Category`

**Cause**: Zoho CRM field API name is different

**Fix**: Update `src/services/ZohoAPI.js` mapping:

**Current (line 111-117)**:
```javascript
productCategory: p.Product_Category || null,
weightCategory: p.Weight_Category_Billed || null,
liveStatus: p.Live_Status || null,
```

**Change to match actual API names**:
```javascript
productCategory: p.Category || null,  // Use actual field name from logs
weightCategory: p.Weight_Cat || null,  // Use actual field name from logs
liveStatus: p.Status || null,          // Use actual field name from logs
```

### Issue 4: Permissions Error ❌
**Symptom**: Console shows "Permission denied" or "Access denied"

**Cause**: Widget doesn't have CRM read permissions

**Fix**:
1. Go to Zoho CRM → Setup → Developer Space → Widgets
2. Edit the widget
3. Add scopes:
   - `ZohoCRM.modules.Parent_MTP_SKU.READ`
   - `ZohoCRM.modules.Products.READ`
4. Reinstall the widget

---

## Success Criteria

After checking logs, you should see:

✅ **SDK initialized** successfully
✅ **Field names** match the code mapping
✅ **Sample data** shows actual values (not nulls)
✅ **Product count** matches CRM
✅ **Category column** shows "Furniture", "Table", etc.
✅ **Shipment Cat column** shows "50kg", "20kg", etc.
✅ **Live Status column** shows "Y" or "NL"

---

## Quick Copy-Paste for Console

Run this in the browser console to see processed products:

```javascript
// Get products from React state (only works if app loaded)
// Check React DevTools → Components → DataContext → products
```

---

## Next Steps

1. **Open Zoho Widget** with F12 DevTools
2. **Copy ALL console logs** that start with `[ZohoAPI]`
3. **Share logs** to identify the issue
4. **If field names differ**: Update the mapping in ZohoAPI.js
5. **If values are null**: Populate CRM fields manually

---

## Files Modified for Debugging

- ✅ [src/services/ZohoAPI.js](src/services/ZohoAPI.js) - Added diagnostic console.log statements
- ✅ All changes pushed to GitHub (commit `605e4a5`)
- ✅ Slate should auto-deploy within 2 minutes

---

## Contact Information for Next AI

If you're debugging this:
1. Read this file first
2. Check the console logs
3. Compare field names from logs with code mapping
4. Fix the mapping if different
5. Test in Vercel first (mock mode) before Catalyst (live mode)

Good luck! 🚀
