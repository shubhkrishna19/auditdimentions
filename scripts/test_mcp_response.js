import zohoMCP from './zoho_mcp_wrapper.js';

console.log('Testing MCP wrapper responses...\n');

try {
  console.log('1. Testing getCRMModules...');
  const result = await zohoMCP.getCRMModules();
  console.log('Result type:', typeof result);
  console.log('Result keys:', Object.keys(result || {}));
  console.log('Sample:', JSON.stringify(result).substring(0, 200));
} catch (e) {
  console.error('Error:', e.message);
}
