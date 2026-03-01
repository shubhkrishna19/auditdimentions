// Zoho MCP Wrapper - Direct HTTP Access to all 181 Zoho tools
// Use this instead of Antigravity's broken MCP integration

import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load credentials from .env.mcp
const envPath = path.join(__dirname, '.env.mcp');
const envContent = await fs.readFile(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
});

if (!env.MCP_SERVER_URL || !env.MCP_API_KEY) {
  throw new Error('MCP_SERVER_URL and MCP_API_KEY must be set in .env.mcp');
}

const MCP_URL = `${env.MCP_SERVER_URL}?key=${env.MCP_API_KEY}`;

class ZohoMCP {
  constructor() {
    this.url = new URL(MCP_URL);
    this.requestId = 1;
  }

  async call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: this.requestId++
      });

      const options = {
        hostname: this.url.hostname,
        port: 443,
        path: this.url.pathname + this.url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.error) {
              reject(new Error(`MCP Error ${parsed.error.code}: ${parsed.error.message}`));
            } else {
              // Handle MCP response format: {content: [{type: "text", text: "..."}]}
              const result = parsed.result;
              if (result && result.content && Array.isArray(result.content)) {
                const textContent = result.content.find(c => c.type === 'text');
                if (textContent && textContent.text) {
                  resolve(JSON.parse(textContent.text));
                } else {
                  resolve(result);
                }
              } else {
                resolve(result);
              }
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(data);
      req.end();
    });
  }

  // List all available tools
  async listTools() {
    return this.call('tools/list');
  }

  // Call a specific Zoho tool
  async callTool(toolName, params = {}) {
    return this.call('tools/call', { name: toolName, arguments: params });
  }

  // ==================== CRM OPERATIONS ====================

  // Get all CRM modules
  async getCRMModules() {
    return this.callTool('ZohoCRM_Get_Modules');
  }

  // Get fields for a specific module
  async getCRMFields(moduleName, type = 'all') {
    return this.callTool('ZohoCRM_Get_Fields', {
      query_params: {
        module: moduleName,
        type: type
      }
    });
  }

  // Search CRM records with criteria
  async searchCRMRecords(moduleName, criteria) {
    return this.callTool('ZohoCRM_Search_Records', {
      path_variables: { module: moduleName },
      query_params: { criteria: criteria }
    });
  }

  // Get specific record by ID
  async getCRMRecord(moduleName, recordId) {
    return this.callTool('ZohoCRM_Get_Record', {
      path_variables: {
        module: moduleName,
        recordId: recordId
      }
    });
  }

  // Get all records from a module (with pagination)
  async getAllCRMRecords(moduleName, maxRecords = 1000) {
    let allRecords = [];
    let page = 1;
    const perPage = 200;

    while (allRecords.length < maxRecords) {
      try {
        const result = await this.callTool('ZohoCRM_Get_Records', {
          path_variables: { module: moduleName },
          query_params: {
            page: page,
            per_page: perPage,
            fields: 'all'  // Required by Zoho API
          }
        });

        if (!result.data || result.data.length === 0) break;

        allRecords = allRecords.concat(result.data);
        console.log(`Fetched page ${page}: ${result.data.length} records (total: ${allRecords.length})`);

        if (result.data.length < perPage) break; // Last page
        page++;
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error.message);
        break;
      }
    }

    return allRecords;
  }

  // Execute COQL query (Zoho's SQL-like language)
  async executeCOQL(query) {
    return this.callTool('ZohoCRM_Get_Records_By_Query', {
      body: { select_query: query }
    });
  }

  // Update a CRM record
  async updateCRMRecord(moduleName, recordId, data) {
    return this.callTool('ZohoCRM_Update_Record', {
      path_variables: {
        module: moduleName,
        recordId: recordId
      },
      body: { data: [data] }
    });
  }

  // Create a CRM record
  async createCRMRecord(moduleName, data) {
    return this.callTool('ZohoCRM_Insert_Record', {
      path_variables: { module: moduleName },
      body: { data: [data] }
    });
  }

  // ==================== CREATOR OPERATIONS ====================

  // Get all Creator applications
  async getCreatorApps() {
    return this.callTool('ZohoCreator_getApplications');
  }

  // Get application metadata
  async getCreatorAppDetails(appLinkName) {
    return this.callTool('ZohoCreator_getApplication', {
      path_variables: { app_link_name: appLinkName }
    });
  }

  // Get all forms in an application
  async getCreatorForms(appLinkName) {
    return this.callTool('ZohoCreator_getForms', {
      path_variables: { app_link_name: appLinkName }
    });
  }

  // Get all reports in an application
  async getCreatorReports(appLinkName) {
    return this.callTool('ZohoCreator_getReports', {
      path_variables: { app_link_name: appLinkName }
    });
  }

  // Query a Creator report (like SELECT from database)
  async queryCreatorReport(appLinkName, reportLinkName, criteria = {}) {
    return this.callTool('ZohoCreator_getRecordsByReport', {
      path_variables: {
        app_link_name: appLinkName,
        report_link_name: reportLinkName
      },
      query_params: criteria
    });
  }

  // Add record to Creator form
  async addCreatorRecord(appLinkName, formLinkName, data) {
    return this.callTool('ZohoCreator_addRecord', {
      path_variables: {
        app_link_name: appLinkName,
        form_link_name: formLinkName
      },
      body: { data: data }
    });
  }
}

// Export instance
const zohoMCP = new ZohoMCP();
export default zohoMCP;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case 'test':
      console.log('Testing Zoho MCP connection...');
      const tools = await zohoMCP.listTools();
      console.log(`✅ Connected! Found ${tools.tools.length} tools available`);
      break;

    case 'modules':
      console.log('Fetching CRM modules...');
      const modules = await zohoMCP.getCRMModules();
      console.log(`Found ${modules.modules.length} modules:`);
      modules.modules.slice(0, 20).forEach(m => {
        console.log(`  - ${m.api_name} (${m.singular_label})`);
      });
      break;

    case 'creator':
      console.log('Fetching Creator apps...');
      const apps = await zohoMCP.getCreatorApps();
      console.log(`Found ${apps.applications ? apps.applications.length : 0} applications`);
      if (apps.applications) {
        apps.applications.forEach(app => {
          console.log(`  - ${app.application_name} (${app.link_name})`);
        });
      }
      break;

    case 'products':
      console.log('Fetching first 10 Products...');
      const products = await zohoMCP.getAllCRMRecords('Products', 10);
      console.log(`\nFetched ${products.length} products`);
      products.forEach((p, i) => {
        console.log(`${i + 1}. ${p.Product_Name || p.Product_Code} (ID: ${p.id})`);
      });
      break;

    default:
      console.log(`
Zoho MCP Wrapper - Command Line Usage

Commands:
  node zoho_mcp_wrapper.js test      - Test MCP connection
  node zoho_mcp_wrapper.js modules   - List all CRM modules
  node zoho_mcp_wrapper.js creator   - List all Creator apps
  node zoho_mcp_wrapper.js products  - Fetch first 10 products

Usage in code:
  import zohoMCP from './zoho_mcp_wrapper.js';

  const modules = await zohoMCP.getCRMModules();
  const products = await zohoMCP.getAllCRMRecords('Products');
  const apps = await zohoMCP.getCreatorApps();
      `);
  }
}
