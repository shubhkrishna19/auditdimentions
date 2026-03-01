import fs from 'fs';
import axios from 'axios';
import XLSX from 'xlsx';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  DRY_RUN: true,  // SET TO false TO EXECUTE ACTUAL UPDATES
  BATCH_SIZE: 5,
  DELAY_BETWEEN_BATCHES: 1000, // ms

  // Live Status Mapping (from Excel "Chck" column)
  LIVE_STATUS_MAP: {
    'Y': 'Live',           // Live
    'y': 'Live',           // Live (lowercase)
    'YB': 'Live',          // Live with balancing Material
    'YD': 'Live',          // Live til Diwali
    'RL': 'Not Live',      // Relaunch
    'NL': 'Not Live',      // New Launch
    'AR': 'Not Live',      // Assumed "Archive" or not active
    'DI': 'Not Live',      // Discontinued
    'MW': 'Not Live',      // Unknown status
    'YH': 'Live',          // Assumed live variant
    'YHRL': 'Live'         // Assumed live variant
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callMCP(toolName, args) {
  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args
    }
  };

  const response = await axios.post(BASE_URL, payload);

  if (response.data.error) {
    throw new Error(`MCP Error: ${response.data.error.message}`);
  }

  if (response.data.result?.content?.[0]?.text) {
    return JSON.parse(response.data.result.content[0].text);
  }

  return response.data.result;
}

// ============================================================================
// DATA LOADING FUNCTIONS
// ============================================================================

function loadUnifiedMasterData() {
  console.log('📂 Loading unified_master_data.json...');
  const data = JSON.parse(fs.readFileSync('unified_master_data.json', 'utf8'));
  console.log(`   ✅ Loaded ${data.length} records`);
  return data;
}

