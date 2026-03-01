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

async function verifyDataQuality() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CURRENT CRM DATA QUALITY VERIFICATION');
  console.log('='.repeat(80));

  // Fetch sample of Parent records
  console.log('\n📦 Fetching Parent_MTP_SKU sample...');
  const parents = await callMCP('ZohoCRM_Get_Records', {
    path_variables: { module: 'Parent_MTP_SKU' },
    query_params: { page: 1, per_page: 10, fields: 'all' }
  });

  // Fetch sample of Product records
  console.log('📦 Fetching Products sample...\n');
  const products = await callMCP('ZohoCRM_Get_Records', {
    path_variables: { module: 'Products' },
    query_params: { page: 1, per_page: 10, fields: 'all' }
  });

  console.log('='.repeat(80));
  console.log('📊 PARENT_MTP_SKU Sample (first 5 records):');
  console.log('='.repeat(80) + '\n');

  parents.data.slice(0, 5).forEach((p, idx) => {
    console.log(`${idx + 1}. SKU: ${p.Name}`);
    console.log(`   Billed_Physical_Weight: ${p.Billed_Physical_Weight || '❌ EMPTY'} kg`);
    console.log(`   Weight_Category_Billed: ${p.Weight_Category_Billed || '❌ EMPTY'}`);
    console.log(`   Product_Category: ${p.Product_Category || '❌ EMPTY'}`);
    console.log(`   Live_Status: ${p.Live_Status || '❌ EMPTY'}`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('📊 PRODUCTS Sample (first 5 records):');
  console.log('='.repeat(80) + '\n');

  products.data.slice(0, 5).forEach((p, idx) => {
    console.log(`${idx + 1}. SKU: ${p.Product_Code}`);
    console.log(`   Product_Category: ${p.Product_Category || '❌ EMPTY'}`);
    console.log(`   Live_Status: ${p.Live_Status || '❌ EMPTY'}`);
    console.log(`   MTP_SKU (Parent): ${p.MTP_SKU?.name || '❌ EMPTY'}`);
    console.log('');
  });

  // Calculate data quality from sample
  const parentComplete = parents.data.filter(p =>
    p.Billed_Physical_Weight &&
    p.Weight_Category_Billed &&
    p.Product_Category &&
    p.Live_Status
  );

  const productsComplete = products.data.filter(p =>
    p.Product_Category &&
    p.Live_Status &&
    p.MTP_SKU
  );

  console.log('='.repeat(80));
  console.log('📈 DATA QUALITY SUMMARY (from sample):');
  console.log('='.repeat(80) + '\n');

  console.log(`Parent_MTP_SKU:`);
  console.log(`  Complete: ${parentComplete.length}/${parents.data.length} records (${(parentComplete.length/parents.data.length*100).toFixed(1)}%)`);
  console.log(`  Fields checked: Billed_Physical_Weight, Weight_Category_Billed, Product_Category, Live_Status\n`);

  console.log(`Products:`);
  console.log(`  Complete: ${productsComplete.length}/${products.data.length} records (${(productsComplete.length/products.data.length*100).toFixed(1)}%)`);
  console.log(`  Fields checked: Product_Category, Live_Status, MTP_SKU (relationship)\n`);

  // Check for specific issues mentioned by user
  console.log('='.repeat(80));
  console.log('🔍 CHECKING FOR KNOWN ISSUES:');
  console.log('='.repeat(80) + '\n');

  // Issue 1: Product_Category with weight values
  const categoryWithWeights = parents.data.filter(p =>
    p.Product_Category && /^\d+\s*kg$/i.test(p.Product_Category)
  );
  console.log(`1. Product_Category fields with weight values (e.g., "20 kg"):`);
  console.log(`   Found: ${categoryWithWeights.length}/${parents.data.length} in sample`);
  if (categoryWithWeights.length > 0) {
    console.log(`   ⚠️  Examples: ${categoryWithWeights.slice(0, 3).map(p => `${p.Name}: "${p.Product_Category}"`).join(', ')}`);
  } else {
    console.log(`   ✅ No weight values found in Product_Category field`);
  }

  // Issue 2: Parent Live Status accuracy
  console.log(`\n2. Parent Live_Status distribution:`);
  const liveParents = parents.data.filter(p => p.Live_Status === 'Live').length;
  const notLiveParents = parents.data.filter(p => p.Live_Status === 'Not Live').length;
  console.log(`   Live: ${liveParents}`);
  console.log(`   Not Live: ${notLiveParents}`);
  console.log(`   Empty: ${parents.data.length - liveParents - notLiveParents}`);

  // Issue 3: Relationship verification
  console.log(`\n3. Parent-Child Relationship (MTP_SKU lookup):`);
  const productsWithParent = products.data.filter(p => p.MTP_SKU && p.MTP_SKU.name).length;
  console.log(`   Products with valid MTP_SKU: ${productsWithParent}/${products.data.length}`);
  if (productsWithParent === products.data.length) {
    console.log(`   ✅ All sampled products have valid parent relationship`);
  } else {
    console.log(`   ⚠️  Some products missing parent relationship`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFICATION COMPLETE');
  console.log('='.repeat(80) + '\n');
}

verifyDataQuality().catch(e => {
  console.error('\n❌ ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});
