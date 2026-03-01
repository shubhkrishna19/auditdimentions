# Zoho MCP Server Setup Guide

## Current Status

The Zoho MCP server connection is showing errors. Here's how to properly configure it.

## Option 1: Built-in Zoho MCP (Recommended)

The `claude.ai ZohoMCP` server is built into Claude Code, but needs proper authentication configuration.

### Steps:

1. **Open Claude Code Developer Settings**
   - In VS Code, press `Ctrl+Shift+P`
   - Type: "Claude Code: Open Developer Settings"
   - Or click "Open developer settings" button in the error message

2. **Configure MCP Servers**
   Add this to your MCP configuration:

```json
{
  "mcpServers": {
    "claude.ai ZohoMCP": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12",
        "--transport",
        "http-only"
      ]
    }
  }
}
```

3. **Restart Claude Code**
   - Close and reopen VS Code
   - Or reload window: `Ctrl+Shift+P` → "Developer: Reload Window"

---

## Option 2: Custom MCP Server Configuration

If the built-in server doesn't work, create a custom configuration.

### Step 1: Create MCP Config File

**Location**: `C:\Users\shubh\.claude\mcp-servers.json`

```json
{
  "zoho-production": {
    "type": "http",
    "url": "https://bluewudcoredev-914343802.zohomcp.com/mcp/message",
    "headers": {
      "Authorization": "Bearer 1744fb0b80fd85224f61b41e8f0f5d12"
    },
    "description": "Zoho CRM and Creator Production Access"
  }
}
```

### Step 2: Test Connection

Run this command to verify:

```bash
curl -X POST "https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

Expected response: List of available Zoho CRM/Creator tools

---

## Option 3: Direct HTTP Integration (Fallback)

If MCP continues having issues, we can use direct HTTP calls to your Zoho MCP endpoint.

### Test Script

Save as `test_zoho_mcp.js`:

```javascript
const https = require('https');

const url = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

const data = JSON.stringify({
  jsonrpc: '2.0',
  method: 'tools/list',
  params: {},
  id: 1
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(url, options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', JSON.parse(body));
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(data);
req.end();
```

Run: `node test_zoho_mcp.js`

---

## Troubleshooting

### Error: "spawn uv ENOENT"
- The MCP server config is trying to use Python `uv` package manager
- Install uv: `pip install uv` or use Option 2/3 above

### Error: "Server disconnected"
- Check your API key is correct
- Verify the MCP server URL is accessible
- Try regenerating API key in Zoho MCP console

### Error: "Invalid content from server"
- The MCP server is responding with unexpected format
- This usually means API key authentication failed
- Regenerate API key in Zoho MCP dashboard

---

## What Capabilities You'll Gain

Once MCP is properly connected, you'll have access to:

### Zoho CRM Operations:
- ✅ List all modules
- ✅ Get module metadata (fields, layouts, profiles)
- ✅ Search/query records
- ✅ Create/update/delete records
- ✅ Get specific records by ID
- ✅ Execute COQL queries (Zoho's SQL-like language)
- ✅ Manage workflows, blueprints, validation rules
- ✅ Access related lists, subforms
- ✅ Bulk operations

### Zoho Creator Operations:
- ✅ List all applications
- ✅ Get application metadata
- ✅ List forms and reports
- ✅ Query report data (like database SELECT)
- ✅ Add/update/delete records
- ✅ Get record by ID
- ✅ Execute Deluge scripts
- ✅ Manage workflows and pages

### Advanced Features:
- 🤖 AI-powered data analysis
- 📊 Automated reporting
- 🔄 Cross-module data synchronization
- 🧹 Data cleanup and deduplication
- 📈 Trend analysis and insights
- ⚡ Batch processing automation

---

## Next Steps After Setup

1. **Test Basic Operations**
   ```
   - List CRM modules
   - Get Products module fields
   - Search for a product by SKU
   - List Creator applications
   ```

2. **Verify Data Access**
   ```
   - Query actual product records
   - Check Parent_MTP_SKU data
   - Verify audit history
   - Test Creator reports
   ```

3. **Conduct Real Audit**
   ```
   - Analyze actual data quality
   - Identify inconsistencies in production data
   - Map real relationships between modules
   - Document actual workflows in use
   ```

4. **Create Action Plan**
   ```
   - Based on REAL data findings
   - Not assumptions or best practices
   - Specific to your actual setup
   - With measurable metrics
   ```

---

## Contact Support

If you continue having issues:

1. **Check Zoho MCP Dashboard**
   - Log into your Zoho MCP console
   - Verify the server is active
   - Check API key validity
   - Review usage logs for errors

2. **Regenerate API Key**
   - Sometimes keys get corrupted
   - Generate fresh key
   - Update `.env.mcp` file
   - Restart Claude Code

3. **Contact Zoho Support**
   - Email: mcp-support@zoho.com
   - Provide error messages
   - Share server domain: bluewudcoredev-914343802.zohomcp.com

---

**Once MCP is working, I'll be able to give you a REAL, data-driven audit instead of assumptions!**
