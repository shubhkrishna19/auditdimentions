import fs from 'fs';
import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  DRY_RUN: true,  // SET TO false TO EXECUTE ACTUAL UPDATES
  BATCH_SIZE: 5,
  DELAY_BETWEEN_BATCHES: 1000
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
// CRM FUNCTIONS
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
// MAIN LOGIC
// ============================================================================

async function fixParentLiveStatus() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIX PARENT LIVE STATUS - Based on Updated Children');
  console.log('='.repeat(80));

  // Load unified master data to get list of parent SKUs
  console.log('\n📂 Loading unified_master_data.json...');
  const masterData = JSON.parse(fs.readFileSync('unified_master_data.json', 'utf8'));
  const parentRecords = masterData.filter(r => r.module === 'Parent_MTP_SKU');
  console.log(`   ✅ Found ${parentRecords.length} parent SKUs`);

  const stats = {
    total: parentRecords.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    notFound: 0
  };

  const batches = chunk(parentRecords, CONFIG.BATCH_SIZE);

  console.log('\n🔍 Processing parent SKUs...\n');

  for (let i = 0; i < batches.length; i++) {
    console.log(`\n--- Batch ${i + 1}/${batches.length} ---`);

    for (const record of batches[i]) {
      const sku = record.sku;
      console.log(`\n🔍 Processing: ${sku}`);

      // Search parent in CRM
      const crmRecord = await searchRecord('Parent_MTP_SKU', sku, 'Name');

      if (!crmRecord) {
        console.log(`   ⚠️ Not found in CRM`);
        stats.notFound++;
        continue;
      }

      // Get all children for this parent (NOW with updated Live_Status!)
      const children = await getChildrenForParent(sku);

      if (children.length === 0) {
        console.log(`   ⚠️ No children found - setting Not Live`);
        const updates = { Live_Status: 'Not Live' };

        const result = await updateRecord('Parent_MTP_SKU', crmRecord.id, updates);
        if (result.success) {
          console.log(`   ✅ Updated to Not Live (no children)`);
          stats.updated++;
        } else {
          stats.failed++;
        }
        continue;
      }

      // Check children's CURRENT live statuses (after first script ran)
      const childrenStatuses = children.map(child => child.Live_Status || 'Not Live');
      const hasLiveChild = childrenStatuses.some(status => status === 'Live');
      const correctParentStatus = hasLiveChild ? 'Live' : 'Not Live';

      console.log(`   📊 Children: ${children.length} total`);
      console.log(`   📊 Live children: ${childrenStatuses.filter(s => s === 'Live').length}`);
      console.log(`   📊 Correct parent status: ${correctParentStatus}`);

      // Check if parent needs update
      if (crmRecord.Live_Status === correctParentStatus) {
        console.log(`   ✨ Already correct, skipped`);
        stats.skipped++;
        continue;
      }

      // Update parent
      const updates = { Live_Status: correctParentStatus };
      const result = await updateRecord('Parent_MTP_SKU', crmRecord.id, updates);

      if (result.success) {
        console.log(`   ✅ Updated: ${crmRecord.Live_Status || 'null'} → ${correctParentStatus}`);
        stats.updated++;
      } else {
        console.log(`   ❌ Update failed`);
        stats.failed++;
      }
    }

    if (i < batches.length - 1) {
      console.log(`\n⏳ Waiting ${CONFIG.DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
    }
  }

  // Final Report
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL REPORT');
  console.log('='.repeat(80));

  console.log('\n🎯 Parent Live Status Correction Results:');
  console.log(`   Total: ${stats.total}`);
  console.log(`   Updated: ${stats.updated}`);
  console.log(`   Skipped (already correct): ${stats.skipped}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Not Found: ${stats.notFound}`);

  console.log('\n✨ Summary:');
  console.log(`   Success Rate: ${stats.failed === 0 && stats.updated > 0 ? '100.0' : ((stats.updated / (stats.updated + stats.failed)) * 100).toFixed(1)}%`);

  if (CONFIG.DRY_RUN) {
    console.log('\n✅ DRY RUN COMPLETE - No actual changes made');
    console.log('   To execute for real, set CONFIG.DRY_RUN = false');
  } else {
    console.log('\n✅ LIVE STATUS CORRECTION COMPLETE!');
  }

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    stats: stats
  };

  fs.writeFileSync('fix_parent_live_status_report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Report saved to: fix_parent_live_status_report.json');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 PARENT LIVE STATUS FIX SCRIPT');
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
    await fixParentLiveStatus();
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
