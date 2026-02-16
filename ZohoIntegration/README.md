# 🔧 Zoho Integration Module

**Portable, production-ready Zoho CRM integration toolkit**

Copy this entire folder to any new app and start integrating with Zoho CRM immediately!

---

## 📁 What's Inside

```
ZohoIntegration/
├── README.md                    # This file - overview & quick start
├── knowledge_base/             # Complete Zoho documentation
│   ├── ZOHO_SDK_REFERENCE.md   # Official SDK methods & patterns
│   ├── BEST_PRACTICES.md       # Production patterns & anti-patterns
│   ├── MCP_INTEGRATION.md      # Model Context Protocol guide
│   ├── FIELD_MAPPINGS.md       # CRM field reference & units
│   └── TROUBLESHOOTING.md      # Common issues & solutions
├── services/                   # Ready-to-use service classes
│   ├── ZohoAPI.js             # Main CRM service (client-side SDK)
│   └── DimensionAuditParser.js # Excel parser example
├── scripts/                    # Production scripts
│   ├── cleanup_duplicate_boxes.cjs         # Deduplicate subform data
│   ├── populate_product_identifiers.cjs   # Bulk data population
│   ├── verify_data_quality.js             # Data validation
│   └── templates/                          # Script templates
├── config/                     # Configuration files
│   ├── field_mappings.json    # Module & field definitions
│   ├── .env.example           # Environment template
│   └── slate.config.json      # Catalyst deployment config
└── examples/                   # Code examples
    ├── fetch_all_records.js   # Pagination example
    ├── batch_update.js        # Bulk operations
    └── subform_operations.js  # Working with subforms

```

---

## 🚀 Quick Start

### Step 1: Copy to New Project

```bash
# Copy entire folder to your new app
cp -r ZohoIntegration /path/to/new-app/

# Or on Windows
xcopy ZohoIntegration C:\path\to\new-app\ZohoIntegration /E /I
```

### Step 2: Install Dependencies

```bash
npm install @modelcontextprotocol/sdk xlsx axios
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp ZohoIntegration/config/.env.example .env.mcp

# Edit .env.mcp with your credentials
# ZOHO_CLIENT_ID=your_client_id
# ZOHO_CLIENT_SECRET=your_secret
# ZOHO_REFRESH_TOKEN=your_token
```

### Step 4: Copy Service to Your App

```javascript
// In your app's src/services/
import ZohoAPI from '../../ZohoIntegration/services/ZohoAPI';

const zohoService = new ZohoAPI();
await zohoService.init();

// Fetch products
const products = await zohoService.fetchAllRecords('Products');
```

---

## 📚 Documentation Structure

### 1. Knowledge Base (`knowledge_base/`)

Complete guides for every aspect of Zoho integration:

- **ZOHO_SDK_REFERENCE.md** - All SDK methods with examples
  - Embedded Apps SDK v1.2
  - ZOHO.CRM.API (CRUD operations)
  - ZOHO.CRM.UI (user interface)
  - ZOHO.CRM.META (schema/metadata)
  - Event listeners & initialization patterns

- **BEST_PRACTICES.md** - Production patterns
  - Pagination (fetchAllRecords pattern)
  - Batch processing (rate limits, delays)
  - Error handling & retries
  - Unit conversions (KG/grams, cm)
  - Subform data operations
  - Development vs Production modes

- **MCP_INTEGRATION.md** - Model Context Protocol
  - MCP server setup
  - zoho-crm_get-records
  - zoho-crm_update-record
  - Pagination & field selection
  - Production vs development usage

- **FIELD_MAPPINGS.md** - CRM field reference
  - Parent_MTP_SKU module fields
  - Products module fields
  - Subforms (MTP_Box_Dimensions, Bill_Dimension_Weight, Product_Identifiers)
  - Units (weights in KG, dimensions in cm)
  - Lookup fields (MTP_SKU returns {id, name})

- **TROUBLESHOOTING.md** - Common issues
  - SDK initialization timeout
  - Rate limit errors
  - Field not found
  - Pagination issues
  - Subform update failures
  - CommonJS vs ES modules

### 2. Services (`services/`)

Production-ready service classes:

