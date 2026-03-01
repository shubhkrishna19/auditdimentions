# 📚 Integration Best Practices

**Purpose:** Accumulated wisdom from real-world Zoho CRM integrations  
**Maintained by:** AI agents across multiple projects  
**Last Updated:** 2026-02-03 - Audit Dimensions App

---

## 🎯 Core Principles

1. **Never hardcode Zoho API field names** - Always use `config/field_mappings.json`
2. **Validate before sending** - Catch errors locally, not in Zoho
3. **Log everything** - Future you will thank past you
4. **Create checkpoints for bulk operations** - Rollback capability is critical
5. **Units matter** - Always document and convert (grams → kg)

---

## 📦 Pattern Library

### Pattern 1: Parent-Child Relationship (MTP SKUs)

**Context:** Products with parent-child hierarchies  
**Problem:** How do parent and child weights relate?

**Answer:**
- **Parent (MTP SKU):** Colorless design template, NOT sold online
- **Child (Product):** Finished colored product, SOLD online
- **Relationship:** 1 Parent → Many Children | 1 Child → 1 Parent
- **Weight Logic:** Parent ≠ Sum of children. Each has independent weight.

**Why This Matters:**
- Don't aggregate child weights to calculate parent weight
- Get parent weight from Excel/design specs, not children
- Weights _should_ be similar (same design) but can differ slightly due to finishing materials

**Code Example:**
```javascript
// ❌ WRONG: Trying to sum children to get parent weight
const parentWeight = children.reduce((sum, child) => sum + child.weight, 0);

// ✅ CORRECT: Each entity has its own weight
const p

arentWeight = parseExcelRow(parentSKU).weight;
const childWeights = children.map(c => parseExcelRow(c.sku).weight);
```

**Gotcha:** Audits are only performed on Parent SKUs, not individual children.

---

### Pattern 2: Weight Calculations (Physical vs Volumetric)

**Context:** Shipping cost calculations  
**Problem:** How to calculate chargeable weight correctly?

**Answer:**
1. **Physical Weight:** Sum of all box weights (in kg)
2. **Volumetric Weight:** `(Length × Width × Height in cm) / 5000` per box, summed (in kg)
3. **Chargeable Weight:** `MAX(physical, volumetric)` ← Used for billing

**Critical Rule:** Units MUST match before MAX()

**Code Example:**
```javascript
// ✅ CORRECT: Convert to same units first
const volumetricKg = (length * width * height) / 5000;
const physicalKg = weightGrams / 1000;
const chargeableKg = Math.max(volumetricKg, physicalKg);

// ❌ WRONG: Comparing different units
const volumetricM3 = (length * width * height) / 1000000;  // cubic meters
const physicalGrams = 5200;  // grams
const chargeable = Math.max(volumetricM3, physicalGrams);  // NONSENSE! 0.006 vs 5200
```

**Why This Bit Us:**
Excel had `=MAX(Q4, O4)` where Q4 was grams and O4 was cubic meters. Always picked grams (obviously higher). We fixed by converting both to kg first.

**Constants:**
- Volumetric divisor: **5000** (industry standard for cm³ to kg conversion)
- All weights stored in Zoho: **kg** (3 decimal places)

---

### Pattern 3: Batch Operations with Progress Tracking

**Context:** Syncing 300+ products to Zoho  
**Problem:** How to avoid rate limits and show progress?

**Answer:**
- Batch size: **10 records**
- Delay between batches: **500ms**
- Total time for 300 records: ~32 seconds

**Code Example:**
```javascript
const BATCH_SIZE = 10;
const DELAY_MS = 500;

async function syncAll(products, onProgress) {
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    
    for (const product of batch) {
      await syncProduct(product);
      onProgress({ current: i + batch.indexOf(product) + 1, total: products.length });
    }
    
    // Delay between batches (except last)
    if (i + BATCH_SIZE < products.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
}
```

**Why 10 and 500ms?**
- Zoho API limit: ~100 requests/minute
- 10 records/batch × 6 batches/minute = 60 requests/minute ✅
- Leaves headroom for other operations

---

### Pattern 4: Field Existence Checking (Schema Verification)

**Context:** Custom fields might not exist in all Zoho instances  
**Problem:** How to fail gracefully if fields are missing?

**Answer:** Verify schema before sync

**Code Example:**
```javascript
async function verifyBeforeSync() {
  const schema = await ZOHO.CRM.METADATA.getFields({ Entity: 'Parent_MTP_SKU' });
  const existingFields = schema.fields.map(f => f.api_name);
  
  const REQUIRED = ['Billed_Physical_Weight', 'Billed_Volumetric_Weight', 'BOM_Weight'];
  const missing = REQUIRED.filter(field => !existingFields.includes(field));
  
  if (missing.length > 0) {
    alert(`Missing fields in CRM: ${missing.join(', ')}\n\nPlease create them in Setup.`);
    return false;
  }
  
  return true;
}
```

**User Action Required:**
If fields are missing, user must manually create them in Zoho:
1. Setup → Customization → Modules → Parent_MTP_SKU → Fields
2. Create each missing field
3. Add to Page Layout so they're visible

---

### Pattern 5: UPDATE-Only Mode for Existing Records

**Context:** All Parent MTP SKUs already exist in CRM  
**Problem:** Should sync create new records or only update existing?

**Answer:** For MTP SKUs, UPDATE ONLY

**Why:**
- Parent SKUs are created manually by product team
- Our app only syncs dimensions/weights to existing records
- If SKU not found → ERROR (something is wrong in master data)

