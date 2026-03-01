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

async function debugFields() {
  console.log('\n🔍 DEBUG: Checking what fields are actually returned\n');

  // Fetch one parent record
  const result = await callMCP('ZohoCRM_Get_Records', {
    path_variables: { module: 'Parent_MTP_SKU' },
    query_params: { page: 1, per_page: 1, fields: 'all' }
  });

  console.log('📦 Full Response Structure:\n');
  console.log(JSON.stringify(result, null, 2));

  if (result.data && result.data.length > 0) {
    console.log('\n\n📊 First Record Field Names:\n');
    const record = result.data[0];
    console.log(Object.keys(record).join(', '));

    console.log('\n\n📝 Sample Values:\n');
    console.log('Name field:', record.Name);
    console.log('Product_MTP_Name field:', record.Product_MTP_Name);
    console.log('Billed_Physical_Weight field:', record.Billed_Physical_Weight);
    console.log('Weight_Category_Billed field:', record.Weight_Category_Billed);
    console.log('Product_Category field:', record.Product_Category);
    console.log('Live_Status field:', record.Live_Status);
  }

  // Save to file for inspection
  fs.writeFileSync('debug_mcp_response.json', JSON.stringify(result, null, 2));
  console.log('\n\n💾 Full response saved to: debug_mcp_response.json');
}

debugFields().catch(e => {
  console.error('ERROR:', e.message);
  console.error(e.stack);
});
