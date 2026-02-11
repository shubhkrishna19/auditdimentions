# Zoho CRM Data Correction Guide

## Overview
This guide provides all the information needed to fix the Category/Weight field swap issue in the Zoho CRM database at the source.

---

## Problem Statement

**Current Issue:**
- Some records have weight values (e.g., "50kg", "20kg") in the `Product_Category` field
- The `Weight_Category_Billed` field is empty for these records
- This causes incorrect display in the UI where Category column shows "50kg" instead of "Furniture"

**Goal:**
- Move weight values from `Product_Category` to `Weight_Category_Billed`
- Ensure `Product_Category` contains actual product categories (Furniture, Table, Bookshelf, etc.)
- Ensure `Weight_Category_Billed` contains weight categories (50kg, 20kg, 10kg, 5kg, etc.)

---

## Zoho CRM Field API Names

### Parent_MTP_SKU Module

| Display Name | API Name | Data Type | Example Values |
|--------------|----------|-----------|----------------|
| MTP SKU Code | `Name` | Text | "DC-CLV", "MTP-1001" |
| Product Name | `Product_MTP_Name` | Text | "Dining Chair - Classic" |
| Product Category | `Product_Category` | Text/Picklist | "Furniture", "Table", "Bookshelf" |
| Weight Category | `Weight_Category_Billed` | Text/Picklist | "50kg", "20kg", "10kg", "5kg" |
| Billed Physical Weight | `Billed_Physical_Weight` | Number | 45.5 (in KG) |
| Billed Chargeable Weight | `Billed_Chargeable_Weight` | Number | 50.0 (in KG) |
| Live Status | `Live_Status` | Text | "Y" or "NL" |
| Box Dimensions (Subform) | `MTP_Box_Dimensions` | Subform | Array of box records |

**MTP_Box_Dimensions Subform Fields:**
- `Box` - Box number (Text: "1", "2", "3")
- `Length` - Length in cm (Number)
- `Width` - Width in cm (Number)
- `Height` - Height in cm (Number)
- `Weight` - Weight in KG (Number)
- `Box_Measurement` - Unit (Text: "cm")
- `Weight_Measurement` - Unit (Text: "kg")

### Products Module (Children)

| Display Name | API Name | Data Type | Example Values |
|--------------|----------|-----------|----------------|
| Product Code | `Product_Code` | Text | "DC-CLV-A", "MTP-1001-RED" |
| Product Name | `Product_Name` | Text | "Dining Chair - Classic - Variant A" |
| Product Category | `Product_Category` | Text/Picklist | "Furniture", "Table" |
| Weight Category | `Weight_Category_Billed` | Text/Picklist | "50kg", "20kg" |
| Total Weight | `Total_Weight` | Number | 45.5 (in KG) |
| Last Audited Weight | `Last_Audited_Total_Weight_kg` | Number | 44.2 (in KG) |
| Parent MTP SKU | `MTP_SKU` | Lookup | Reference to Parent_MTP_SKU record |
| Live Status | `Live_Status` | Text | "Y" or "NL" |
| Bill Dimensions (Subform) | `Bill_Dimension_Weight` | Subform | Array of box records |

**Bill_Dimension_Weight Subform Fields:**
- `BL` - Box label (Text: "1", "2", "3")
- `Length` - Length in cm (Number)
- `Width` - Width in cm (Number)
- `Height` - Height in cm (Number)
- `Weight` - Weight in KG (Number)
- `Box_Measurement` - Unit (Text: "cm")
- `Weight_Measurement` - Unit (Text: "kg")

---

## Data Correction Strategy

### Step 1: Identify Affected Records

**Detection Pattern:**
Records where `Product_Category` matches the pattern: `^\d+\s*kg$` (e.g., "50kg", "20kg", "100kg")

**Query for Parent_MTP_SKU:**
```javascript
// Using Zoho CRM API
const affectedParents = await ZOHO.CRM.API.searchRecord({
    Entity: "Parent_MTP_SKU",
    Type: "criteria",
    Query: "(Product_Category:equals:50kg) OR (Product_Category:equals:20kg) OR (Product_Category:equals:10kg) OR (Product_Category:equals:5kg) OR (Product_Category:equals:100kg)"
});
```

