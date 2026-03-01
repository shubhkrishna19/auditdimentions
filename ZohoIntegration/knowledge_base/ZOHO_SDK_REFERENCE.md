# Zoho Embedded Apps SDK Reference

Complete guide to the Zoho Embedded Apps SDK v1.2 for building CRM widgets.

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [SDK Loading](#sdk-loading)
3. [Initialization Patterns](#initialization-patterns)
4. [Core API Modules](#core-api-modules)
5. [CRUD Operations](#crud-operations)
6. [Pagination](#pagination)
7. [Search & Filtering](#search--filtering)
8. [Subform Operations](#subform-operations)
9. [Event Listeners](#event-listeners)
10. [Error Handling](#error-handling)
11. [Rate Limits](#rate-limits)

---

## Overview

The Zoho Embedded Apps SDK allows you to build JavaScript widgets that run inside Zoho CRM.

**When to use**: Client-side integrations, CRUD operations, moderate batch updates (< 500 records)

**Benefits**:
- Simple setup - no backend required
- SDK handles authentication automatically
- Fast development with localhost testing
- Direct access to CRM data

**Limitations**:
- Runs only inside Zoho CRM widget context
- Rate limits: 100 requests/minute
- Browser-based execution only
- No scheduled jobs

---

## SDK Loading

### CDN Include

```html
<script src="https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js"></script>
```

**Version**: 1.2 (latest stable as of Feb 2026)

### Verify SDK Loaded

```javascript
if (typeof ZOHO === 'undefined') {
  console.error('Zoho SDK not loaded!');
} else {
  console.log('Zoho SDK ready');
}
```

---

## Initialization Patterns

### Pattern 1: PageLoad Event (Recommended)

```javascript
ZOHO.embeddedApp.on("PageLoad", function(data) {
  console.log("Widget loaded in CRM", data);
  // Your app initialization here
});

ZOHO.embeddedApp.init();
```

### Pattern 2: Promise-based (For async/await)

```javascript
function initZoho() {
  return new Promise((resolve, reject) => {
    ZOHO.embeddedApp.on("PageLoad", (data) => resolve(data));

    // Timeout after 10 seconds
    setTimeout(() => reject(new Error('SDK init timeout')), 10000);

    ZOHO.embeddedApp.init();
  });
}

// Usage
try {
  const data = await initZoho();
  console.log('SDK initialized', data);
} catch (error) {
  console.error('Failed to init SDK:', error);
}
```

### Pattern 3: With Timeout & Fallback

```javascript
async function initWithTimeout(timeoutMs = 10000) {
  return Promise.race([
    // SDK initialization
    new Promise((resolve) => {
      ZOHO.embeddedApp.on("PageLoad", resolve);
      ZOHO.embeddedApp.init();
    }),
    // Timeout fallback
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SDK init timeout')), timeoutMs)
    )
  ]);
}

// Usage with error handling
try {
  await initWithTimeout(5000);
  console.log('✅ SDK ready');
} catch (error) {
  console.error('❌ SDK failed:', error);
  // Show user-friendly error message
}
```

---

## Core API Modules

### ZOHO.embeddedApp

Widget lifecycle and initialization.

```javascript
// Initialize widget
ZOHO.embeddedApp.init();

// Listen for events
ZOHO.embeddedApp.on("PageLoad", (data) => { /* ... */ });

// Resize widget
ZOHO.embeddedApp.resize({ width: "100%", height: "600px" });
```

### ZOHO.CRM.API

CRUD operations on CRM data.

```javascript
// Get all records
ZOHO.CRM.API.getAllRecords({ Entity: "Products" });

// Get single record
ZOHO.CRM.API.getRecord({ Entity: "Products", RecordID: "123" });

// Update record
ZOHO.CRM.API.updateRecord({ Entity: "Products", APIData: {...} });

// Insert record
ZOHO.CRM.API.insertRecord({ Entity: "Products", APIData: {...} });

// Delete record
ZOHO.CRM.API.deleteRecord({ Entity: "Products", RecordID: "123" });

// Search records
ZOHO.CRM.API.searchRecord({ Entity: "Products", Type: "criteria", Query: "..." });
```

### ZOHO.CRM.UI

User interface controls.

```javascript
// Open record in CRM
ZOHO.CRM.UI.Record.open({ Entity: "Products", RecordID: "123" });

// Edit record
ZOHO.CRM.UI.Record.edit({ Entity: "Products", RecordID: "123" });

// Create new record
ZOHO.CRM.UI.Record.create({ Entity: "Products" });

// Populate fields
ZOHO.CRM.UI.Record.populate({ Product_Name: "Test", Total_Weight: 5.5 });

// Show popup
ZOHO.CRM.UI.Popup.show({ title: "My Popup", content: "Hello!" });
```

### ZOHO.CRM.META

Metadata and schema access.

```javascript
// Get module fields
ZOHO.CRM.META.getFields({ Entity: "Products" });

// Get modules list
ZOHO.CRM.META.getModules();

// Get layouts
ZOHO.CRM.META.getLayouts({ Entity: "Products" });

// Get organization info
ZOHO.CRM.META.getOrg();
```

### ZOHO.CRM.CONFIG

Current user and org configuration.

```javascript
// Get current user
ZOHO.CRM.CONFIG.getCurrentUser();

// Get org info
ZOHO.CRM.CONFIG.getOrgInfo();

// Get org variable
ZOHO.CRM.CONFIG.getOrgVariable("variable_name");
```

---

## CRUD Operations

### Fetch All Records (with Pagination)

```javascript
async function fetchAllRecords(module, fields = 'all') {
  let allRecords = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await ZOHO.CRM.API.getAllRecords({
      Entity: module,
      Fields: fields,
      page: page,
      per_page: 200 // Max per page
    });

    const records = response.data || [];
    allRecords = allRecords.concat(records);

    console.log(`Fetched page ${page}: ${records.length} records`);

    // Check if there are more pages
    if (records.length < 200) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allRecords;
}

// Usage
const products = await fetchAllRecords('Products',
  'Product_Code,Product_Name,Total_Weight,Bill_Dimension_Weight'
);
```

### Get Single Record

```javascript
const response = await ZOHO.CRM.API.getRecord({
  Entity: "Products",
  RecordID: "4876876000000123456"
});

const product = response.data[0];
console.log(product.Product_Name);
```

### Update Single Record

```javascript
const response = await ZOHO.CRM.API.updateRecord({
  Entity: "Products",
  APIData: {
    id: "4876876000000123456",
    Product_Name: "Updated Name",
    Total_Weight: 5.5
  },
  Trigger: ["workflow"] // Optional: trigger workflows
});

if (response.data[0].code === "SUCCESS") {
  console.log('✅ Updated successfully');
}
```

### Update Subform Data

```javascript
const boxes = [
  { Box: 1, Length: 50, Width: 30, Height: 20, Weight: 2.5 },
  { Box: 2, Length: 40, Width: 25, Height: 15, Weight: 1.8 }
];

const response = await ZOHO.CRM.API.updateRecord({
  Entity: "Products",
  APIData: {
    id: "4876876000000123456",
    Bill_Dimension_Weight: boxes // Subform field
  }
});
```

### Insert New Record

```javascript
const response = await ZOHO.CRM.API.insertRecord({
  Entity: "Products",
  APIData: {
    Product_Code: "NEW-SKU-001",
    Product_Name: "New Product",
    Total_Weight: 3.5
  },
  Trigger: ["workflow"]
});

const newRecordId = response.data[0].details.id;
console.log(`Created record: ${newRecordId}`);
```

### Delete Record

```javascript
const response = await ZOHO.CRM.API.deleteRecord({
  Entity: "Products",
  RecordID: "4876876000000123456"
});

if (response.data[0].code === "SUCCESS") {
  console.log('✅ Deleted successfully');
}
```

---

## Pagination

**CRITICAL**: Always implement pagination for modules with > 200 records!

### Full Pagination Pattern

```javascript
async function fetchAllRecords(module, fields = 'all') {
  let allRecords = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await ZOHO.CRM.API.getAllRecords({
        Entity: module,
        Fields: fields,
        page: page,
        per_page: 200
      });

      if (!response.data || response.data.length === 0) {
        hasMore = false;
        break;
      }

      allRecords = allRecords.concat(response.data);
      console.log(`Page ${page}: ${response.data.length} records`);

      // Check if this is the last page
      if (response.data.length < 200) {
        hasMore = false;
      } else {
        page++;
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 100));

    } catch (error) {
      console.error(`Error on page ${page}:`, error);
      hasMore = false;
    }
  }

  return allRecords;
}
```

---

## Search & Filtering

### Search by Criteria (Single Field)

```javascript
const response = await ZOHO.CRM.API.searchRecord({
  Entity: "Products",
  Type: "criteria",
  Query: "(Product_Code:equals:ABC-123)"
});

const products = response.data;
```

### Search by Multiple Criteria

```javascript
const response = await ZOHO.CRM.API.searchRecord({
  Entity: "Products",
  Type: "criteria",
  Query: "(Product_Code:equals:ABC-123)and(Live_Status:equals:Y)"
});
```

### Search by Word

```javascript
const response = await ZOHO.CRM.API.searchRecord({
  Entity: "Products",
  Type: "word",
  Query: "mattress"
});
```

### Search by Phone

```javascript
const response = await ZOHO.CRM.API.searchRecord({
  Entity: "Contacts",
  Type: "phone",
  Query: "9876543210"
});
```

---

## Subform Operations

### Read Subform Data

```javascript
const response = await ZOHO.CRM.API.getRecord({
  Entity: "Products",
  RecordID: "123456"
});

const boxes = response.data[0].Bill_Dimension_Weight || [];
console.log(`Product has ${boxes.length} boxes`);

boxes.forEach(box => {
  console.log(`Box ${box.BL}: ${box.Length}x${box.Width}x${box.Height} cm, ${box.Weight} kg`);
});
```

### Add Subform Rows

```javascript
const newBoxes = [
  { BL: 1, Length: 50, Width: 30, Height: 20, Weight: 2.5 },
  { BL: 2, Length: 40, Width: 25, Height: 15, Weight: 1.8 }
];

await ZOHO.CRM.API.updateRecord({
  Entity: "Products",
  APIData: {
    id: "123456",
    Bill_Dimension_Weight: newBoxes
  }
});
```

### Replace All Subform Rows

```javascript
// ⚠️ This REPLACES all existing rows with new ones

await ZOHO.CRM.API.updateRecord({
  Entity: "Products",
  APIData: {
    id: "123456",
    Bill_Dimension_Weight: [
      { BL: 1, Length: 60, Width: 35, Height: 25, Weight: 3.0 }
    ]
  }
});
```

### Delete Subform Rows

```javascript
// To delete all rows, send empty array
await ZOHO.CRM.API.updateRecord({
  Entity: "Products",
  APIData: {
    id: "123456",
    Bill_Dimension_Weight: []
  }
});
```

---

## Event Listeners

### Available Events

```javascript
// Widget loaded in CRM
ZOHO.embeddedApp.on("PageLoad", (data) => {
  console.log("Widget loaded", data);
});

// Dialer toggled
ZOHO.embeddedApp.on("DialerActive", (data) => {
  console.log("Dialer status:", data);
});

// Call button clicked
ZOHO.embeddedApp.on("Dial", (data) => {
  console.log("Calling:", data.PhoneNumber);
});
```

### Custom Notifications

```javascript
// Show toast notification
ZOHO.CRM.UI.Popup.toast({
  message: "✅ Product updated successfully!",
  type: "success", // success, error, warning, info
  duration: 3000
});
```

---

## Error Handling

### Common Errors

```javascript
try {
  const response = await ZOHO.CRM.API.updateRecord({...});

  if (response.data[0].code !== "SUCCESS") {
    console.error('Update failed:', response.data[0].message);
  }

} catch (error) {
  if (error.message.includes('INVALID_MODULE')) {
    console.error('❌ Module not found');
  } else if (error.message.includes('MANDATORY_NOT_FOUND')) {
    console.error('❌ Required field missing');
  } else if (error.message.includes('INVALID_DATA')) {
    console.error('❌ Invalid field value');
  } else {
    console.error('❌ Unknown error:', error);
  }
}
```

### Retry Pattern

```javascript
async function updateWithRetry(apiData, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ZOHO.CRM.API.updateRecord({
        Entity: 'Products',
        APIData: apiData
      });
    } catch (error) {
      if (i === retries - 1) throw error;

      console.warn(`Retry ${i + 1}/${retries}...`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
    }
  }
}
```

---

## Rate Limits

**Client-side SDK limit**: 100 requests per minute

### Batch Processing with Rate Limiting

```javascript
async function batchUpdateProducts(products, onProgress) {
  const batchSize = 10;
  const delay = 500; // 500ms between batches

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    // Process batch in parallel
    await Promise.all(
      batch.map(product =>
        ZOHO.CRM.API.updateRecord({
          Entity: 'Products',
          APIData: { id: product.id, ...product.data }
        })
      )
    );

    // Progress callback
    if (onProgress) {
      onProgress({
        current: Math.min(i + batchSize, products.length),
        total: products.length
      });
    }

    // Rate limiting delay
    if (i + batchSize < products.length) {
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Usage
await batchUpdateProducts(productsToUpdate, (progress) => {
  console.log(`${progress.current}/${progress.total} updated`);
});
```

---

## Best Practices

### 1. Always Initialize SDK First

```javascript
let isSDKReady = false;

ZOHO.embeddedApp.on("PageLoad", () => {
  isSDKReady = true;
});

ZOHO.embeddedApp.init();

// Wait for SDK before making API calls
async function safeFetch() {
  while (!isSDKReady) {
    await new Promise(r => setTimeout(r, 100));
  }

  return await ZOHO.CRM.API.getAllRecords({...});
}
```

### 2. Handle Pagination for Large Datasets

Always use pagination loop for modules with > 200 records.

### 3. Respect Rate Limits

Add delays between batch operations (500ms recommended).

### 4. Validate Data Before Update

```javascript
function validateProduct(product) {
  if (!product.Product_Code) throw new Error('Product code required');
  if (!product.Product_Name) throw new Error('Product name required');
  if (product.Total_Weight && product.Total_Weight < 0) {
    throw new Error('Weight cannot be negative');
  }
}
```

### 5. Use Field Selection

Only fetch fields you need to reduce response size:

```javascript
// ✅ Good - specific fields
ZOHO.CRM.API.getAllRecords({
  Entity: "Products",
  Fields: "Product_Code,Product_Name,Total_Weight"
});

// ❌ Bad - fetches all fields (slow)
ZOHO.CRM.API.getAllRecords({
  Entity: "Products"
});
```

---

## Development vs Production

### Dual-Mode Pattern

```javascript
class ZohoService {
  constructor() {
    this.isDev = import.meta.env.VITE_API_MODE === 'mock';
  }

  async init() {
    if (this.isDev) {
      console.log('🧪 Running in MOCK mode');
      return;
    }

    // Real SDK initialization
    await new Promise((resolve) => {
      ZOHO.embeddedApp.on("PageLoad", resolve);
      ZOHO.embeddedApp.init();
    });

    console.log('✅ SDK initialized (LIVE mode)');
  }

  async fetchProducts() {
    if (this.isDev) {
      return MOCK_PRODUCTS; // From mockData.js
    }

    // Real SDK call
    return await this.fetchAllRecords('Products');
  }
}
```

---

## Resources

- **Official Docs**: https://www.zoho.com/crm/developer/docs/widgets/
- **SDK Download**: https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js
- **Developer Console**: https://api-console.zoho.com/

---

**Last Updated**: February 15, 2026
**SDK Version**: 1.2
