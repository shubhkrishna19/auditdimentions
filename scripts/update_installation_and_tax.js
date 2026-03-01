/**
 * Update Installation Status, Price, and Tax Rate in Zoho CRM
 *
 * Updates:
 * - Parent_MTP_SKU: Installation = "DIY", Installation_Price = 500
 * - Products: Installation_Mode = "DIY" (actual: "3 party"), Installation_Price = 500, Tax_Rate = 18%
 */

import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

// Helper for MCP API calls - properly parses the response
async function mcpRequest(toolName, args) {
  const payload = {
    jsonrpc: "2.0",
    id: Math.floor(Math.random() * 10000),
    method: "tools/call",
    params: { name: toolName, arguments: args }
  };

  const res = await axios.post(BASE_URL, payload);
  const resultText = res.data.result.content[0].text;
  return JSON.parse(resultText);
}

// Fetch all records from a module with pagination
async function fetchAllRecords(module) {
  let allRecords = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`  Fetching ${module} page ${page}...`);

    const result = await mcpRequest("ZohoCRM_Get_Records", {
      path_variables: { module },
      query_params: { per_page: 200, page, fields: "id,Name,Product_Code" }
    });

    const records = result.data || [];
    allRecords = allRecords.concat(records);

    console.log(`    Got ${records.length} records`);

    if (records.length < 200) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allRecords;
}

// Update a single record
async function updateRecord(module, recordId, data) {
  const payload = {
    jsonrpc: "2.0",
    id: Math.floor(Math.random() * 10000),
    method: "tools/call",
    params: {
      name: "ZohoCRM_Update_Record",
      arguments: {
        path_variables: { module, recordID: recordId },
        body: { data: [data] }
      }
    }
  };

  const res = await axios.post(BASE_URL, payload);

  // Check if there's an error in the response
  if (res.data.result?.isError) {
    const errorText = res.data.result.content[0].text;
    throw new Error(errorText);
  }

  const resultText = res.data.result.content[0].text;
  return JSON.parse(resultText);
}

async function main() {
  console.log('Starting Installation & Tax Rate Update...\n');

  // ========== UPDATE PARENT_MTP_SKU ==========
  console.log('Processing Parent_MTP_SKU module...');

  const parents = await fetchAllRecords('Parent_MTP_SKU');
  console.log(`   Found ${parents.length} parent records.`);

  let parentUpdated = 0;
  let parentFailed = 0;

  for (const parent of parents) {
    try {
      await updateRecord('Parent_MTP_SKU', parent.id, {
        Installation: "DIY",
        Installation_Price: 500
      });
      parentUpdated++;
      if (parentUpdated % 20 === 0) {
        console.log(`   Updated ${parentUpdated} parents...`);
      }
    } catch (err) {
      parentFailed++;
      console.log(`   Failed to update parent ${parent.Name || parent.id}: ${err.message}`);
    }
  }

  console.log(`   Parent update complete: ${parentUpdated} updated, ${parentFailed} failed.`);

  // ========== UPDATE PRODUCTS ==========
  console.log('\nProcessing Products module...');

  const products = await fetchAllRecords('Products');
  console.log(`   Found ${products.length} product records.`);

  let productUpdated = 0;
  let productFailed = 0;

  for (const product of products) {
    try {
      await updateRecord('Products', product.id, {
        Installation_Mode: "3 party",
        Installation_Price: 500,
        Tax_Rate: "18%"
      });
      productUpdated++;
      if (productUpdated % 50 === 0) {
        console.log(`   Updated ${productUpdated} products...`);
      }
    } catch (err) {
      productFailed++;
      console.log(`   Failed to update product ${product.Name || product.Product_Code || product.id}: ${err.message}`);
    }
  }

  console.log(`   Product update complete: ${productUpdated} updated, ${productFailed} failed.`);

  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(50));
  console.log('UPDATE SUMMARY');
  console.log('='.repeat(50));
  console.log(`Parent_MTP_SKU: ${parentUpdated} updated, ${parentFailed} failed`);
  console.log(`Products:       ${productUpdated} updated, ${productFailed} failed`);
  console.log(`Total:          ${parentUpdated + productUpdated} updated, ${parentFailed + productFailed} failed`);
  console.log('='.repeat(50));

  console.log('\nUpdate complete!');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