**Query for Products:**
```javascript
const affectedChildren = await ZOHO.CRM.API.searchRecord({
    Entity: "Products",
    Type: "criteria",
    Query: "(Product_Category:equals:50kg) OR (Product_Category:equals:20kg) OR (Product_Category:equals:10kg) OR (Product_Category:equals:5kg) OR (Product_Category:equals:100kg)"
});
```

### Step 2: Correction Logic

**For Each Affected Record:**

```javascript
// Pseudocode
if (record.Product_Category matches /^\d+\s*kg$/i) {
    // This is a weight value in the wrong field
    
    if (!record.Weight_Category_Billed || record.Weight_Category_Billed === '-') {
        // Weight category is empty, safe to swap
        
        UPDATE record SET {
            Weight_Category_Billed: record.Product_Category,  // Move "50kg" here
            Product_Category: null                             // Clear the wrong field
        }
    }
}
```

### Step 3: Bulk Update Script

**Using Zoho CRM API (Client-Side SDK):**

```javascript
async function fixCategorySwap(module) {
    console.log(`[DataFix] Starting correction for ${module}...`);
    
    // Fetch all records (with pagination)
    let allRecords = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
        const response = await ZOHO.CRM.API.getAllRecords({
            Entity: module,
            sort_order: "asc",
            per_page: 200,
            page: page
        });
        
        if (response.data && response.data.length > 0) {
            allRecords = allRecords.concat(response.data);
            page++;
            if (response.data.length < 200) hasMore = false;
        } else {
            hasMore = false;
        }
    }
    
    console.log(`[DataFix] Fetched ${allRecords.length} records`);
    
    // Identify affected records
    const affectedRecords = allRecords.filter(record => {
        const productCat = record.Product_Category?.toString().trim() || '';
        const weightCat = record.Weight_Category_Billed?.toString().trim() || '';
        
        // Check if Product_Category looks like a weight
        const isWeight = /^\d+\s*kg$/i.test(productCat);
        
        // And Weight_Category is empty
        const weightIsEmpty = !weightCat || weightCat === '-';
        
        return isWeight && weightIsEmpty;
    });
    
    console.log(`[DataFix] Found ${affectedRecords.length} records to fix`);
    
    // Update records in batches of 100 (Zoho API limit)
    const batchSize = 100;
    let fixed = 0;
    
    for (let i = 0; i < affectedRecords.length; i += batchSize) {
        const batch = affectedRecords.slice(i, i + batchSize);
        
        const updates = batch.map(record => ({
            id: record.id,
            Weight_Category_Billed: record.Product_Category,  // Swap
            Product_Category: null                             // Clear
        }));
        
        try {
            const result = await ZOHO.CRM.API.updateRecord({
                Entity: module,
                APIData: updates,
                Trigger: ["workflow"]  // Trigger workflows if needed
            });
            
            fixed += batch.length;
            console.log(`[DataFix] Updated batch ${Math.floor(i/batchSize) + 1}, Total: ${fixed}/${affectedRecords.length}`);
        } catch (error) {
            console.error(`[DataFix] Batch update failed:`, error);
        }
    }
    
    console.log(`[DataFix] Completed! Fixed ${fixed} records in ${module}`);
    return { total: allRecords.length, affected: affectedRecords.length, fixed };
}

// Run for both modules
async function fixAllData() {
    const parentResult = await fixCategorySwap("Parent_MTP_SKU");
    const childResult = await fixCategorySwap("Products");
    
    console.log("=== Data Correction Summary ===");
    console.log("Parent_MTP_SKU:", parentResult);
    console.log("Products:", childResult);
}

// Execute
fixAllData();
```

---

## Alternative: Using Zoho Deluge (Server-Side)

If you prefer server-side execution (safer for large datasets):

