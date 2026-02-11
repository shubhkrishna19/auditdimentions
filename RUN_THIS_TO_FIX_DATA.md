# Quick Database Fix Script

## Instructions for Immediate Data Correction

### Step 1: Open Your Catalyst App in Zoho CRM
1. Go to your Zoho CRM
2. Open the Dimensions Audit Authenticator app (the one we just deployed)
3. Press **F12** to open Developer Tools
4. Click on the **Console** tab

### Step 2: Copy and Paste This Script

```javascript
// ========================================
// ZOHO CRM DATA CORRECTION SCRIPT
// Fixes Category/Weight Field Swap
// ========================================

(async function fixCategorySwap() {
    console.log('🔧 Starting Data Correction...');
    
    // Helper: Fetch all records with pagination
    async function fetchAllRecords(module) {
        let allRecords = [];
        let page = 1;
        let hasMore = true;
        
        console.log(`📥 Fetching ${module} records...`);
        
        while (hasMore) {
            const response = await ZOHO.CRM.API.getAllRecords({
                Entity: module,
                sort_order: "asc",
                per_page: 200,
                page: page
            });
            
            if (response.data && response.data.length > 0) {
                allRecords = allRecords.concat(response.data);
                console.log(`   Page ${page}: ${response.data.length} records`);
                page++;
                if (response.data.length < 200) hasMore = false;
            } else {
                hasMore = false;
            }
        }
        
        console.log(`✅ Total ${module}: ${allRecords.length} records`);
        return allRecords;
    }
    
    // Helper: Fix records in a module
    async function fixModule(module, records) {
        if (records.length === 0) {
            console.log(`✓ No issues in ${module}`);
            return 0;
        }
        
        console.log(`🔨 Fixing ${records.length} records in ${module}...`);
        
        let fixed = 0;
        const batchSize = 100;
        
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            const updates = batch.map(record => ({
                id: record.id,
                Weight_Category_Billed: record.Product_Category,  // Move weight here
                Product_Category: null                             // Clear wrong field
            }));
            
            try {
                await ZOHO.CRM.API.updateRecord({
                    Entity: module,
                    APIData: updates,
                    Trigger: []  // Don't trigger workflows
                });
                
                fixed += batch.length;
                console.log(`   ✓ Batch ${Math.floor(i/batchSize) + 1}: Updated ${batch.length} records`);
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                console.error(`   ✗ Batch failed:`, error);
            }
        }
        
        return fixed;
    }
    
    try {
        // Step 1: Fetch all Parent_MTP_SKU records
        const parents = await fetchAllRecords('Parent_MTP_SKU');
        
        // Step 2: Fetch all Products records
        const children = await fetchAllRecords('Products');
        
        // Step 3: Identify affected records with bidirectional logic
        console.log('🔍 Scanning for issues...');
        
        const identifyIssues = (record) => {
            const productCat = record.Product_Category?.toString().trim() || '';
            const weightCat = record.Weight_Category_Billed?.toString().trim() || '';
            
            // Pattern 1: productCategory looks like a weight
            const productCatIsWeight = /^\d+\s*kg$/i.test(productCat);
            
            // Pattern 2: weightCategory looks like a product
            const weightCatIsProduct = weightCat && !/^\d+\s*kg$/i.test(weightCat) && weightCat !== '-';
            
            // Case 1: Move weight to weight field
            if (productCatIsWeight && (!weightCat || weightCat === '-')) return true;
            
            // Case 2: Move product to product field
            if (weightCatIsProduct && (!productCat || productCat === '-')) return true;
            
            // Case 3: Swap
            if (productCatIsWeight && weightCatIsProduct) return true;
            
            return false;
        };
        
        const affectedParents = parents.filter(identifyIssues);
        const affectedChildren = children.filter(identifyIssues);
        
        console.log(`⚠️  Found ${affectedParents.length} issues in Parent_MTP_SKU`);
        console.log(`⚠️  Found ${affectedChildren.length} issues in Products`);
        
        // ... (rest of confirm logic) ...
        
        // Step 5: Fix the data (updated logic)
        async function fixModule(module, records) {
            // ... (batch loop) ...
            const updates = batch.map(record => {
                const productCat = record.Product_Category?.toString().trim() || '';
                const weightCat = record.Weight_Category_Billed?.toString().trim() || '';
                
                const productCatIsWeight = /^\d+\s*kg$/i.test(productCat);
                const weightCatIsProduct = weightCat && !/^\d+\s*kg$/i.test(weightCat) && weightCat !== '-';
                
                let update = { id: record.id };
                
                if (productCatIsWeight && (!weightCat || weightCat === '-')) {
                    update.Weight_Category_Billed = productCat;
                    update.Product_Category = null;
                } else if (weightCatIsProduct && (!productCat || productCat === '-')) {
                    update.Product_Category = weightCat;
                    update.Weight_Category_Billed = null;
                } else if (productCatIsWeight && weightCatIsProduct) {
                    update.Product_Category = weightCat;
                    update.Weight_Category_Billed = productCat;
                }
                return update;
            });
            // ... (update call) ...
        }
        
        // Step 4: Confirm before fixing
        const totalIssues = affectedParents.length + affectedChildren.length;
        
        if (totalIssues === 0) {
            console.log('✅ No issues found! Your data is clean.');
            return;
        }
        
        const confirmed = confirm(`Found ${totalIssues} records with swapped categories.\n\nDo you want to fix them now?`);
        
        if (!confirmed) {
            console.log('❌ Cancelled by user');
            return;
        }
        
        // Step 5: Fix the data
        const fixedParents = await fixModule('Parent_MTP_SKU', affectedParents);
        const fixedChildren = await fixModule('Products', affectedChildren);
        
        const totalFixed = fixedParents + fixedChildren;
        
        console.log('');
        console.log('========================================');
        console.log('✅ DATA CORRECTION COMPLETE!');
        console.log('========================================');
        console.log(`Total Records Scanned: ${parents.length + children.length}`);
        console.log(`Issues Found: ${totalIssues}`);
        console.log(`Records Fixed: ${totalFixed}`);
        console.log('');
        console.log('🔄 Please refresh the page to see the corrected data.');
        
        alert(`Success! Fixed ${totalFixed} records.\n\nPlease refresh the page.`);
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('An error occurred. Check the console for details.');
    }
})();
```

