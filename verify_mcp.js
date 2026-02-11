import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.mcp') });

const FULL_URL = `https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=c79a80619f1e5202f2965cb8f94046ec`;

async function verifyData() {
  try {
    console.log('🔍 Searching for SKU SR-CLM-T via MCP...');
    
    // Testing 'search' action with specific criteria
    const response = await axios.post(FULL_URL, {
      service: 'zoho_crm',
      action: 'search',
      module: 'Parent_MTP_SKU',
      criteria: {
          Name: 'SR-CLM-T'
      }
    });

    if (response.data) {
        console.log('✅ Response Received!');
        console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    if (error.response) {
        console.error('❌ MCP Failed:', error.response.status, error.response.data);
    } else {
        console.error('❌ Error:', error.message);
    }
  }
}

verifyData();