**Code Example:**
```javascript
async function syncProduct(productData) {
  // Search for existing
  const existing = await searchProduct(productData.sku);
  
  if (existing.length === 0) {
    // ❌ Don't create! This shouldn't happen.
    throw new Error(`${productData.sku} not found in CRM. Ensure all MTP SKUs exist first.`);
  }
  
  // ✅ Update existing record
  await updateProduct(existing[0].id, productData);
}
```

**Gotcha:** Different apps might need CREATE mode. Check requirements first.

---

### Pattern 6: Subform Data Structure

**Context:** Products have multiple boxes with L×W×H×Weight  
**Problem:** How to structure subform data for Zoho API?

**Answer:** Array of objects with exact API names

**Code Example:**
```javascript
const boxData = [
  {
    Box_Number: 1,
    Box_Measurement: 'cm',
    Length: 70,
    Width: 23,
    Height: 5,
    Weight_Measurement: 'kg',
    Weight: 1.89
  },
  {
    Box_Number: 2,
    Length: 50,
    Width: 20,
    Height: 8,
    Weight: 1.2
  }
];

await ZOHO.CRM.API.updateRecord({
  Entity: 'Parent_MTP_SKU',
  APIData: {
    id: recordId,
    Bill_Dimension_Weight: boxData  // Subform field name
  }
});
```

**Key Points:**
- `Box_Number` must be unique per product
- `Box_Measurement` and `Weight_Measurement` are always 'cm' and 'kg'
- Missing boxes: Don't send empty objects, omit them entirely

---

### Pattern 7: Error Handling & User Feedback

**Context:** Syncs can fail for many reasons  
**Problem:** How to show meaningful errors to users?

**Answer:** Catch at 3 levels

**Code Example:**
```javascript
try {
  // Level 1: Validation errors (before API call)
  if (weight < 0) throw new ValidationError('Weight cannot be negative');
  
  // Level 2: API errors (Zoho rejects)
  const response = await ZOHO.CRM.API.updateRecord({...});
  if (response.data[0].code !== 'SUCCESS') {
    throw new Error(response.data[0].message);
  }
  
} catch (error) {
  // Level 3: Show user-friendly message
  if (error instanceof ValidationError) {
    alert(`Data issue: ${error.message}`);
  } else if (error.message.includes('not found')) {
    alert(`Product ${sku} doesn't exist in CRM. Please check SKU.`);
  } else {
    alert(`Sync failed: ${error.message}`);
  }
  
  // Always log for debugging
  console.error('[Sync Error]', { sku, error });
  logToFile({ timestamp: new Date(), sku, error: error.message });
}
```

**User-Facing Messages:**
- ✅ "Field 'Billed Physical Weight' missing in CRM. Please create it in Setup."
- ✅ "Product ABC-123 not found. Ensure it exists in Parent MTP SKU module."
- ❌ "Error: undefined" (not helpful!)

---

## 🚨 Common Gotchas

### Gotcha 1: API Name != Field Label
- **Field Label (UI):** "Billed Physical Weight"
- **API Name (Code):** "Billed_Physical_Weight"
- **Always use API name in code!**

### Gotcha 2: Decimal Precision Loss
- Zoho stores: 3 decimal places
- JavaScript: Can have precision issues
- **Solution:** `parseFloat(value.toFixed(3))`

### Gotcha 3: Workflow Triggers
- By default, `updateRecord()` DOES NOT trigger workflows
- Add `Trigger: ["workflow"]` to enable
- **Use when:** You have Zoho workflows that should run on update

### Gotcha 4: Date Formats
- Zoho expects: `YYYY-MM-DD` (ISO 8601 date only)
- JavaScript Date: Includes time (won't work!)
- **Solution:** `new Date().toISOString().split('T')[0]`

### Gotcha 5: Empty Subforms
- Don't send `Bill_Dimension_Weight: []` (empty array)
- It deletes all existing boxes!
- **Solution:** Omit the field entirely if no changes

---

## 📈 Performance Tips

1. **Batch ZOHO.CRM.API calls** - Never call in a loop without batching
2. **Cache schema metadata** - Don't call `getFields()` for every record
3. **Use Promise.all() for independent operations** - But respect rate limits
4. **Minimize payload size** - Only send changed fields, not entire record

---

## 🔐 Security Reminders

1. **Never log sensitive data** - Especially customer info, IDs
2. **Validate ALL user input** - Even from Excel files
3. **Use Zoho's authentication** - Never hardcode credentials
4. **Sanitize before display** - Prevent XSS in React components

---

## 📝 Contributing to This Document

**When you discover a new pattern:**
1. Add a section with clear Problem → Answer → Code
2. Include "Why This Matters" context
3. Add code examples (both ✅ correct and ❌ wrong)
4. List gotchas/edge cases

**When a pattern changes:**
1. Update the section
2. Add "Updated: YYYY-MM-DD" note
3. Explain WHY it changed (what broke?)

---

**This document grows with every integration. Thank you for contributing! 🙏**

---

## 🗂️ Quick Reference

| Topic | Pattern # |
|-------|-----------|
| Parent-Child Weights | 1 |
| Weight Calculations | 2 |
| Batch Processing | 3 |
| Schema Verification | 4 |
| Update vs Create | 5 |
| Subforms | 6 |
| Error Handling | 7 |

---

**Last contribution:** Audit Dimensions App - Weight audit integration  
**Next contributor:** You! 🚀
