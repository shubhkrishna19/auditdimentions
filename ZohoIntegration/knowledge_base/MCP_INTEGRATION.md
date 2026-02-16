# MCP (Model Context Protocol) Integration for Zoho CRM

Complete guide to using MCP for Zoho CRM operations in Node.js scripts.

---

## Overview

**MCP** (Model Context Protocol) enables AI-powered and automated operations with Zoho CRM from Node.js scripts.

⚠️ **CRITICAL LIMITATION**: MCP Server is **READ-ONLY** for most Zoho implementations!

**What MCP CAN do**:
- ✅ Read all CRM data (Get_Records, Get_Record)
- ✅ Search and filter with complex queries
- ✅ Inspect metadata (field definitions, module structures)
- ✅ Read-only analytics (data verification, audits, reports)

**What MCP CANNOT do** (or has issues with):
- ❌ Write/Update records - Returns SUCCESS but doesn't persist changes
- ❌ Delete records - Read-only limitation
- ❌ Create records - Read-only limitation

**When to use**:
- ✅ Data inspection and audits
- ✅ Read-only analytics
- ✅ Data verification before migration
- ✅ AI-powered data analysis
- ❌ NOT for data modification/updates

**For Write Operations**: Use Direct OAuth API with HTTP calls (see below)

**Key Difference from SDK**: MCP scripts use **HTTP calls**, NOT SDK methods!

---

## 📊 MCP vs Direct OAuth API Comparison

| Feature | MCP Server | Direct OAuth API |
|---------|-----------|------------------|
| **Read Records** | ✅ Excellent | ✅ Works |
| **Write/Update** | ❌ Read-only (returns SUCCESS but doesn't persist) | ✅ Full access |
| **Delete Records** | ❌ Read-only | ✅ Full access |
| **Search/Filter** | ✅ Powerful | ✅ Works |
| **Bulk Operations** | ❌ Limited (read-only) | ✅ Full access |
| **Authentication** | Simple (API key) | Complex (OAuth) |
| **Rate Limits** | Server-dependent | 100 req/min (standard) |
| **Use Case** | Data inspection, audits | Data modification |
| **Best For** | Read-only analytics | Production CRUD operations |

### 🎯 Recommendation

**Use MCP Server for**:
- ✅ Reading and analyzing CRM data
- ✅ Data verification and audits
- ✅ Generating reports
- ✅ AI-powered data inspection

**Use Direct OAuth API for**:
- ✅ Creating new records
- ✅ Updating existing records
- ✅ Deleting records
- ✅ Production data modifications
- ✅ Bulk imports/updates

---

## 💡 Best Practice Architecture

### Hybrid Approach (Recommended)

```javascript
// Use MCP for reading/verification
const mcpClient = new MCPClient();
const products = await mcpClient.readRecords('Products');

// Analyze data with MCP
const outdatedProducts = products.filter(p => needsUpdate(p));

// Use Direct API for updates
const axios = require('axios');
const accessToken = await getAccessToken();

for (const product of outdatedProducts) {
  await axios.put(
    `https://www.zohoapis.com/crm/v2/Products/${product.id}`,
    { data: [{ id: product.id, ...updateData }] },
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
}
```

---

## Setup

### 1. Install MCP SDK

```bash
npm install @modelcontextprotocol/sdk
```

### 2. Create `.env.mcp` File

**IMPORTANT**: Never commit this file! Add to `.gitignore`

```env
# Zoho OAuth Credentials
ZOHO_CLIENT_ID=your_client_id_here
ZOHO_CLIENT_SECRET=your_client_secret_here
ZOHO_REFRESH_TOKEN=your_refresh_token_here

