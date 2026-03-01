import fs from 'fs';
import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  DRY_RUN: false,  // SET TO false TO EXECUTE ACTUAL UPDATES
  BATCH_SIZE: 5,
  DELAY_BETWEEN_BATCHES: 1000, // ms

  // Live Status Mapping (from Excel "Chck" column)
  LIVE_STATUS_MAP: {
    'Y': 'Live',
    'y': 'Live',
    'YB': 'Live',
    'YD': 'Live',
    'RL': 'Not Live',
    'NL': 'Not Live',
    'AR': 'Not Live',
    'DI': 'Not Live',
    'MW': 'Not Live',
    'YH': 'Live',
    'YHRL': 'Live'
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

async function getChildrenForParent(parentSKU) {
  try {
    // Search by parent SKU name, not ID
    const result = await callMCP('ZohoCRM_Search_Records', {
      path_variables: { module: 'Products' },
      query_params: { criteria: `(MTP_SKU:equals:${parentSKU})` }
    });

    return result.data || [];
  } catch (error) {
    console.error(`   ❌ Error fetching children:`, error.message);
    return [];
  }
}

// ============================================================================
// DATA PROCESSING
// ============================================================================

function inferCategoryFromName(name) {
  if (!name) return 'Other';

  const nameLower = name.toLowerCase();

  if (nameLower.includes('chair') || nameLower.includes('table') ||
    nameLower.includes('desk') || nameLower.includes('chest') ||
    nameLower.includes('rack') || nameLower.includes('stand') ||
    nameLower.includes('stool') || nameLower.includes('bench') ||
    nameLower.includes('bed') || nameLower.includes('sofa')) {
    return 'Furniture';
  }

  if (nameLower.includes('steel') || nameLower.includes('iron') ||
    nameLower.includes('metal') || nameLower.includes('tool')) {
    return 'Industrial Equipment';
  }

  if (nameLower.includes('box') || nameLower.includes('pack') ||
    nameLower.includes('container')) {
    return 'Packaging Materials';
  }

  if (nameLower.includes('decor') || nameLower.includes('wall') ||
    nameLower.includes('art') || nameLower.includes('frame')) {
    return 'Home Décor';
  }

  return 'Other';
}

function calculateWeightCategory(weightKg) {
  if (weightKg < 5) return '<5kg';
  if (weightKg < 20) return '5-20kg';
  if (weightKg < 50) return '20-50kg';
  return '>50kg';
}

function calculateParentLiveStatus(childrenStatuses) {
  // If ANY child is Live, parent is Live
  return childrenStatuses.some(status => status === 'Live') ? 'Live' : 'Not Live';
}

// ============================================================================
// POPULATION LOGIC
// ============================================================================

async function populateParentMTPSKU(masterData) {
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
      const sku = record.sku;
      console.log(`\n🔍 Processing: ${sku}`);

      // Search in CRM
      const crmRecord = await searchRecord('Parent_MTP_SKU', sku, 'Name');

      if (!crmRecord) {
        console.log(`   ⚠️ Not found in CRM`);
        stats.notFound++;
        continue;
      }

      // Extract weight from JSON (FIXED: read from correct location)
      const weightKg = record.dimensions?.totalWeightKg || 0;
      const weightCategory = weightKg > 0 ? calculateWeightCategory(weightKg) : null;

      // Infer category from product name
      const productCategory = inferCategoryFromName(record.name);

      // Get all children to calculate parent live status
      const children = await getChildrenForParent(sku);
      const childrenLiveStatuses = children.map(child => {
        const childStatus = child.Live_Status || 'Not Live';
        return childStatus;
      });

      const parentLiveStatus = calculateParentLiveStatus(childrenLiveStatuses);

      // Build updates
      const updates = {};

      // Billed_Physical_Weight
      if ((!crmRecord.Billed_Physical_Weight || crmRecord.Billed_Physical_Weight === 0) && weightKg > 0) {
        updates.Billed_Physical_Weight = weightKg;
        console.log(`   📝 Billed_Physical_Weight: ${weightKg} kg`);
      }

      // Weight_Category_Billed
      if (!crmRecord.Weight_Category_Billed && weightCategory) {
        updates.Weight_Category_Billed = weightCategory;
        console.log(`   📝 Weight_Category_Billed: ${weightCategory}`);
      }

      // Product_Category
      if (!crmRecord.Product_Category) {
        updates.Product_Category = productCategory;
        console.log(`   📝 Product_Category: ${productCategory}`);
      }

      // Live_Status
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

async function populateProducts(masterData) {
  console.log('\n' + '='.repeat(80));
  console.log('🎨 POPULATING PRODUCTS (CHILD) RECORDS');
  console.log('='.repeat(80));

  const childRecords = masterData.filter(r => r.module !== 'Parent_MTP_SKU' && r.parentSku);
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
      const parentSKU = record.parentSku;
      console.log(`\n🔍 Processing: ${sellerSKU} (Child of ${parentSKU})`);

      // Search in CRM
      const crmRecord = await searchRecord('Products', sellerSKU, 'Product_Code');

      if (!crmRecord) {
        console.log(`   ⚠️ Not found in CRM`);
        stats.notFound++;
        continue;
      }

      // Map live status from Excel
      const excelStatus = record.status || '';
      const liveStatus = CONFIG.LIVE_STATUS_MAP[excelStatus] || 'Not Live';

      // Infer category from product name
      const productCategory = inferCategoryFromName(record.name);

      // Build updates
      const updates = {};

      // Live_Status
      if (!crmRecord.Live_Status) {
        updates.Live_Status = liveStatus;
        console.log(`   📝 Live_Status: ${liveStatus} (code: ${excelStatus})`);
      }

      // Product_Category
      if (!crmRecord.Product_Category) {
        updates.Product_Category = productCategory;
        console.log(`   📝 Product_Category: ${productCategory}`);
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
  console.log('🚀 ZOHO CRM DATABASE POPULATION SCRIPT - PRODUCTION READY');
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
    // Load unified master data
    console.log('\n' + '='.repeat(80));
    console.log('📥 LOADING DATA');
    console.log('='.repeat(80));

    console.log('\n📂 Loading unified_master_data.json...');
    const masterData = JSON.parse(fs.readFileSync('unified_master_data.json', 'utf8'));
    console.log(`   ✅ Loaded ${masterData.length} records`);

    // Populate Parent_MTP_SKU
    const parentStats = await populateParentMTPSKU(masterData);

    // Populate Products (Children)
    const childStats = await populateProducts(masterData);

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
    console.log(`   Success Rate: ${totalFailed === 0 && totalUpdated > 0 ? '100.0' : ((totalUpdated / (totalUpdated + totalFailed)) * 100).toFixed(1)}%`);

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

    fs.writeFileSync('population_report_FINAL.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved to: population_report_FINAL.json');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