```deluge
// Deluge Script for Zoho CRM Function

// Get all Parent_MTP_SKU records
parentRecords = zoho.crm.getRecords("Parent_MTP_SKU", 1, 200);
fixedCount = 0;

for each record in parentRecords {
    productCat = record.get("Product_Category");
    weightCat = record.get("Weight_Category_Billed");
    
    // Check if Product_Category is a weight pattern
    if (productCat != null && productCat.matches("^\\d+\\s*kg$")) {
        if (weightCat == null || weightCat == "-" || weightCat == "") {
            // Swap the values
            updateMap = Map();
            updateMap.put("id", record.get("id"));
            updateMap.put("Weight_Category_Billed", productCat);
            updateMap.put("Product_Category", null);
            
            response = zoho.crm.updateRecord("Parent_MTP_SKU", record.get("id"), updateMap);
            fixedCount = fixedCount + 1;
            info "Fixed record: " + record.get("id");
        }
    }
}

info "Total records fixed: " + fixedCount;
```

---

## Verification After Correction

**Check 1: Query Corrected Records**
```javascript
// Should return 0 records
const check = await ZOHO.CRM.API.searchRecord({
    Entity: "Parent_MTP_SKU",
    Type: "criteria",
    Query: "(Product_Category:equals:50kg)"
});

console.log("Remaining issues:", check.data?.length || 0);
```

**Check 2: Sample Random Records**
```javascript
const sample = await ZOHO.CRM.API.getRecords({
    Entity: "Parent_MTP_SKU",
    per_page: 10
});

sample.data.forEach(record => {
    console.log({
        SKU: record.Name,
        Category: record.Product_Category,      // Should be "Furniture", "Table", etc.
        Weight: record.Weight_Category_Billed   // Should be "50kg", "20kg", etc.
    });
});
```

---

## Important Notes

### Data Integrity
- **Backup First**: Export all records before bulk updates
- **Test on Sandbox**: If available, test the script on a sandbox environment first
- **Batch Processing**: Process in batches of 100 to avoid API rate limits
- **Error Handling**: Log all failures for manual review

### API Rate Limits
- Zoho CRM API has rate limits (typically 5000 calls/day for free tier)
- Use batch update APIs when possible
- Add delays between batches if needed

### Field Permissions
- Ensure the user running the script has WRITE access to:
  - `Product_Category`
  - `Weight_Category_Billed`
- Check module-level and field-level permissions in Zoho CRM Settings

### Workflow Triggers
- Decide if you want to trigger workflows during bulk update
- Set `Trigger: ["workflow"]` to enable
- Set `Trigger: []` to disable (faster, but may skip business logic)

---

## Current App Behavior (Temporary Fix)

The app currently has a `cleanData()` function that automatically swaps these values **at runtime** (not in the database):

```javascript
// This runs in the browser when fetching data
const cleanData = (item) => {
    const productCat = item.productCategory?.toString().trim() || '';
    const weightCat = item.weightCategory?.toString().trim() || '';
    
    const productCatIsWeight = /^\d+\s*kg$/i.test(productCat);
    const weightCatIsProduct = weightCat && !/^\d+\s*kg$/i.test(weightCat);
    
    if (productCatIsWeight && !weightCat) {
        item.weightCategory = item.productCategory;
        item.productCategory = null;
    } else if (weightCatIsProduct && !productCat) {
        item.productCategory = item.weightCategory;
        item.weightCategory = null;
    } else if (productCatIsWeight && weightCatIsProduct) {
        const temp = item.productCategory;
        item.productCategory = item.weightCategory;
        item.weightCategory = temp;
    }
    
    return item;
};
```

**This is a TEMPORARY workaround.** The proper fix is to correct the data in Zoho CRM directly.

---

## Recommended Approach

1. **Export Data**: Download all Parent_MTP_SKU and Products records as CSV backup
2. **Run Detection Script**: Identify how many records are affected
3. **Test on 5-10 Records**: Manually verify the correction works
4. **Run Bulk Update**: Execute the full correction script
5. **Verify**: Check random samples to ensure data is correct
6. **Remove Workaround**: Once data is fixed, the `cleanData()` function can be simplified or removed

---

## Contact & Support

If you encounter issues:
- Check Zoho CRM API logs in Developer Console
- Review browser console for error messages
- Verify field API names haven't changed
- Ensure user has proper permissions

**Last Updated:** 2026-02-10
**Created By:** Antigravity AI
**For:** Claude AI (Data Correction Task)