# Zoho API Endpoints
ZOHO_API_DOMAIN=https://www.zohoapis.com
ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
```

### 3. Get OAuth Credentials

1. Go to https://api-console.zoho.com/
2. Create "Self Client" app
3. Generate token with scopes:
   - `ZohoCRM.modules.ALL`
   - `ZohoCRM.settings.ALL`
4. Copy Client ID, Client Secret, and Refresh Token to `.env.mcp`

---

## ⚠️ CRITICAL: HTTP Calls Only!

**MCP scripts use HTTP endpoints, NOT SDK methods!**

```javascript
// ❌ WRONG - SDK methods don't work in MCP
const response = await client.callTool({
  name: 'zoho-crm_get-records',
  arguments: {
    module: 'Products',
    method: 'ZOHO.CRM.API.getAllRecords'  // ❌ NO!
  }
});

// ✅ CORRECT - HTTP endpoint calls
const response = await axios.get(
  'https://www.zohoapis.com/crm/v2/Products',
  {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`
    },
    params: {
      fields: 'Product_Code,Product_Name,Total_Weight',
      per_page: 200,
      page: 1
    }
  }
);
```

---

## Basic MCP Script Template

### Using Axios (Recommended)

```javascript
require('dotenv').config({ path: '.env.mcp' });
const axios = require('axios');

// Get Access Token from Refresh Token
async function getAccessToken() {
  const response = await axios.post(
    `${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`,
    null,
    {
      params: {
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      }
    }
  );

  return response.data.access_token;
}

// Fetch Products
async function fetchProducts(accessToken) {
  const response = await axios.get(
    `${process.env.ZOHO_API_DOMAIN}/crm/v2/Products`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`
      },
      params: {
        fields: 'Product_Code,Product_Name,Total_Weight',
        per_page: 200,
        page: 1
      }
    }
  );

  return response.data.data || [];
}

// Main
async function main() {
  console.log('🚀 Starting script...');

  const accessToken = await getAccessToken();
  const products = await fetchProducts(accessToken);

  console.log(`✅ Fetched ${products.length} products`);
}

main().catch(console.error);
```

---

## HTTP Endpoints Reference

### Get Records (Paginated)

```javascript
const response = await axios.get(
  `${process.env.ZOHO_API_DOMAIN}/crm/v2/${module}`,
  {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`
    },
    params: {
      fields: 'Product_Code,Product_Name', // Comma-separated or 'all'
      per_page: 200,  // Max 200
      page: 1         // Start from 1
    }
  }
);

const records = response.data.data || [];
```

### Get Single Record

```javascript
const response = await axios.get(
  `${process.env.ZOHO_API_DOMAIN}/crm/v2/${module}/${recordId}`,
  {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`
    }
  }
);

const record = response.data.data[0];
```

### Update Record

```javascript
const response = await axios.put(
  `${process.env.ZOHO_API_DOMAIN}/crm/v2/${module}/${recordId}`,
  {
    data: [
      {
        id: recordId,
        Product_Name: 'Updated Name',
        Total_Weight: 5.5
      }
    ]
  },
  {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }
);

const result = response.data.data[0];
if (result.code === 'SUCCESS') {
  console.log('✅ Updated successfully');
}
```

### Insert Record

```javascript
const response = await axios.post(
  `${process.env.ZOHO_API_DOMAIN}/crm/v2/${module}`,
  {
    data: [
      {
        Product_Code: 'NEW-SKU-001',
        Product_Name: 'New Product',
        Total_Weight: 3.5
      }
    ]
  },
  {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }
);

const newRecordId = response.data.data[0].details.id;
```

### Delete Record

```javascript
const response = await axios.delete(
  `${process.env.ZOHO_API_DOMAIN}/crm/v2/${module}/${recordId}`,
  {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`
    }
  }
);

if (response.data.data[0].code === 'SUCCESS') {
  console.log('✅ Deleted successfully');
}
```

### Search Records

```javascript
const response = await axios.get(
  `${process.env.ZOHO_API_DOMAIN}/crm/v2/${module}/search`,
  {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`
    },
    params: {
      criteria: '(Product_Code:equals:ABC-123)',
      fields: 'Product_Code,Product_Name'
    }
  }
);

