import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function callMCP(toolName, args) {
  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: { name: toolName, arguments: args }
  };
  const response = await axios.post(BASE_URL, payload);
  if (response.data.result?.content?.[0]?.text) {
    return JSON.parse(response.data.result.content[0].text);
  }
  return response.data.result;
}

async function searchWithPagination(module, criteria = null, maxRecords = 50) {
  const allRecords = [];
  let page = 1;

  while (allRecords.length < maxRecords) {
    try {
      const args = {
        path_variables: { module },
        query_params: { page, per_page: 10 }
      };

      if (criteria) {
        args.query_params.criteria = criteria;
      }

      const result = await callMCP('ZohoCRM_Search_Records', args);

      if (!result.data || result.data.length === 0) break;

      allRecords.push(...result.data);

      if (result.data.length < 10) break; // Last page
      if (allRecords.length >= maxRecords) break;

      page++;
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      break;
    }
  }

  return allRecords.slice(0, maxRecords);
}

async function generateDataQualityReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL DATA QUALITY REPORT');
  console.log('='.repeat(80));
  console.log(`Generated: ${new Date().toLocaleString()}\n`);

  // Fetch 50 parent records
  console.log('📦 Fetching Parent_MTP_SKU records (sample of 50)...');
  const parents = await searchWithPagination('Parent_MTP_SKU', null, 50);
  console.log(`   ✓ Retrieved ${parents.length} parent records\n`);

  // Fetch 50 product records
  console.log('📦 Fetching Products records (sample of 50)...');
  const products = await searchWithPagination('Products', null, 50);
  console.log(`   ✓ Retrieved ${products.length} product records\n`);

  console.log('='.repeat(80));
  console.log('📈 PARENT_MTP_SKU DATA QUALITY');
  console.log('='.repeat(80) + '\n');

  const parentAnalysis = {
    total: parents.length,
    hasWeight: 0,
    hasWeightCategory: 0,
    hasProductCategory: 0,
    hasLiveStatus: 0,
    categoryWithWeights: 0,
    complete: 0
  };

  parents.forEach(p => {
    if (p.Billed_Physical_Weight && p.Billed_Physical_Weight > 0) parentAnalysis.hasWeight++;
    if (p.Weight_Category_Billed) parentAnalysis.hasWeightCategory++;
    if (p.Product_Category) parentAnalysis.hasProductCategory++;
    if (p.Live_Status) parentAnalysis.hasLiveStatus++;

    // Check for weight values in category field
    if (p.Product_Category && /^\d+\s*kg$/i.test(p.Product_Category)) {
      parentAnalysis.categoryWithWeights++;
    }

    // Complete if all 4 critical fields are filled
    if (p.Billed_Physical_Weight > 0 && p.Weight_Category_Billed &&
        p.Product_Category && p.Live_Status) {
      parentAnalysis.complete++;
    }
  });

  console.log(`Field Completeness:`);
  console.log(`  Billed_Physical_Weight: ${parentAnalysis.hasWeight}/${parents.length} (${(parentAnalysis.hasWeight/parents.length*100).toFixed(1)}%)`);
  console.log(`  Weight_Category_Billed: ${parentAnalysis.hasWeightCategory}/${parents.length} (${(parentAnalysis.hasWeightCategory/parents.length*100).toFixed(1)}%)`);
  console.log(`  Product_Category: ${parentAnalysis.hasProductCategory}/${parents.length} (${(parentAnalysis.hasProductCategory/parents.length*100).toFixed(1)}%)`);
  console.log(`  Live_Status: ${parentAnalysis.hasLiveStatus}/${parents.length} (${(parentAnalysis.hasLiveStatus/parents.length*100).toFixed(1)}%)`);

  console.log(`\nData Quality Issues:`);
  console.log(`  Product_Category with weight values: ${parentAnalysis.categoryWithWeights} ❌`);

  console.log(`\nOverall Completeness:`);
  console.log(`  Complete records (all 4 fields): ${parentAnalysis.complete}/${parents.length} (${(parentAnalysis.complete/parents.length*100).toFixed(1)}%)`);

  console.log('\n' + '='.repeat(80));
  console.log('📈 PRODUCTS DATA QUALITY');
  console.log('='.repeat(80) + '\n');

  const productAnalysis = {
    total: products.length,
    hasProductCategory: 0,
    hasLiveStatus: 0,
    hasMTPSKU: 0,
    complete: 0
  };

  products.forEach(p => {
    if (p.Product_Category) productAnalysis.hasProductCategory++;
    if (p.Live_Status) productAnalysis.hasLiveStatus++;
    if (p.MTP_SKU && p.MTP_SKU.name) productAnalysis.hasMTPSKU++;

    if (p.Product_Category && p.Live_Status && p.MTP_SKU) {
      productAnalysis.complete++;
    }
  });

  console.log(`Field Completeness:`);
  console.log(`  Product_Category: ${productAnalysis.hasProductCategory}/${products.length} (${(productAnalysis.hasProductCategory/products.length*100).toFixed(1)}%)`);
  console.log(`  Live_Status: ${productAnalysis.hasLiveStatus}/${products.length} (${(productAnalysis.hasLiveStatus/products.length*100).toFixed(1)}%)`);
  console.log(`  MTP_SKU (Parent Link): ${productAnalysis.hasMTPSKU}/${products.length} (${(productAnalysis.hasMTPSKU/products.length*100).toFixed(1)}%)`);

  console.log(`\nOverall Completeness:`);
  console.log(`  Complete records (all 3 fields): ${productAnalysis.complete}/${products.length} (${(productAnalysis.complete/products.length*100).toFixed(1)}%)`);

  console.log('\n' + '='.repeat(80));
  console.log('🔗 PARENT-CHILD RELATIONSHIP VERIFICATION');
  console.log('='.repeat(80) + '\n');

  // Test relationship by finding children of first parent
  if (parents.length > 0 && parents[0].Name) {
    const firstParentSKU = parents[0].Name;
    console.log(`Testing relationship for Parent SKU: ${firstParentSKU}`);

    try {
      const childrenResult = await callMCP('ZohoCRM_Search_Records', {
        path_variables: { module: 'Products' },
        query_params: { criteria: `(MTP_SKU:equals:${firstParentSKU})` }
      });

      const children = childrenResult.data || [];
      console.log(`  ✓ Found ${children.length} child product(s)`);

      if (children.length > 0) {
        children.forEach((child, idx) => {
          console.log(`    ${idx + 1}. ${child.Product_Code || child.Product_Name} (MTP_SKU: ${child.MTP_SKU?.name || 'N/A'})`);
        });
        console.log(`\n  ✅ Parent-child relationship is working correctly!`);
      }
    } catch (error) {
      console.log(`  ❌ Error testing relationship: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 SAMPLE RECORDS');
  console.log('='.repeat(80) + '\n');

  console.log('Parent_MTP_SKU Examples (first 3):');
  parents.slice(0, 3).forEach((p, idx) => {
    console.log(`\n${idx + 1}. ${p.Name} - ${p.Product_MTP_Name || 'No Name'}`);
    console.log(`   Weight: ${p.Billed_Physical_Weight || 'N/A'} kg`);
    console.log(`   Weight Category: ${p.Weight_Category_Billed || 'N/A'}`);
    console.log(`   Product Category: ${p.Product_Category || 'N/A'}`);
    console.log(`   Live Status: ${p.Live_Status || 'N/A'}`);
  });

  console.log('\n\nProducts Examples (first 3):');
  products.slice(0, 3).forEach((p, idx) => {
    console.log(`\n${idx + 1}. ${p.Product_Code} - ${p.Product_Name || 'No Name'}`);
    console.log(`   Product Category: ${p.Product_Category || 'N/A'}`);
    console.log(`   Live Status: ${p.Live_Status || 'N/A'}`);
    console.log(`   Parent (MTP_SKU): ${p.MTP_SKU?.name || 'N/A'}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('📊 OVERALL DATA QUALITY SCORE');
  console.log('='.repeat(80) + '\n');

  // Calculate weighted score
  const parentScore = (parentAnalysis.complete / parents.length) * 100;
  const productScore = (productAnalysis.complete / products.length) * 100;
  const overallScore = (parentScore + productScore) / 2;

  console.log(`Parent_MTP_SKU Score: ${parentScore.toFixed(1)}/100`);
  console.log(`Products Score: ${productScore.toFixed(1)}/100`);
  console.log(`\n🎯 OVERALL SCORE: ${overallScore.toFixed(1)}/100`);

  if (overallScore >= 90) {
    console.log(`\n✅ EXCELLENT - Production ready!`);
  } else if (overallScore >= 75) {
    console.log(`\n✅ GOOD - Minor improvements needed`);
  } else if (overallScore >= 50) {
    console.log(`\n⚠️ FAIR - Significant improvements needed`);
  } else {
    console.log(`\n❌ POOR - Major data quality issues`);
  }

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    parent_analysis: parentAnalysis,
    product_analysis: productAnalysis,
    overall_score: overallScore,
    sample_parents: parents.slice(0, 10).map(p => ({
      sku: p.Name,
      name: p.Product_MTP_Name,
      weight: p.Billed_Physical_Weight,
      weight_category: p.Weight_Category_Billed,
      product_category: p.Product_Category,
      live_status: p.Live_Status
    })),
    sample_products: products.slice(0, 10).map(p => ({
      sku: p.Product_Code,
      name: p.Product_Name,
      product_category: p.Product_Category,
      live_status: p.Live_Status,
      parent_sku: p.MTP_SKU?.name
    }))
  };

  fs.writeFileSync('final_data_quality_report.json', JSON.stringify(report, null, 2));
  console.log('\n\n💾 Detailed report saved to: final_data_quality_report.json');

  console.log('\n' + '='.repeat(80));
}

generateDataQualityReport().catch(e => {
  console.error('\n❌ ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});
