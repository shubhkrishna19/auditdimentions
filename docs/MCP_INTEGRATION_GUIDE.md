# Zoho MCP Server Integration Guide

## Overview

This project uses **Zoho MCP (Model Context Protocol) Server** to provide AI-powered access to Zoho CRM and Creator data in production mode.

---

## Configuration

### Production Credentials

Production credentials are stored in `.env.mcp` file (NOT committed to git).

**File**: `.env.mcp`
```env
MCP_SERVER_URL=https://bluewudcoredev-914343802.zohomcp.com/mcp/message
MCP_API_KEY=c79a80619f1e5202f2965cb8f94046ec
```

⚠️ **CRITICAL**: This file is in `.gitignore` and must NEVER be committed to git.

---

## Services Accessible

### 1. Zoho CRM (Production)
- Access to all CRM modules (Products, Parent_MTP_SKU, Contacts, Deals, etc.)
- Full read/write permissions
- Real-time data sync

### 2. Zoho Creator (Production)
- Access to custom applications
- Database queries
- Form submissions

---

## MCP Server Endpoint

**Full URL with API Key**:
```
https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=c79a80619f1e5202f2965cb8f94046ec
```

**Usage Pattern**:
```javascript
// Load credentials from .env.mcp
const MCP_SERVER_URL = process.env.MCP_SERVER_URL;
const MCP_API_KEY = process.env.MCP_API_KEY;

// Construct full endpoint
const endpoint = `${MCP_SERVER_URL}?key=${MCP_API_KEY}`;
```

---

## Security Best Practices

### 1. Never Commit Credentials
- `.env.mcp` is in `.gitignore`
- Use `.env.mcp.example` as template
- Share credentials via secure channels (1Password, encrypted messages)

### 2. Environment Variables
If using environment variables in CI/CD:
```bash
export MCP_SERVER_URL="https://bluewudcoredev-914343802.zohomcp.com/mcp/message"
export MCP_API_KEY="c79a80619f1e5202f2965cb8f94046ec"
```

### 3. Server-Side Only
- MCP credentials should ONLY be used in backend/server-side code
- NEVER expose API keys in frontend JavaScript
- NEVER include in client-side bundles

---

## Integration Options

### Option A: Direct HTTP Requests
```javascript
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.mcp' });

const mcpClient = axios.create({
  baseURL: process.env.MCP_SERVER_URL,
  params: {
    key: process.env.MCP_API_KEY
  }
});

// Example: Query CRM data
async function queryCRM(module, criteria) {
  const response = await mcpClient.post('/', {
    service: 'zoho_crm',
    action: 'search',
    module: module,
    criteria: criteria
  });
  return response.data;
}
```

### Option B: Catalyst Function Integration
```javascript
// In ZohoIntegrationEngine/functions/MCPBridge/index.js
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const MCP_ENDPOINT = `${process.env.MCP_SERVER_URL}?key=${process.env.MCP_API_KEY}`;

app.post('/query-crm', async (req, res) => {
  try {
    const { module, criteria } = req.body;

    const response = await axios.post(MCP_ENDPOINT, {
      service: 'zoho_crm',
      action: 'search',
      module: module,
      criteria: criteria
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
```

---

## MCP vs Embedded SDK vs Catalyst Backend

| Feature | MCP Server | Embedded SDK | Catalyst Backend |
|---------|------------|--------------|------------------|
| **Use Case** | AI-powered queries | Widget CRUD | Heavy bulk ops |
| **Authentication** | API key | Auto (widget) | Connector |
| **Rate Limits** | Higher | 100 req/min | None (server) |
| **Context** | Server-side | Client (widget) | Server-side |
| **Best For** | AI assistants | UI interactions | Batch jobs |

---

## API Examples

### Example 1: Search Products by Category
```javascript
const response = await mcpClient.post('/', {
  service: 'zoho_crm',
  action: 'search',
  module: 'Products',
  criteria: {
    Product_Category: 'Furniture',
    Live_Status: 'Y'
  }
});
```

### Example 2: Update Product Weight
```javascript
const response = await mcpClient.post('/', {
  service: 'zoho_crm',
  action: 'update',
  module: 'Products',
  id: '1234567890',
  data: {
    Billed_Physical_Weight: 25.5,
    Last_Audited_Date: new Date().toISOString()
  }
});
```

### Example 3: Query Creator Database
```javascript
const response = await mcpClient.post('/', {
  service: 'zoho_creator',
  action: 'query',
  app: 'audit-tracking',
  report: 'All_Audits',
  criteria: 'Status == "Pending"'
});
```

---

## Troubleshooting

### Error: Invalid API Key
**Symptom**: 401 Unauthorized or "Invalid key"

**Solution**:
1. Verify `.env.mcp` file exists
2. Check API key matches Zoho MCP console
3. Ensure no extra spaces or newlines in key

### Error: Service Not Found
**Symptom**: "Service 'zoho_crm' not found"

**Solution**:
1. Verify services are enabled in MCP console
2. Check service names (case-sensitive)
3. Confirm production mode is active

### Error: Rate Limit Exceeded
**Symptom**: 429 Too Many Requests

**Solution**:
1. Implement exponential backoff retry
2. Batch requests where possible
3. Contact Zoho to increase limits

---

## Monitoring & Logs

### Enable Debug Logging
```javascript
const mcpClient = axios.create({
  baseURL: process.env.MCP_SERVER_URL,
  params: { key: process.env.MCP_API_KEY }
});

mcpClient.interceptors.request.use(request => {
  console.log('[MCP Request]', request.method, request.url, request.data);
  return request;
});

mcpClient.interceptors.response.use(
  response => {
    console.log('[MCP Response]', response.status, response.data);
    return response;
  },
  error => {
    console.error('[MCP Error]', error.response?.status, error.response?.data);
    throw error;
  }
);
```

---

## Deployment Checklist

### Development
- [x] Create `.env.mcp` locally
- [x] Add `.env.mcp` to `.gitignore`
- [x] Test MCP connection with sample queries
- [ ] Implement error handling and retries

### Production
- [ ] Store credentials in secure environment variables
- [ ] Configure Catalyst function environment
- [ ] Enable MCP logging for debugging
- [ ] Set up monitoring/alerting for failures
- [ ] Document API usage patterns

---

## Contact & Support

**MCP Server Domain**: `bluewudcoredev-914343802.zohomcp.com`

**Environment**: Production

**Created**: 2026-02-11

**Last Updated**: 2026-02-11

---

## Security Notes

🔒 **API Key Rotation**: If key is compromised:
1. Revoke key in Zoho MCP console
2. Generate new key
3. Update `.env.mcp` file
4. Redeploy affected services

🔒 **Access Control**:
- Only backend services should access MCP
- Frontend should proxy through backend
- Never expose credentials in client code

🔒 **Audit Trail**:
- Log all MCP requests (without sensitive data)
- Monitor for unauthorized access patterns
- Review logs weekly

---

## Related Documentation

- [MEMORY.md](C:\Users\shubh\.claude\projects\c--Users-shubh-Downloads-Dimentions-Audit-Authenticator\memory\MEMORY.md) - Project architecture
- [CATALYST_DEBUG_GUIDE.md](CATALYST_DEBUG_GUIDE.md) - Debugging Zoho Widget
- [PENDING_FIXES.md](PENDING_FIXES.md) - Known issues and fixes