- **ZohoAPI.js** - Main CRM integration service
  - Client-side Embedded SDK
  - Dual-mode (development mock + production live)
  - Methods:
    - `init()` - Initialize SDK
    - `fetchAllRecords(module, fields)` - Paginated fetch
    - `searchRecord(criteria, module)` - Search by SKU/field
    - `updateProduct(productData)` - Single update
    - `batchUpdateProducts(products, onProgress)` - Bulk updates
  - Rate limiting built-in
  - Error handling & retries

- **DimensionAuditParser.js** - Excel parsing example
  - Multi-row header detection
  - Unit conversion (grams → kg)
  - SKU matching algorithms
  - Data validation

### 3. Scripts (`scripts/`)

Production-tested MCP scripts:

- **cleanup_duplicate_boxes.cjs** - Remove duplicate subform entries
  - Deduplicates by box number + dimensions + weight
  - Works on both Parent_MTP_SKU and Products
  - Safe to run multiple times
  - Shows progress & summary

- **populate_product_identifiers.cjs** - Bulk data population
  - Reads Excel files
  - Populates Product_Identifiers subform
  - Skips existing data
  - Platform IDs (Amazon ASIN, Flipkart FSN, etc.)

- **verify_data_quality.js** - Validate CRM data
  - Check field completeness
  - Detect missing required fields
  - Report data quality percentage

- **templates/** - Script templates for common tasks
  - Bulk import template
  - Field update template
  - Subform population template

### 4. Config (`config/`)

Configuration files for quick setup:

- **field_mappings.json** - Complete CRM schema
  - All module definitions
  - Field API names & types
  - Subform structures
  - Unit specifications

- **.env.example** - Environment template
  - Zoho OAuth credentials
  - API endpoints
  - MCP server settings

- **slate.config.json** - Catalyst Slate deployment
  - CSP headers for iframe embedding
  - Static file hosting
  - Auto-deploy settings

### 5. Examples (`examples/`)

Working code examples:

- **fetch_all_records.js** - Pagination pattern
- **batch_update.js** - Bulk operations with rate limiting
- **subform_operations.js** - Create/update/delete subform rows
- **search_by_criteria.js** - Complex search queries
- **transaction_rollback.js** - Checkpoint & restore pattern

---

## 🎯 Common Integration Tasks

### Task 1: Fetch All Products with Pagination

```javascript
import ZohoAPI from './ZohoIntegration/services/ZohoAPI';

const zoho = new ZohoAPI();
await zoho.init();

const products = await zoho.fetchAllRecords('Products',
  'Product_Code,Product_Name,Total_Weight,Bill_Dimension_Weight'
);

console.log(`Fetched ${products.length} products`);
```

See: `examples/fetch_all_records.js`

### Task 2: Update Multiple Products

```javascript
const updates = [
  { id: '123', data: { Total_Weight: 5.5 } },
  { id: '456', data: { Total_Weight: 3.2 } }
];

await zoho.batchUpdateProducts(updates, (progress) => {
  console.log(`${progress.current}/${progress.total}`);
});
```

See: `examples/batch_update.js`

### Task 3: Populate Subform Data

```javascript
const productId = '123456';
const boxes = [
  { Box: 1, Length: 50, Width: 30, Height: 20, Weight: 2.5 },
  { Box: 2, Length: 40, Width: 25, Height: 15, Weight: 1.8 }
];

await zoho.updateProduct({
  id: productId,
  Bill_Dimension_Weight: boxes
});
```

See: `examples/subform_operations.js`

### Task 4: Clean Duplicate Subform Entries

```bash
node ZohoIntegration/scripts/cleanup_duplicate_boxes.cjs
```

See: `scripts/cleanup_duplicate_boxes.cjs`

### Task 5: Bulk Import from Excel

```bash
# Use the populate script as template
cp ZohoIntegration/scripts/templates/bulk_import_template.cjs my_import.cjs
# Edit my_import.cjs with your logic
node my_import.cjs
```

See: `scripts/templates/bulk_import_template.cjs`

---

## 🔐 Security Best Practices

### 1. Credentials

- ✅ **NEVER commit `.env` or `.env.mcp` files**
- ✅ Add to `.gitignore`:
  ```gitignore
  .env
  .env.*
  *.env
  **/zoho_credentials.json
  ```
- ✅ Use `.env.example` template for team sharing
- ✅ Regenerate OAuth tokens if accidentally committed

### 2. API Keys

- ✅ Store in environment variables
- ✅ Use separate credentials for dev/prod
- ✅ Rotate tokens regularly
- ✅ Never log credentials

### 3. Rate Limiting

- ✅ Respect Zoho's 100 req/min limit (client-side SDK)
- ✅ Use 500ms delay between batch updates
- ✅ Implement exponential backoff on errors

---

## 📖 Integration Patterns

### Pattern 1: Dual-Mode Service (Dev + Prod)

```javascript
class ZohoAPI {
  constructor() {
    this.isDevelopment = import.meta.env.VITE_API_MODE === 'mock';
  }

