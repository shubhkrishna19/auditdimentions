import fs from 'fs';
import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

// Helper for batched processing
const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

async function runSmartRepair() {
  console.log('🚀 Starting Smart CRM Data Repair...');

  // 1. Load Master Data (for reference/fallback)
  const masterData = JSON.parse(fs.readFileSync('unified_master_data.json', 'utf8'));
  const skuMap = new Map(masterData.map(r => [r.sku, r]));

  console.log(`Loaded ${masterData.length} records from master.`);

  // 2. We will scan ALL parents if possible, or iterate master list SKUs
  // Iterating master list is safer to ensure we cover known products.

  const idsToProcess = masterData.filter(r => r.module === 'Parent_MTP_SKU').map(r => r.sku);
  console.log(`Targeting ${idsToProcess.length} Parent SKUs for repair.`);

  const BATCH_SIZE = 5;
  const batches = chunk(idsToProcess, BATCH_SIZE);

  let stats = { fixed: 0, skipped: 0, failed: 0, notFound: 0 };

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n--- Processing Batch ${i + 1}/${batches.length} ---`);

    for (const sku of batch) {
      try {
        // A. Fetch Current State
        const searchPayload = {
          jsonrpc: "2.0", id: 1, method: "tools/call",
          params: {
            name: "ZohoCRM_Search_Records",
            arguments: {
              path_variables: { module: "Parent_MTP_SKU" },
              query_params: { criteria: `(Name:equals:${sku})` }
            }
          }
        };

        const searchRes = await axios.post(BASE_URL, searchPayload);

        if (searchRes.data.result?.content?.[0]?.text) {
          const searchResult = JSON.parse(searchRes.data.result.content[0].text);
          if (!searchResult.data || searchResult.data.length === 0) {
            console.log(`⚠️ SKU Not Found: ${sku}`);
            stats.notFound++;
            continue;
          }

          const record = searchResult.data[0];
          const recordId = record.id;

          // B. Analyze Data
          let prodCat = record.Product_Category || '';
          let weightCat = record.Weight_Category_Billed || '';

          const prodCatIsWeight = /^\d+\s*kg$/i.test(prodCat);
          const weightCatIsGood = /^\d+\s*kg$/i.test(weightCat);

          let updates = {};

          // CASE 1: Swap (Product Category has Weight)
          if (prodCatIsWeight) {
            console.log(`🔧 Fix needed for ${sku}: ProdCat is '${prodCat}' (Weight)`);
            updates.Weight_Category_Billed = prodCat;
            updates.Product_Category = null; // Clear it, or infer?

            // Try to restore ProdCat if we cleared it
            // TODO: Infer from Master if available? Master doesn't have it explicitly.
            // For now, at least move the weight to the right place.
          }

          // CASE 2: Missing Weight Category (but Master has it)
          if (!weightCat && !updates.Weight_Category_Billed) {
            const masterRec = skuMap.get(sku);
            if (masterRec && masterRec.category && /^\d+\s*kg$/i.test(masterRec.category)) {
              console.log(`🔧 Filling missing Weight for ${sku}: '${masterRec.category}'`);
              updates.Weight_Category_Billed = masterRec.category;
            }
          }

          // C. Apply Updates if any
          if (Object.keys(updates).length > 0) {
            const updatePayload = {
              jsonrpc: "2.0", id: 2, method: "tools/call",
              params: {
                name: "ZohoCRM_Update_Record",
                arguments: {
                  path_variables: { module: "Parent_MTP_SKU", recordID: recordId },
                  body: { data: [updates] }
                }
              }
            };

            const updateRes = await axios.post(BASE_URL, updatePayload);
            if (updateRes.data.error) {
              console.log(`❌ Update failed: ${updateRes.data.error.message}`);
              stats.failed++;
            } else {
              console.log(`✅ Fixed ${sku}`);
              stats.fixed++;
            }
          } else {
            console.log(`✨ ${sku} is OK.`);
            stats.skipped++;
          }

        } else {
          stats.notFound++;
        }

      } catch (err) {
        console.log(`❌ Error on ${sku}: ${err.message}`);
        stats.failed++;
      }
    }
  }

  console.log(`\n🎉 Repair Complete!`);
  console.log(`Fixed: ${stats.fixed}, Skipped: ${stats.skipped}, Failed: ${stats.failed}, NotFound: ${stats.notFound}`);
}

runSmartRepair();
