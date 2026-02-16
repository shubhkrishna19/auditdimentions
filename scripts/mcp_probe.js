import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp';
const API_KEY = '1744fb0b80fd85224f61b41e8f0f5d12';

async function probe() {
    console.log('🚀 Deep Probe of Zoho MCP Server (Attempt 2)...');

    // URL with Key in Query Param
    const fullUrl = `${BASE_URL}/message?key=${API_KEY}`;
    console.log('Target URL:', fullUrl);

    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "probe-script", version: "1.0.0" }
        }
    };

    try {
        console.log('\n--- Sending JSON-RPC initialize (POST) ---');
        const res = await axios.post(fullUrl, payload, {
            headers: {
                'Content-Type': 'application/json'
                // intended: NO Authorization header
            }
        });

        console.log('✅ Success!');
        console.log('Status:', res.status);
        console.log('Response Data:', JSON.stringify(res.data, null, 2));

    } catch (err) {
        console.log('❌ Error:', err.response ? err.response.status : err.message);
        if (err.response && err.response.data) {
            console.log('Response Body:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

probe();
