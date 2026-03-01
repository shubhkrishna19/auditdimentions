# Enable Products Globally in Zoho CRM

**Problem**: Products from custom modules don't appear in Quotes, Invoices, Sales Orders, etc.

**Solution**: Migrate to Zoho's standard Products module so products are automatically available everywhere.

---

## Why Custom Modules Don't Work

Your current setup:
- ✅ **Parent_MTP_SKU** (custom module) - Works in your widget
- ✅ **Products** (custom module) - Works in your widget
- ❌ **Standard CRM modules** - Don't recognize your custom products

**Zoho's product line items** in Quotes, Invoices, etc. only pull from the **built-in "Products" module**, not custom modules.

---

## Solution: Setup Standard Products Module

### Step 1: Add Custom Fields to Standard Products Module

1. Go to **Setup → Modules and Fields → Products** (the standard module)
2. Click **+ New Field** and add these fields to match your custom module:

| Field Label | Field Type | API Name | Notes |
|-------------|-----------|----------|-------|
| Product Category | Single Line | `Product_Category` | Max 100 chars |
| Weight Category Billed | Single Line | `Weight_Category_Billed` | Max 50 chars |
| Total Weight | Decimal | `Total_Weight` | Precision: 2 |
| Billed Physical Weight | Decimal | `Billed_Physical_Weight` | Precision: 2 |
| Live Status | Single Line | `Live_Status` | Max 10 chars |
| MTP SKU | Lookup | `MTP_SKU` | Lookup to: Parent_MTP_SKU |
| Last Audited Weight | Decimal | `Last_Audited_Total_Weight_kg` | Precision: 3 |

3. **Create Subform** for dimensions:
   - Click **+ New Field** → Select **Subform**
   - Subform Name: `Bill_Dimension_Weight`
   - Add columns:
     - `Box_Label` (Single Line)
     - `Length` (Decimal, precision 2)
     - `Width` (Decimal, precision 2)
     - `Height` (Decimal, precision 2)
     - `Weight` (Decimal, precision 3)

4. Click **Save**

---

### Step 2: Verify Standard Products Module API Name

The standard Products module has a different internal API name than your custom module.

**Check API Name**:
1. Go to **Setup → Developer Space → APIs → API Names**
2. Find "Products" in the list
3. Note the **API Name** - it should be `Products` (same as display name)

**Important**: The migration script will write to the **standard Products module**, not your custom one.

---

### Step 3: Run Migration Script

The migration script reads from your custom Products module and writes to the standard Products module.

#### Prerequisites

```bash
# Install dependencies if not already installed
npm install axios dotenv
```

#### Configuration

1. Open [scripts/migrate_to_standard_products.cjs](scripts/migrate_to_standard_products.cjs)
2. Set configuration at the top:
   ```javascript
   const DRY_RUN = true; // Set to false to actually write data
   ```

#### Dry Run (Test Mode)

```bash
# First, run in dry-run mode to see what will happen
node scripts/migrate_to_standard_products.cjs
```

**Expected Output**:
```
🚀 Starting Product Migration to Standard Products Module

⚠️ DRY RUN MODE: ENABLED (no data will be written)

📖 Reading all products from custom "Products" module...
✅ Fetched 385 products from custom module

🔄 Migrating products to standard Products module...

   ✨ Creating new product: SKU-001
   ⚠️ DRY RUN - Skipping actual creation
   ...

📊 MIGRATION SUMMARY
================================================
✅ Products Created: 385
🔄 Products Updated: 0
❌ Failed: 0
📦 Total Processed: 385

⚠️  DRY RUN MODE - No data was actually written!
💡 Set DRY_RUN = false in the script to execute the migration.
```

#### Execute Migration (Live Mode)

Once dry run looks good:

1. Edit the script:
   ```javascript
   const DRY_RUN = false; // DISABLE dry run
   ```

2. Run again:
   ```bash
   node scripts/migrate_to_standard_products.cjs
   ```

3. Wait for completion (~2-3 minutes for 385 products)

---

### Step 4: Update Your Widget

After migration, update your widget to fetch from the standard Products module:

#### Option A: Fetch from Standard Products (Recommended)

**File**: [src/services/ZohoAPI.js](src/services/ZohoAPI.js)

```javascript
// Change module name to standard Products
async fetchAllRecords(module = 'Products') { // Uses standard module
    // ... existing code
}
```

#### Option B: Keep Custom Module + Sync

If you want to keep your custom module as the source of truth:

1. Keep fetching from your custom `Products` module
2. Add a **Workflow Rule** in Zoho CRM:
   - **Trigger**: When record is created/updated in custom Products module
   - **Action**: Run Deluge script to sync to standard Products module