const results = response.data.data || [];
```

---

## Pagination Pattern

```javascript
async function fetchAllRecords(module, accessToken, fields = 'all') {
  let allRecords = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await axios.get(
      `${process.env.ZOHO_API_DOMAIN}/crm/v2/${module}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          fields: fields,
          per_page: 200,
          page: page
        }
      }
    );

    const records = response.data.data || [];
    allRecords = allRecords.concat(records);

    console.log(`📄 Page ${page}: ${records.length} records`);

    if (records.length < 200) {
      hasMore = false;
    } else {
      page++;
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`✅ Total: ${allRecords.length} records`);
  return allRecords;
}
```

---

## Batch Update Pattern

```javascript
async function batchUpdate(module, updates, accessToken) {
  const batchSize = 10;
  const delay = 500;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    // Process batch
    const results = await Promise.allSettled(
      batch.map(update =>
        axios.put(
          `${process.env.ZOHO_API_DOMAIN}/crm/v2/${module}/${update.id}`,
          { data: [update] },
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        )
      )
    );

    // Count results
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' &&
          result.value.data.data[0].code === 'SUCCESS') {
        successCount++;
      } else {
        errorCount++;
        console.error(`❌ Failed: ${batch[idx].id}`);
      }
    });

    console.log(`Progress: ${i + batch.length}/${updates.length}`);

    // Rate limiting
    if (i + batchSize < updates.length) {
      await new Promise(r => setTimeout(r, delay));
    }
  }

  return { success: successCount, errors: errorCount };
}
```

---

## Subform Operations

### Update Subform Data

```javascript
const boxes = [
  { Box: 1, Length: 50, Width: 30, Height: 20, Weight: 2.5 },
  { Box: 2, Length: 40, Width: 25, Height: 15, Weight: 1.8 }
];

const response = await axios.put(
  `${process.env.ZOHO_API_DOMAIN}/crm/v2/Products/${productId}`,
  {
    data: [
      {
        id: productId,
        Bill_Dimension_Weight: boxes  // Subform field
      }
    ]
  },
  {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }
);
```

### Clear Subform Data

```javascript
// Send empty array to clear all rows
const response = await axios.put(
  `${process.env.ZOHO_API_DOMAIN}/crm/v2/Products/${productId}`,
  {
    data: [
      {
        id: productId,
        Bill_Dimension_Weight: []  // Empty array clears subform
      }
    ]
  },
  {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }
);
```

---

## CommonJS vs ES Modules

### Issue: `"type": "module"` in package.json

If your `package.json` has `"type": "module"`, you must use `.cjs` extension for CommonJS scripts.

```javascript
// File: cleanup_script.cjs (note .cjs extension)

require('dotenv').config({ path: '.env.mcp' });
const axios = require('axios');

// CommonJS syntax
module.exports = async function cleanup() {
  // ...
};
```

**Run with**:
```bash
node scripts/cleanup_script.cjs
```

### Alternative: ES Module Syntax

```javascript
// File: cleanup_script.js (using .js with "type": "module")

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.mcp' });

// ES module syntax
export async function cleanup() {
  // ...
}

// Run directly
cleanup().catch(console.error);
```

---

## ⚠️ Important: Production Scripts Use Direct OAuth API

**Our production scripts** ([cleanup_duplicate_boxes.cjs](../scripts/cleanup_duplicate_boxes.cjs), [populate_product_identifiers.cjs](../scripts/populate_product_identifiers.cjs)) **do NOT use MCP Server**.

**Why?** MCP Server is read-only. For data modification, we use Direct OAuth API with axios.

**Pattern used**:
```javascript
// Direct OAuth API (NOT MCP)
const accessToken = await getAccessToken();

const response = await axios.put(
  `https://www.zohoapis.com/crm/v2/Products/${productId}`,
  { data: [updateData] },
  {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }
);
```

**MCP is only useful for**:
- Reading data for analysis
- Verifying data before modification
- Generating reports

---

## Complete Example Script

### cleanup_duplicate_boxes.cjs (Using Direct OAuth API)

```javascript
require('dotenv').config({ path: '.env.mcp' });
const axios = require('axios');

// Get Access Token
async function getAccessToken() {
  const response = await axios.post(
    `${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`,
    null,
    {
      params: {
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      }
    }
  );

  return response.data.access_token;
}

// Deduplicate boxes
function deduplicateBoxes(boxes) {
  if (!boxes || boxes.length === 0) return [];

  const seen = new Set();
  const unique = [];

  for (const box of boxes) {
    const key = `${box.Box || box.BL}-${box.Length}-${box.Width}-${box.Height}-${box.Weight}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(box);
    }
  }

  return unique;
}

async function cleanupDuplicates() {
  console.log('🧹 Starting cleanup...\n');

  const accessToken = await getAccessToken();
  console.log('✅ Authenticated\n');

  // Fetch all products
  const response = await axios.get(
    `${process.env.ZOHO_API_DOMAIN}/crm/v2/Products`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`
      },
      params: {
        fields: 'all',
        per_page: 200
      }
    }
  );

  const products = response.data.data || [];
  console.log(`📦 Found ${products.length} products\n`);

  let cleaned = 0;
  let duplicatesRemoved = 0;

  for (const product of products) {
    const originalBoxes = product.Bill_Dimension_Weight || [];
    const uniqueBoxes = deduplicateBoxes(originalBoxes);

    if (originalBoxes.length !== uniqueBoxes.length) {
      const removed = originalBoxes.length - uniqueBoxes.length;
      console.log(`   ${product.Product_Code}: ${originalBoxes.length} → ${uniqueBoxes.length} boxes (removed ${removed})`);

      // Update product
      await axios.put(
        `${process.env.ZOHO_API_DOMAIN}/crm/v2/Products/${product.id}`,
        {
          data: [
            {
              id: product.id,
              Bill_Dimension_Weight: uniqueBoxes
            }
          ]
        },
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      cleaned++;
      duplicatesRemoved += removed;

      // Rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CLEANUP SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Products cleaned: ${cleaned}`);
  console.log(`📦 Duplicate boxes removed: ${duplicatesRemoved}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

cleanupDuplicates()
  .then(() => {
    console.log('✅ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
```

---

## Error Handling

### Access Token Expiry

```javascript
async function makeAuthenticatedRequest(url, config) {
  try {
    return await axios.get(url, config);
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired, refresh it
      console.log('🔄 Refreshing access token...');
      const newToken = await getAccessToken();

      // Retry with new token
      config.headers.Authorization = `Zoho-oauthtoken ${newToken}`;
      return await axios.get(url, config);
    }

    throw error;
  }
}
```

### Rate Limit Errors

```javascript
async function updateWithRetry(url, data, config, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.put(url, data, config);
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limit hit
        const delay = 1000 * (i + 1); // Exponential backoff
        console.warn(`⏳ Rate limit hit, waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else if (i === retries - 1) {
        throw error;
      }
    }
  }
}
```

---

## Best Practices

1. **Always use `.cjs` extension** if package.json has `"type": "module"`
2. **Rate limit**: 500ms delay between batches
3. **Pagination**: Loop through all pages for > 200 records
4. **Error handling**: Retry with exponential backoff
5. **Progress logging**: Show progress for long operations
6. **Access token caching**: Reuse token for 1 hour (Zoho token lifetime)

---

## Resources

- **Zoho CRM API Docs**: https://www.zoho.com/crm/developer/docs/api/v2/
- **OAuth Setup**: https://www.zoho.com/crm/developer/docs/api/v2/auth.html
- **API Console**: https://api-console.zoho.com/

---

**Last Updated**: February 15, 2026
**API Version**: v2
