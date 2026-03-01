import axios from 'axios';

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

async function verify() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPLETE DATA QUALITY & RELATIONSHIP VERIFICATION');
  console.log('='.repeat(80) + '\n');

  // Fetch 50 parents
  const parents = await callMCP('ZohoCRM_Get_Records', {
    path_variables: { module: 'Parent_MTP_SKU' },
    query_params: {
      page: 1,
      per_page: 50,
      fields: 'Name,Product_MTP_Name,Billed_Physical_Weight,Weight_Category_Billed,Product_Category,Live_Status,ProductActive'
    }
  });

  // Fetch 50 products
  const products = await callMCP('ZohoCRM_Get_Records', {
    path_variables: { module: 'Products' },
    query_params: {
      page: 1,
      per_page: 50,
      fields: 'Product_Code,Product_Name,Product_Category,Live_Status,MTP_SKU'
    }
  });

  const parentData = parents.data || [];
  const productData = products.data || [];

  console.log(`📦 Fetched ${parentData.length} Parent_MTP_SKU records`);
  console.log(`📦 Fetched ${productData.length} Products records\n`);

  console.log('='.repeat(80));
  console.log('📈 PARENT_MTP_SKU DATA QUALITY');
  console.log('='.repeat(80) + '\n');

  let parentStats = {
    total: parentData.length,
    hasWeight: 0,
    hasWeightCategory: 0,
    hasProductCategory: 0,
    hasLiveStatus: 0,
    categoryWithWeights: 0,
    allFieldsComplete: 0
  };

  parentData.forEach(p => {
    if (p.Billed_Physical_Weight && p.Billed_Physical_Weight > 0) parentStats.hasWeight++;
    if (p.Weight_Category_Billed) parentStats.hasWeightCategory++;
    if (p.Product_Category) parentStats.hasProductCategory++;
    if (p.Live_Status || p.ProductActive) parentStats.hasLiveStatus++;

    if (/^\d+\s*kg$/i.test(p.Product_Category || '')) parentStats.categoryWithWeights++;

    if (p.Billed_Physical_Weight > 0 && p.Weight_Category_Billed &&
        p.Product_Category && (p.Live_Status || p.ProductActive)) {
      parentStats.allFieldsComplete++;
    }
  });

  console.log(`Field Completeness:`);
  console.log(`  ✓ Billed_Physical_Weight: ${parentStats.hasWeight}/${parentStats.total} (${(parentStats.hasWeight/parentStats.total*100).toFixed(1)}%)`);
  console.log(`  ✓ Weight_Category_Billed: ${parentStats.hasWeightCategory}/${parentStats.total} (${(parentStats.hasWeightCategory/parentStats.total*100).toFixed(1)}%)`);
  console.log(`  ✓ Product_Category: ${parentStats.hasProductCategory}/${parentStats.total} (${(parentStats.hasProductCategory/parentStats.total*100).toFixed(1)}%)`);
  console.log(`  ✓ Live_Status/ProductActive: ${parentStats.hasLiveStatus}/${parentStats.total} (${(parentStats.hasLiveStatus/parentStats.total*100).toFixed(1)}%)`);

  console.log(`\nData Quality Issues:`);
  if (parentStats.categoryWithWeights > 0) {
    console.log(`  ❌ Product_Category with weight values: ${parentStats.categoryWithWeights}`);
  } else {
    console.log(`  ✅ No weight values found in Product_Category field`);
  }

  console.log(`\nOverall:`);
  console.log(`  ✅ Complete records: ${parentStats.allFieldsComplete}/${parentStats.total} (${(parentStats.allFieldsComplete/parentStats.total*100).toFixed(1)}%)`);

  console.log('\n' + '='.repeat(80));
  console.log('📈 PRODUCTS DATA QUALITY');
  console.log('='.repeat(80) + '\n');

  let productStats = {
    total: productData.length,
    hasProductCategory: 0,
    hasLiveStatus: 0,
    hasMTPSKU: 0,
    allFieldsComplete: 0
  };

  productData.forEach(p => {
    if (p.Product_Category) productStats.hasProductCategory++;
    if (p.Live_Status) productStats.hasLiveStatus++;
    if (p.MTP_SKU && p.MTP_SKU.name) productStats.hasMTPSKU++;

    if (p.Product_Category && p.Live_Status && p.MTP_SKU) {
      productStats.allFieldsComplete++;
    }
  });

  console.log(`Field Completeness:`);
  console.log(`  ✓ Product_Category: ${productStats.hasProductCategory}/${productStats.total} (${(productStats.hasProductCategory/productStats.total*100).toFixed(1)}%)`);
  console.log(`  ✓ Live_Status: ${productStats.hasLiveStatus}/${productStats.total} (${(productStats.hasLiveStatus/productStats.total*100).toFixed(1)}%)`);
  console.log(`  ✓ MTP_SKU (Parent Link): ${productStats.hasMTPSKU}/${productStats.total} (${(productStats.hasMTPSKU/productStats.total*100).toFixed(1)}%)`);

  console.log(`\nOverall:`);
  console.log(`  ✅ Complete records: ${productStats.allFieldsComplete}/${productStats.total} (${(productStats.allFieldsComplete/productStats.total*100).toFixed(1)}%)`);

  console.log('\n' + '='.repeat(80));
  console.log('🔗 PARENT-CHILD RELATIONSHIP TEST');
  console.log('='.repeat(80) + '\n');

  if (parentData.length > 0) {
    const testParent = parentData[0];
    console.log(`Testing with Parent SKU: ${testParent.Name} (${testParent.Product_MTP_Name})`);

    const childrenResult = await callMCP('ZohoCRM_Search_Records', {
      path_variables: { module: 'Products' },
      query_params: { criteria: `(MTP_SKU:equals:${testParent.Name})` }
    });

    const children = childrenResult.data || [];
    console.log(`  → Found ${children.length} child product(s)\n`);

    if (children.length > 0) {
      children.forEach((child, idx) => {
        console.log(`  ${idx + 1}. ${child.Product_Code} - ${child.Product_Name || 'N/A'}`);
        console.log(`     Parent (MTP_SKU): ${child.MTP_SKU?.name || 'N/A'}`);
      });
      console.log(`\n  ✅ Parent-child relationship is working correctly!`);
    } else {
      console.log(`  ⚠️  No children found for this parent`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 SAMPLE RECORDS');
  console.log('='.repeat(80) + '\n');

  console.log('Parent_MTP_SKU (first 5):');
  parentData.slice(0, 5).forEach((p, idx) => {
    console.log(`\n${idx + 1}. ${p.Name} - ${p.Product_MTP_Name || 'N/A'}`);
    console.log(`   Weight: ${p.Billed_Physical_Weight || 'N/A'} kg`);
    console.log(`   Weight Category: ${p.Weight_Category_Billed || 'N/A'}`);
    console.log(`   Product Category: ${p.Product_Category || 'N/A'}`);
    console.log(`   Status: ${p.Live_Status || p.ProductActive || 'N/A'}`);
  });

  console.log('\n\nProducts (first 5):');
  productData.slice(0, 5).forEach((p, idx) => {
    console.log(`\n${idx + 1}. ${p.Product_Code} - ${p.Product_Name || 'N/A'}`);
    console.log(`   Product Category: ${p.Product_Category || 'N/A'}`);
    console.log(`   Live Status: ${p.Live_Status || 'N/A'}`);
    console.log(`   Parent: ${p.MTP_SKU?.name || 'N/A'}`);
  });

  const parentScore = (parentStats.allFieldsComplete / parentStats.total) * 100;
  const productScore = (productStats.allFieldsComplete / productStats.total) * 100;
  const overallScore = (parentScore + productScore) / 2;

  console.log('\n' + '='.repeat(80));
  console.log('🎯 OVERALL DATA QUALITY SCORE');
  console.log('='.repeat(80) + '\n');
  console.log(`Parent_MTP_SKU: ${parentScore.toFixed(1)}/100`);
  console.log(`Products: ${productScore.toFixed(1)}/100`);
  console.log(`\n📊 OVERALL SCORE: ${overallScore.toFixed(1)}/100`);

  if (overallScore >= 90) {
    console.log(`\n✅ EXCELLENT - Production ready!`);
  } else if (overallScore >= 75) {
    console.log(`\n✅ GOOD - Ready for production with minor monitoring`);
  } else {
    console.log(`\n⚠️ NEEDS IMPROVEMENT`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

verify().catch(e => console.error('Error:', e.message));