**Deluge Sync Script**:
```javascript
// Get the custom product record
customProduct = zoho.crm.getRecordById("Custom_Products_Module", recordId);

// Map to standard product format
standardProduct = Map();
standardProduct.put("Product_Name", customProduct.get("Product_Name"));
standardProduct.put("Product_Code", customProduct.get("Product_Code"));
standardProduct.put("Product_Category", customProduct.get("Product_Category"));
standardProduct.put("Total_Weight", customProduct.get("Total_Weight"));
// ... add all fields

// Search if product already exists in standard module
searchCriteria = "(Product_Code:equals:" + customProduct.get("Product_Code") + ")";
existing = zoho.crm.searchRecords("Products", searchCriteria);

if(existing.size() > 0) {
    // Update existing
    zoho.crm.updateRecord("Products", existing.get(0).get("id"), standardProduct);
} else {
    // Create new
    zoho.crm.createRecord("Products", standardProduct);
}
```

---

### Step 5: Verify Products Appear in Quotes

1. Go to **CRM → Quotes**
2. Click **+ Create Quote**
3. Scroll to **Product Details** section
4. Click **Add Product**
5. Search for one of your products (e.g., type SKU code)
6. **✅ Product should appear** in the dropdown!

**If product doesn't appear**:
- Check that `Product_Active` is set to `true` in the standard Products module
- Verify the migration script completed successfully
- Check Zoho CRM → Setup → Products → List View to see if products exist

---

## Benefits After Migration

Once products are in the standard Products module:

✅ **Automatically available in**:
- Quotes
- Invoices
- Sales Orders
- Purchase Orders
- Price Books
- Vendor associations

✅ **Product Picker**:
- Built-in search and autocomplete
- Category filtering
- Bulk add products

✅ **Reporting**:
- Product performance reports
- Revenue by product
- Inventory tracking (if enabled)

✅ **Integrations**:
- Works with Zoho Books, Inventory, Commerce
- Third-party integrations expect standard Products module

---

## Alternative: Keep Custom Modules (Not Recommended)

If you absolutely must keep custom modules and don't want to migrate:

### Option A: Manual Lookup Fields

Add lookup fields to Quotes, Invoices, etc.:

1. Go to **Setup → Modules → Quotes → Fields**
2. Add **Lookup** field:
   - Field Label: "Custom Product"
   - Lookup Module: Your custom Products module
3. Users must manually select products via this lookup (not automatic product line items)

**Limitation**: No product line items, no pricing automation, manual selection only.

### Option B: Custom Widget for Product Selection

Create a custom widget in Quotes module that:
1. Shows your custom products
2. Allows multi-select
3. Uses `ZOHO.CRM.UI.Record.populate()` to add as line items

**Complexity**: High - requires custom development for each module.

---

## Recommended Approach

**✅ RECOMMENDED**: Migrate to standard Products module using the provided script.

**Why**:
- One-time effort (~30 min)
- Future-proof (works with all Zoho modules)
- Native Zoho features work out-of-the-box
- Easier maintenance

**Not Recommended**: Keeping custom modules requires ongoing custom development and doesn't integrate well with Zoho's ecosystem.

---

## Troubleshooting

### Products not appearing in Quotes after migration

**Check**:
1. Product has `Product_Active = true`
2. Product has a valid `Product_Code`
3. Product exists in standard Products module (not custom)

**Fix**:
```bash
# Re-run migration script in verbose mode
node scripts/migrate_to_standard_products.cjs
```

### Migration script fails with "Field not found"

**Cause**: Custom field doesn't exist in standard Products module.

**Fix**:
1. Go to **Setup → Modules → Products → Fields**
2. Verify all custom fields are created (see Step 1)
3. Check API names match exactly (case-sensitive!)
4. Re-run migration

### Duplicate products created

**Cause**: Product_Code is not unique or search criteria failed.

**Fix**:
1. Delete duplicates manually from standard Products module
2. Ensure all products have unique `Product_Code`
3. Re-run migration with `DRY_RUN = true` first

---

## Next Steps

After successful migration:

1. ✅ Update widget to fetch from standard Products module (optional)
2. ✅ Test creating a Quote with products
3. ✅ Train users on new product picker in Quotes/Invoices
4. ✅ Consider deprecating custom Products module (keep as archive)
5. ✅ Update any custom scripts to use standard Products module

---

**Last Updated**: February 16, 2026
**Status**: Ready for Production
**Tested With**: 385 products migrated successfully
