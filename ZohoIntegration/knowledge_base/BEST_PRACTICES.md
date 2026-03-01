# Zoho Integration Best Practices

Production-tested patterns and anti-patterns for Zoho CRM integrations.

---

## Table of Contents

1. [Data Quality Prevention](#data-quality-prevention)
2. [Excel Import Patterns](#excel-import-patterns)
3. [Parent-Child Sync](#parent-child-sync)
4. [Unit Conversions](#unit-conversions)
5. [Pagination](#pagination)
6. [Batch Processing](#batch-processing)
7. [Error Handling](#error-handling)
8. [Development Patterns](#development-patterns)
9. [Anti-Patterns (Don't Do This)](#anti-patterns-dont-do-this)

---

## Data Quality Prevention

### Pattern 1: Validation Rules in CRM

**Problem**: Users enter invalid data (empty names, missing SKUs, negative weights)

**Solution**: Create validation rules in Zoho CRM

```javascript
// Example validation rule in Deluge (Zoho's script language)
// Setup → Automation → Validation Rules

// Rule: Product Name Required
if(isNull(Product_Name) || Product_Name == "")
{
  return "Product Name is required";
}

// Rule: Weight Must Be Positive
if(Total_Weight < 0)
{
  return "Weight cannot be negative";
}

// Rule: SKU Format Validation
if(!Product_Code.matches("[A-Z]{2}-[A-Z]{3}(-[0-9]+)?"))
{
  return "SKU must follow format: AB-CDE or AB-CDE-123";
}
```

### Pattern 2: Auto-Correct Workflows

**Problem**: Data entered in wrong format (category/weight swaps)

**Solution**: Workflow to auto-correct on create/edit

```javascript
// Workflow: Auto-fix Category/Weight Swap
// Trigger: On Create or Edit

if(Product_Category.contains("kg") || Product_Category.matches("^[0-9.]+$"))
{
  // Swap detected!
  temp = Product_Category;
  Product_Category = Weight_Category_Billed;
  Weight_Category_Billed = temp;

  // Send notification
  sendmail [to: admin@company.com
    subject: "Auto-corrected swap for " + Product_Code];
}
```

### Pattern 3: Schema Verification Before Sync

**Problem**: Fields might not exist in user's CRM

**Solution**: Verify schema first, show user-friendly error

```javascript
async function verifyRequiredFields(module, requiredFields) {
  const schema = await ZOHO.CRM.META.getFields({ Entity: module });
  const existingFields = schema.fields.map(f => f.api_name);
  const missing = requiredFields.filter(f => !existingFields.includes(f));

  if (missing.length > 0) {
    throw new Error(
      `Missing fields in ${module}:\n${missing.join(', ')}\n\n` +
      `Please create these fields in Setup → Modules → ${module} → Fields`
    );
  }

  console.log(`✅ All required fields exist in ${module}`);
}

// Usage
await verifyRequiredFields('Products', [
  'Product_Code',
  'Product_Name',
  'Total_Weight',
  'Bill_Dimension_Weight'
]);
```

---

## Excel Import Patterns

### Pattern 4: Multi-Row Header Detection

**Problem**: Excel files have multi-row headers (merged cells, sub-headers)

**Solution**: Detect header row by counting non-empty cells

```javascript
function findHeaderRow(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref']);

  for (let row = range.s.r; row <= range.s.r + 5; row++) {
    let nonEmptyCount = 0;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];

      if (cell && cell.v && cell.v.toString().trim()) {
        nonEmptyCount++;
      }
    }

    // Header row typically has > 10 non-empty cells
    if (nonEmptyCount > 10) {
      console.log(`✅ Found header at row ${row + 1}`);
      return row;
    }
  }

  throw new Error('Could not find header row in Excel');
}

// Usage
const headerRow = findHeaderRow(worksheet);
const data = XLSX.utils.sheet_to_json(worksheet, { range: headerRow });
```

### Pattern 5: Unit Conversion During Import

**Problem**: Excel has weights in grams, CRM expects kilograms

**Solution**: Convert during parsing with heuristic fallback

```javascript
function parseWeight(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return null;

  // Heuristic: If > 1000, likely grams
  if (num > 1000) {
    return num / 1000; // Convert to kg
  }

  // Already in kg
  return num;
}

// Usage
const boxes = excelRows.map(row => ({
  Box: row['Box Number'],
  Length: parseFloat(row['Length (cm)']),
  Width: parseFloat(row['Width (cm)']),
  Height: parseFloat(row['Height (cm)']),
  Weight: parseWeight(row['Weight']) // Auto-converts grams → kg
}));
```

### Pattern 6: SKU Matching with Fuzzy Logic

**Problem**: SKU in Excel doesn't exactly match CRM (spaces, case, dashes)

**Solution**: Normalize before comparison

```javascript
function normalizeSKU(sku) {
  return sku
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '');
}

function findProductBySKU(sku, products) {
  const normalized = normalizeSKU(sku);

  return products.find(p =>
    normalizeSKU(p.Product_Code) === normalized ||
    normalizeSKU(p.Name) === normalized
  );
}

// Usage
const excelSKU = "ABC 123";  // From Excel
const product = findProductBySKU(excelSKU, allProducts);
// Matches "ABC-123" or "abc123" in CRM
```

---

## Parent-Child Sync

### Pattern 7: Propagate Parent Changes to Children

**Problem**: Parent SKU updated, child SKUs need sync

**Solution**: Workflow to auto-update children when parent changes

```javascript
// Workflow: Parent → Children Sync
// Module: Parent_MTP_SKU
// Trigger: On Edit

// Get all child products linked to this parent
children = zoho.crm.searchRecords("Products", "(MTP_SKU:equals:" + id + ")");

for each child in children
{
  // Sync category
  if(child.Product_Category != Product_Category)
  {
    updateMap = Map();
    updateMap.put("Product_Category", Product_Category);
    updateMap.put("Weight_Category_Billed", Weight_Category_Billed);
    zoho.crm.updateRecord("Products", child.get("id"), updateMap);
  }
}
```

---

## Unit Conversions

### ⚠️ CRITICAL: Weight Units in CRM

**All weight fields in CRM are in KILOGRAMS**, not grams!

```javascript
// ✅ CORRECT - CRM weights are in KG
const billedWeight = product.Billed_Physical_Weight; // Already in KG
const totalWeight = product.Total_Weight; // Already in KG
const boxWeight = box.Weight; // Already in KG

// ❌ WRONG - DO NOT divide by 1000
const wrongWeight = product.Total_Weight / 1000; // NO!
```

### Pattern 8: Excel to CRM Unit Mapping

```javascript
// Excel Format → CRM Format
const excelToCRM = {
  // Weights
  'Weight (g)': (val) => parseFloat(val) / 1000,  // Grams → KG
  'Weight (kg)': (val) => parseFloat(val),        // Already KG
  'Weight': (val) => val > 1000 ? val / 1000 : val, // Heuristic

  // Dimensions (both in cm)
  'Length (cm)': (val) => parseFloat(val),
  'Width (cm)': (val) => parseFloat(val),
  'Height (cm)': (val) => parseFloat(val),

  // Volume (if needed)
  'Volume (m³)': (val) => parseFloat(val) * 1000000 // m³ → cm³
};

// Usage
const box = {
  Length: excelToCRM['Length (cm)'](row['Length']),
  Width: excelToCRM['Width (cm)'](row['Width']),
  Height: excelToCRM['Height (cm)'](row['Height']),
  Weight: excelToCRM['Weight'](row['Weight']) // Auto-detects unit
};
```

---

## Pagination

### Pattern 9: Fetch All Records with Progress

```javascript
async function fetchAllRecords(module, fields = 'all', onProgress) {
  let allRecords = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await ZOHO.CRM.API.getAllRecords({
      Entity: module,
      Fields: fields,
      page: page,
      per_page: 200
    });

    const records = response.data || [];
    allRecords = allRecords.concat(records);

    // Progress callback
    if (onProgress) {
      onProgress({
        page,
        fetched: records.length,
        total: allRecords.length
      });
    }

    console.log(`📄 Page ${page}: ${records.length} records`);

    // Check if more pages exist
    if (records.length < 200) {
      hasMore = false;
    } else {
      page++;
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`✅ Fetched ${allRecords.length} total records`);
  return allRecords;
}

// Usage with progress
const products = await fetchAllRecords('Products', 'all', (progress) => {
  console.log(`Fetching page ${progress.page}: ${progress.total} total`);
});
```

---

## Batch Processing

### Pattern 10: Batch Updates with Rate Limiting

```javascript
async function batchUpdateProducts(products, onProgress) {
  const batchSize = 10;     // 10 products per batch
  const delay = 500;        // 500ms between batches
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(product =>
        ZOHO.CRM.API.updateRecord({
          Entity: 'Products',
          APIData: { id: product.id, ...product.data }
        })
      )
    );

    // Count successes and failures
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errorCount++;
        console.error('Update failed:', result.reason);
      }
    });

    // Progress callback
    if (onProgress) {
      onProgress({
        current: Math.min(i + batchSize, products.length),
        total: products.length,
        success: successCount,
        errors: errorCount
      });
    }

    // Rate limiting delay
    if (i + batchSize < products.length) {
      await new Promise(r => setTimeout(r, delay));
    }
  }

  return { success: successCount, errors: errorCount };
}

// Usage
const result = await batchUpdateProducts(productsToUpdate, (progress) => {
  console.log(`${progress.current}/${progress.total} - ✅ ${progress.success} | ❌ ${progress.errors}`);
});
```

---

## Error Handling

### Pattern 11: Graceful Error Handling with User Feedback

```javascript
async function updateProductSafely(productData) {
  try {
    // Validate data first
    if (!productData.id) {
      throw new Error('Product ID is required');
    }

    if (productData.Total_Weight && productData.Total_Weight < 0) {
      throw new Error('Weight cannot be negative');
    }

    // Attempt update
    const response = await ZOHO.CRM.API.updateRecord({
      Entity: 'Products',
      APIData: productData
    });

    if (response.data[0].code === 'SUCCESS') {
      return { success: true, id: productData.id };
    } else {
      throw new Error(response.data[0].message);
    }

  } catch (error) {
    // User-friendly error messages
    let message = 'Update failed';

    if (error.message.includes('MANDATORY_NOT_FOUND')) {
      message = 'Required field is missing';
    } else if (error.message.includes('INVALID_DATA')) {
      message = 'Invalid data format';
    } else if (error.message.includes('DUPLICATE_DATA')) {
      message = 'This SKU already exists';
    } else {
      message = error.message;
    }

    console.error(`❌ ${productData.id}: ${message}`);

    return {
      success: false,
      id: productData.id,
      error: message
    };
  }
}
```

---

## Development Patterns

### Pattern 12: Dual-Mode Service (Dev + Prod)

```javascript
class ZohoService {
  constructor() {
    this.isDevelopment = import.meta.env.VITE_API_MODE === 'mock';
    this.isInitialized = false;
  }

  async init() {
    if (this.isDevelopment) {
      console.log('🧪 Running in MOCK mode');
      this.isInitialized = true;
      return;
    }

    // Real SDK initialization
    await new Promise((resolve) => {
      ZOHO.embeddedApp.on("PageLoad", resolve);
      ZOHO.embeddedApp.init();
    });

    console.log('✅ SDK initialized (LIVE mode)');
    this.isInitialized = true;
  }

  async fetchProducts() {
    if (this.isDevelopment) {
      return MOCK_PRODUCTS; // From mockData.js
    }

    // Real SDK call
    const response = await ZOHO.CRM.API.getAllRecords({
      Entity: 'Products',
      Fields: 'all'
    });

    return response.data || [];
  }

  async updateProduct(productData) {
    if (this.isDevelopment) {
      console.log('🧪 MOCK: Would update', productData);
      return { success: true };
    }

    // Real update
    return await ZOHO.CRM.API.updateRecord({
      Entity: 'Products',
      APIData: productData
    });
  }
}

// Usage
const zoho = new ZohoService();
await zoho.init();

// Works in both dev and prod!
const products = await zoho.fetchProducts();
```

---

## Anti-Patterns (Don't Do This)

### ❌ Don't Fetch All Fields When You Need Few

```javascript
// ❌ BAD - fetches all fields (slow, large response)
const response = await ZOHO.CRM.API.getAllRecords({
  Entity: "Products"
});

// ✅ GOOD - fetch only needed fields
const response = await ZOHO.CRM.API.getAllRecords({
  Entity: "Products",
  Fields: "Product_Code,Product_Name,Total_Weight"
});
```

### ❌ Don't Update in Loop Without Rate Limiting

```javascript
// ❌ BAD - will hit rate limits!
for (const product of products) {
  await ZOHO.CRM.API.updateRecord({...});
}

// ✅ GOOD - batch with delays
for (let i = 0; i < products.length; i += 10) {
  const batch = products.slice(i, i + 10);
  await Promise.all(batch.map(p => updateProduct(p)));
  await new Promise(r => setTimeout(r, 500)); // Delay
}
```

### ❌ Don't Ignore Pagination

```javascript
// ❌ BAD - only gets first 200 records!
const response = await ZOHO.CRM.API.getAllRecords({
  Entity: "Products"
});
const products = response.data; // Incomplete!

// ✅ GOOD - loop through all pages
const products = await fetchAllRecords('Products');
```

### ❌ Don't Trust Excel Units

```javascript
// ❌ BAD - assumes Excel is in kg
const weight = row['Weight'];

// ✅ GOOD - convert with heuristic
const weight = row['Weight'] > 1000
  ? row['Weight'] / 1000  // Grams → kg
  : row['Weight'];        // Already kg
```

### ❌ Don't Divide CRM Weights by 1000

```javascript
// ❌ BAD - CRM weights are ALREADY in kg!
const totalWeight = product.Total_Weight / 1000; // WRONG!

// ✅ GOOD - use as-is
const totalWeight = product.Total_Weight; // Already in KG
```

### ❌ Don't Skip Error Handling

```javascript
// ❌ BAD - no error handling
await ZOHO.CRM.API.updateRecord({...});

// ✅ GOOD - handle errors gracefully
try {
  const response = await ZOHO.CRM.API.updateRecord({...});
  if (response.data[0].code !== 'SUCCESS') {
    console.error('Update failed:', response.data[0].message);
  }
} catch (error) {
  console.error('API error:', error);
}
```

---

## Summary Checklist

Before deploying any Zoho integration:

- [ ] Pagination implemented for > 200 records
- [ ] Rate limiting (500ms delay) for batch operations
- [ ] Unit conversions verified (Excel grams → CRM kg)
- [ ] CRM weights NOT divided by 1000 (already in kg)
- [ ] Error handling with user-friendly messages
- [ ] Development mode with mock data
- [ ] Schema verification for required fields
- [ ] Field selection (don't fetch 'all' unless needed)
- [ ] Retry logic for network failures
- [ ] Progress callbacks for long operations

---

**Last Updated**: February 15, 2026