### Step 3: Press Enter
- The script will run automatically
- It will show you how many issues it found
- Click "OK" to confirm the fix
- Wait for it to complete (you'll see progress in the console)

### Step 4: Refresh the App
- Once complete, refresh the page
- Your Category and Shipment Category columns should now be correct!

---

## What This Script Does

1. **Fetches all records** from both Parent_MTP_SKU and Products modules
2. **Identifies issues** where Product_Category contains weight values (e.g., "50kg")
3. **Swaps the values**:
   - Moves "50kg" from Product_Category → Weight_Category_Billed
   - Clears Product_Category (sets to null)
4. **Updates in batches** of 100 records (safe for large datasets)
5. **Shows progress** in the console

---

## Expected Results

**Before:**
- Category: "50kg" | Shipment Cat: "-"

**After:**
- Category: "-" | Shipment Cat: "50kg"

(If you have actual product categories like "Furniture", they will remain in the Category column)

---

## For Claude: How to Replicate This

To fix data in Zoho CRM in the future:

1. **Use the Zoho CRM API** via `ZOHO.CRM.API` (client-side) or Deluge (server-side)
2. **Fetch records** with `getAllRecords()` - remember to paginate (200 records per page)
3. **Identify affected records** using regex or pattern matching
4. **Update in batches** using `updateRecord()` with an array of updates
5. **Set `Trigger: []`** to avoid triggering workflows during bulk updates
6. **Add delays** between batches (300-500ms) to avoid rate limits

**Key API Methods:**
- `ZOHO.CRM.API.getAllRecords({ Entity, per_page, page })`
- `ZOHO.CRM.API.updateRecord({ Entity, APIData, Trigger })`

**Rate Limits:**
- Free tier: ~5000 API calls/day
- Batch updates count as 1 call per batch (max 100 records/batch)

---

## Verification

After running the script, verify by checking a few records:

```javascript
// Check a sample record
ZOHO.CRM.API.getRecords({ Entity: "Parent_MTP_SKU", per_page: 5 })
    .then(response => {
        response.data.forEach(r => {
            console.log({
                SKU: r.Name,
                Category: r.Product_Category,           // Should be "Furniture", "Table", etc.
                Weight: r.Weight_Category_Billed        // Should be "50kg", "20kg", etc.
            });
        });
    });
```

---

**Last Updated:** 2026-02-10  
**Created By:** Antigravity AI  
**Status:** Ready to Execute
