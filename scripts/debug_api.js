import zohoMCP from './zoho_mcp_wrapper.js';

console.log('Debugging API responses...\n');

// Test 1: Get modules
console.log('1. GET MODULES:');
const modules = await zohoMCP.getCRMModules();
console.log('  Total modules:', modules.modules.length);
console.log('  First module:', modules.modules[0].api_name);

// Test 2: Get Products with raw response
console.log('\n2. GET PRODUCTS:');
const result = await zohoMCP.callTool('ZohoCRM_Get_Records', {
  path_variables: { module: 'Products' },
  query_params: { page: 1, per_page: 10 }
});
console.log('  Response keys:', Object.keys(result));
console.log('  Has data?:', result.data ? 'YES' : 'NO');
if (result.data) {
  console.log('  Record count:', result.data.length);
  if (result.data.length > 0) {
    console.log('  First record keys:', Object.keys(result.data[0]));
  }
}
console.log('  Full response:', JSON.stringify(result).substring(0, 500));
