// Direct test of Zoho MCP server without using mcp-remote
import https from 'https';

const MCP_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

console.log('Testing Zoho MCP Server Connection...\n');
console.log('URL:', MCP_URL.replace(/key=.+/, 'key=***************'));
console.log('');

// Test 1: List available tools
const testRequest = {
  jsonrpc: '2.0',
  method: 'tools/list',
  params: {},
  id: 1
};

const data = JSON.stringify(testRequest);
const url = new URL(MCP_URL);

const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Sending request: tools/list');
console.log('');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, JSON.stringify(res.headers, null, 2));
  console.log('');

  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:');
    try {
      const parsed = JSON.parse(body);
      console.log(JSON.stringify(parsed, null, 2));

      if (parsed.result && parsed.result.tools) {
        console.log('\nMCP SERVER IS WORKING!');
        console.log(`Found ${parsed.result.tools.length} available tools:`);
        parsed.result.tools.forEach(tool => {
          console.log(`  - ${tool.name}`);
        });
      } else if (parsed.error) {
        console.log('\nMCP Server returned error:');
        console.log(`  Code: ${parsed.error.code}`);
        console.log(`  Message: ${parsed.error.message}`);
      }
    } catch (e) {
      console.log(body);
      console.log('\nCould not parse JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error('Connection Error:', e.message);
  console.error('\nPossible issues:');
  console.error('  1. API key is invalid');
  console.error('  2. MCP server is not active');
  console.error('  3. Network/firewall blocking connection');
  console.error('  4. URL is incorrect');
});

req.write(data);
req.end();