  async fetchAllRecords(module) {
    if (this.isDevelopment) {
      return MOCK_DATA; // Local testing
    }
    // Real SDK call
    return await ZOHO.CRM.API.getAllRecords({ Entity: module });
  }
}
```

### Pattern 2: Pagination Loop

```javascript
async fetchAllRecords(module, fields = 'all') {
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

    if (records.length < 200) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allRecords;
}
```

### Pattern 3: Batch Processing with Rate Limiting

```javascript
async batchUpdate(products, onProgress) {
  const batchSize = 10;
  const delay = 500; // ms

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    await Promise.all(
      batch.map(p => this.updateProduct(p))
    );

    onProgress({ current: i + batch.length, total: products.length });
    await new Promise(r => setTimeout(r, delay));
  }
}
```

### Pattern 4: Error Handling with Retry

```javascript
async updateWithRetry(productId, data, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ZOHO.CRM.API.updateRecord({
        Entity: 'Products',
        APIData: { id: productId, ...data }
      });
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
    }
  }
}
```

---

## 🛠️ Tools & Utilities

### MCP Server (Model Context Protocol)

For AI-powered CRM operations and bulk scripts:

```bash
# Install MCP SDK
npm install @modelcontextprotocol/sdk

# Configure .env.mcp
ZOHO_CLIENT_ID=your_id
ZOHO_CLIENT_SECRET=your_secret
ZOHO_REFRESH_TOKEN=your_token

# Use in scripts
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
```

See: `knowledge_base/MCP_INTEGRATION.md`

### Zoho Embedded SDK

For client-side widgets inside CRM:

```html
<script src="https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js"></script>
```

See: `knowledge_base/ZOHO_SDK_REFERENCE.md`

---

## 📊 Data Quality

### Validation Checklist

Before deploying any integration:

- [ ] All required fields mapped correctly
- [ ] Units verified (weights in KG, dimensions in cm)
- [ ] Subforms tested with sample data
- [ ] Pagination tested with > 200 records
- [ ] Rate limits respected (< 100 req/min)
- [ ] Error handling tested (network failures, field errors)
- [ ] Development mode works with mock data
- [ ] Production mode tested in Zoho widget
- [ ] Rollback/checkpoint mechanism in place

### Run Data Quality Check

```bash
node ZohoIntegration/scripts/verify_data_quality.js
```

---

## 🚢 Deployment

### Catalyst Slate Deployment

```bash
# Build React app
npm run build

# Deploy to Catalyst Slate
# (Auto-deploys on GitHub push)
git add .
git commit -m "Deploy update"
git push origin main

# App updates in ~2 minutes
# URL: https://yourapp.onslate.com
```

See: `config/slate.config.json`

---

## 🤝 Contributing

This module is designed to grow with each project. When you build new patterns or solutions:

1. Add to `knowledge_base/` if it's a concept/pattern
2. Add to `examples/` if it's working code
3. Add to `scripts/` if it's a reusable script
4. Update this README with new capabilities

---

## 📞 Support

### Resources

- **Zoho SDK Docs**: https://www.zoho.com/crm/developer/docs/widgets/
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Catalyst Slate**: https://www.zoho.com/catalyst/slate.html

### Common Issues

See: `knowledge_base/TROUBLESHOOTING.md`

---

## 📝 License

This module is part of the Dimensions Audit Authenticator project.
Free to use and modify for any Zoho CRM integration.

---

**Last Updated**: February 15, 2026
**Version**: 1.0.0
**Status**: Production Ready ✅

---

## 🎯 Next Steps

1. Copy this folder to your new app
2. Read `knowledge_base/ZOHO_SDK_REFERENCE.md` for SDK overview
3. Check `examples/` for code patterns
4. Copy `services/ZohoAPI.js` to your app
5. Configure `.env.mcp` for MCP scripts
6. Start building! 🚀
