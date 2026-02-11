import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function auditZoho() {
    console.log('🔍 Starting Comprehensive Zoho Audit...');
    const state = {
        timestamp: new Date().toISOString(),
        crm: { modules: [] },
        creator: { apps: [] }
    };

    // 1. Fetch CRM Modules
    try {
        console.log('\n--- Fetching CRM Modules ---');
        const res = await axios.post(BASE_URL, {
            jsonrpc: "2.0", id: 1, method: "tools/call",
            params: {
                name: "ZohoCRM_Get_Modules",
                arguments: {} // Usually no args needed for all modules
            }
        });

        if (res.data.result?.content?.[0]?.text) {
            const data = JSON.parse(res.data.result.content[0].text);
            if (data.modules) {
                state.crm.modules = data.modules.map(m => ({
                    api_name: m.api_name,
                    plural_label: m.plural_label,
                    id: m.id,
                    custom: m.generated_type === 'custom',
                    status: m.status
                }));
                console.log(`✅ Found ${data.modules.length} CRM Modules`);
            }
        }
    } catch (err) {
        console.log('❌ CRM Module Fetch Failed:', err.message);
    }

    // 2. Fetch Creator Applications (if tool exists and works)
    try {
        console.log('\n--- Fetching Creator Apps ---');
        // Note: Creator tools often require 'account_owner_name' or 'workspace_name'
        // I will try to call 'ZohoCreator_getApplications' with empty args first, 
        // or assume args from typical Zoho pattern if fail.

        // Check tool definition first? No, just try call.
        const res = await axios.post(BASE_URL, {
            jsonrpc: "2.0", id: 2, method: "tools/call",
            params: {
                name: "ZohoCreator_getApplications",
                arguments: {
                    query_params: {
                        // specific params might be needed
                    }
                }
            }
        });

        // This might fail if arguments are mandatory. 
        // If successful, parse.
        if (res.data.result?.content?.[0]?.text) {
            console.log('Creator Response:', res.data.result.content[0].text.substring(0, 100) + '...');
            // logic to parse if JSON
        } else {
            console.log('⚠️ Creator Tool call returned no content (might need args)');
        }

    } catch (err) {
        console.log('❌ Creator App Fetch Failed:', err.message);
    }

    // Save State
    fs.writeFileSync('zoho_audit_dump.json', JSON.stringify(state, null, 2));
    console.log('\n✅ Audit Complete. Saved to zoho_audit_dump.json');
}

auditZoho();