function loadDimensionsFile() {
  console.log('📂 Loading DimensionsMasterLatest.xlsx...');
  const workbook = XLSX.readFile('DimensionsMasterLatest.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON starting from row 3 (header row is 2)
  const data = XLSX.utils.sheet_to_json(sheet, { range: 2 });
  console.log(`   ✅ Loaded ${data.length} dimension records`);
  return data;
}

function loadSKUAliasesFile() {
  console.log('📂 Loading SKU Aliases file...');
  const workbook = XLSX.readFile('SKU Aliases, Parent & Child Master Data LATEST .xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`   ✅ Loaded ${data.length} SKU alias records`);
  return data;
}

// ============================================================================
// DATA PROCESSING FUNCTIONS
// ============================================================================

function buildDimensionsMap(dimensionsData) {
  console.log('\n🔨 Building dimensions lookup map...');
  const map = new Map();

  dimensionsData.forEach(row => {
    const sku = row['MTP SKU Code'];
    if (!sku) return;

    const weightGrams = row['Gms'] || 0;
    const weightKg = weightGrams / 1000;

    // Determine weight category
    let weightCategory;
    if (weightKg < 5) weightCategory = '<5kg';
    else if (weightKg < 20) weightCategory = '5-20kg';
    else if (weightKg < 50) weightCategory = '20-50kg';
    else weightCategory = '>50kg';

    map.set(sku, {
      weight_kg: weightKg,
      weight_category: weightCategory,
      box1_length: row['Lcm'] || 0,
      box1_width: row['Bcm'] || 0,
      box1_height: row['Hcm'] || 0
    });
  });

  console.log(`   ✅ Created dimension map for ${map.size} SKUs`);
  return map;
}

function buildLiveStatusMap(aliasData) {
  console.log('\n🔨 Building live status lookup map...');
  const map = new Map();

  aliasData.forEach(row => {
    const sellerSKU = row['Seller SKU'];
    const mtpSKU = row['MTP SKU'];
    const chck = row['Chck'] || '';

    // Map live status code to "Live" or "Not Live"
    const liveStatus = CONFIG.LIVE_STATUS_MAP[chck] || 'Not Live';

    if (sellerSKU) {
      map.set(sellerSKU, {
        mtp_sku: mtpSKU,
        live_status: liveStatus,
        original_code: chck
      });
    }
  });

  console.log(`   ✅ Created live status map for ${map.size} SKUs`);
  return map;
}

function calculateParentLiveStatus(parentSKU, childrenLiveStatuses) {
  // If ANY child is Live, parent is Live
  // If ALL children are Not Live, parent is Not Live
  const hasLiveChild = childrenLiveStatuses.some(status => status === 'Live');
  return hasLiveChild ? 'Live' : 'Not Live';
}

// ============================================================================
// CRM INTERACTION FUNCTIONS
// ============================================================================

async function searchRecord(module, sku, fieldName = 'Name') {
  try {
    const result = await callMCP('ZohoCRM_Search_Records', {
      path_variables: { module },
      query_params: { criteria: `(${fieldName}:equals:${sku})` }
    });

    if (result.data && result.data.length > 0) {
      return result.data[0];
    }
    return null;
  } catch (error) {
    console.error(`   ❌ Error searching ${sku}:`, error.message);
    return null;
  }
}

async function updateRecord(module, recordId, updates) {
  if (CONFIG.DRY_RUN) {
    console.log(`   [DRY RUN] Would update ${module} ${recordId}:`, updates);
    return { success: true, dry_run: true };
  }

  try {
    const result = await callMCP('ZohoCRM_Update_Record', {
      path_variables: { module, recordID: recordId },
      body: { data: [updates] }
    });

    return { success: true, data: result };
  } catch (error) {
    console.error(`   ❌ Update failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function getChildrenForParent(parentId) {
  try {
    const result = await callMCP('ZohoCRM_Search_Records', {
      path_variables: { module: 'Products' },
      query_params: { criteria: `(MTP_SKU:equals:${parentId})` }
    });

    return result.data || [];
  } catch (error) {
    console.error(`   ❌ Error fetching children:`, error.message);
    return [];
  }
}

// ============================================================================
// POPULATION LOGIC
// ============================================================================

async function populateParentMTPSKU(masterData, dimensionsMap, liveStatusMap) {
  console.log('\n' + '='.repeat(80));
  console.log('📦 POPULATING PARENT_MTP_SKU RECORDS');
  console.log('='.repeat(80));

  const parentRecords = masterData.filter(r => r.module === 'Parent_MTP_SKU');
  console.log(`\nProcessing ${parentRecords.length} parent SKU records...\n`);

  const stats = {
    total: parentRecords.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    notFound: 0
  };

  const batches = chunk(parentRecords, CONFIG.BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    console.log(`\n--- Batch ${i + 1}/${batches.length} ---`);

    for (const record of batches[i]) {
      const sku = record.sku; // Fixed: use record.sku for parent records
      console.log(`\n🔍 Processing: ${sku}`);

      // Search in CRM
      const crmRecord = await searchRecord('Parent_MTP_SKU', sku, 'Name');

      if (!crmRecord) {
        console.log(`   ⚠️ Not found in CRM`);
        stats.notFound++;
        continue;
      }

      // Get dimension data
      const dimensions = dimensionsMap.get(sku);

      if (!dimensions) {
        console.log(`   ⚠️ No dimension data available`);
        stats.skipped++;
        continue;
      }

      // Get all children to calculate parent live status
      const children = await getChildrenForParent(crmRecord.id);
      const childrenLiveStatuses = children.map(child => {
        const childSKU = child.Product_Code;
        const liveData = liveStatusMap.get(childSKU);
        return liveData ? liveData.live_status : 'Not Live';
      });

      const parentLiveStatus = calculateParentLiveStatus(sku, childrenLiveStatuses);

      // Build updates
      const updates = {};

      // Only update if field is empty or different
      if (!crmRecord.Billed_Physical_Weight || crmRecord.Billed_Physical_Weight === 0) {
        updates.Billed_Physical_Weight = dimensions.weight_kg;
        console.log(`   📝 Billed_Physical_Weight: ${dimensions.weight_kg} kg`);
      }

      if (!crmRecord.Weight_Category_Billed) {
        updates.Weight_Category_Billed = dimensions.weight_category;
        console.log(`   📝 Weight_Category_Billed: ${dimensions.weight_category}`);
      }

      if (!crmRecord.Product_Category) {
        updates.Product_Category = record.category;
        console.log(`   📝 Product_Category: ${record.category}`);
      }

      if (!crmRecord.Live_Status) {
        updates.Live_Status = parentLiveStatus;
        console.log(`   📝 Live_Status: ${parentLiveStatus} (based on ${children.length} children)`);
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        const result = await updateRecord('Parent_MTP_SKU', crmRecord.id, updates);
        if (result.success) {
          console.log(`   ✅ Updated successfully`);
          stats.updated++;
        } else {
          console.log(`   ❌ Update failed`);
          stats.failed++;
        }
      } else {
        console.log(`   ✨ Already complete, skipped`);
        stats.skipped++;
      }
    }

    if (i < batches.length - 1) {
      console.log(`\n⏳ Waiting ${CONFIG.DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
    }
  }

  return stats;
}

async function populateProducts(masterData, liveStatusMap, dimensionsMap) {
  console.log('\n' + '='.repeat(80));
  console.log('🎨 POPULATING PRODUCTS (CHILD) RECORDS');
  console.log('='.repeat(80));

  const childRecords = masterData.filter(r => r.module === 'Products');
  console.log(`\nProcessing ${childRecords.length} child product records...\n`);

  const stats = {
    total: childRecords.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    notFound: 0
  };

  const batches = chunk(childRecords, CONFIG.BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    console.log(`\n--- Batch ${i + 1}/${batches.length} ---`);

    for (const record of batches[i]) {
      const sellerSKU = record.sku;
      const mtpSKU = record.parentSku || record.mtp_sku; // Support both field names
      console.log(`\n🔍 Processing: ${sellerSKU} (Child of ${mtpSKU})`);

      // Search in CRM
      const crmRecord = await searchRecord('Products', sellerSKU, 'Product_Code');

      if (!crmRecord) {
        console.log(`   ⚠️ Not found in CRM`);
        stats.notFound++;
        continue;
      }

      // Get live status from alias file
      const liveData = liveStatusMap.get(sellerSKU);

      // Get parent dimensions for weight category
      const dimensions = dimensionsMap.get(mtpSKU);

      // Build updates
      const updates = {};

      if (liveData && !crmRecord.Live_Status) {
        updates.Live_Status = liveData.live_status;
        console.log(`   📝 Live_Status: ${liveData.live_status} (code: ${liveData.original_code})`);
      }

      if (!crmRecord.Product_Category) {
        updates.Product_Category = record.category;
        console.log(`   📝 Product_Category: ${record.category}`);
      }

      if (dimensions && !crmRecord.Weight_Category_Billed) {
        updates.Weight_Category_Billed = dimensions.weight_category;
        console.log(`   📝 Weight_Category_Billed: ${dimensions.weight_category}`);
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        const result = await updateRecord('Products', crmRecord.id, updates);
        if (result.success) {
          console.log(`   ✅ Updated successfully`);
          stats.updated++;
        } else {
          console.log(`   ❌ Update failed`);
          stats.failed++;
        }
      } else {
        console.log(`   ✨ Already complete, skipped`);
        stats.skipped++;
      }
    }

    if (i < batches.length - 1) {
      console.log(`\n⏳ Waiting ${CONFIG.DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
    }
  }

  return stats;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 ZOHO CRM DATABASE POPULATION SCRIPT');
  console.log('='.repeat(80));
  console.log(`\n⚙️  Configuration:`);
  console.log(`   DRY RUN: ${CONFIG.DRY_RUN ? '✅ YES (Safe preview mode)' : '❌ NO (LIVE UPDATES)'}`);
  console.log(`   Batch Size: ${CONFIG.BATCH_SIZE} records`);
  console.log(`   Delay: ${CONFIG.DELAY_BETWEEN_BATCHES}ms between batches`);

  if (!CONFIG.DRY_RUN) {
    console.log('\n⚠️  WARNING: DRY_RUN is FALSE. This will make ACTUAL changes to CRM!');
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
    await sleep(5000);
  }

  try {
    // Step 1: Load all data sources
    console.log('\n' + '='.repeat(80));
    console.log('📥 STEP 1: LOADING DATA SOURCES');
    console.log('='.repeat(80));

    const masterData = loadUnifiedMasterData();
    const dimensionsData = loadDimensionsFile();
    const aliasData = loadSKUAliasesFile();

    // Step 2: Build lookup maps
    console.log('\n' + '='.repeat(80));
    console.log('🗺️  STEP 2: BUILDING LOOKUP MAPS');
    console.log('='.repeat(80));

    const dimensionsMap = buildDimensionsMap(dimensionsData);
    const liveStatusMap = buildLiveStatusMap(aliasData);

    // Step 3: Populate Parent_MTP_SKU
    const parentStats = await populateParentMTPSKU(masterData, dimensionsMap, liveStatusMap);

    // Step 4: Populate Products (Children)
    const childStats = await populateProducts(masterData, liveStatusMap, dimensionsMap);

    // Final Report
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL REPORT');
    console.log('='.repeat(80));

    console.log('\n🎯 Parent_MTP_SKU Results:');
    console.log(`   Total: ${parentStats.total}`);
    console.log(`   Updated: ${parentStats.updated}`);
    console.log(`   Skipped (already complete): ${parentStats.skipped}`);
    console.log(`   Failed: ${parentStats.failed}`);
    console.log(`   Not Found in CRM: ${parentStats.notFound}`);

    console.log('\n🎨 Products (Children) Results:');
    console.log(`   Total: ${childStats.total}`);
    console.log(`   Updated: ${childStats.updated}`);
    console.log(`   Skipped (already complete): ${childStats.skipped}`);
    console.log(`   Failed: ${childStats.failed}`);
    console.log(`   Not Found in CRM: ${childStats.notFound}`);

    const totalUpdated = parentStats.updated + childStats.updated;
    const totalFailed = parentStats.failed + childStats.failed;

    console.log('\n✨ Overall Summary:');
    console.log(`   Total Records Updated: ${totalUpdated}`);
    console.log(`   Total Failures: ${totalFailed}`);
    console.log(`   Success Rate: ${((totalUpdated / (totalUpdated + totalFailed)) * 100).toFixed(1)}%`);

    if (CONFIG.DRY_RUN) {
      console.log('\n✅ DRY RUN COMPLETE - No actual changes made');
      console.log('   To execute for real, set CONFIG.DRY_RUN = false');
    } else {
      console.log('\n✅ POPULATION COMPLETE - All changes applied to CRM');
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      parent_stats: parentStats,
      child_stats: childStats,
      total_updated: totalUpdated,
      total_failed: totalFailed
    };

    fs.writeFileSync('population_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved to: population_report.json');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
