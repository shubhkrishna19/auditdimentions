import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp';
const API_KEY = '1744fb0b80fd85224f61b41e8f0f5d12';

async function findTools() {
    console.log('🔍 Searching specific tools...');

    const fullUrl = `${BASE_URL}/message?key=${API_KEY}`;

    const payload = {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/list",
        params: {}
    };

    try {
        const res = await axios.post(fullUrl, payload, { headers: { 'Content-Type': 'application/json' } });

        if (res.data.result && res.data.result.tools) {
            const tools = res.data.result.tools;
            // Looking for "Get_Records" or "Search_Records"
            const relevantTools = tools.filter(t =>
                t.name.includes('Get_Records') ||
                t.name.includes('Search_Records') ||
                t.name.includes('Update_Records')
            );

            console.log(`\nFound ${relevantTools.length} relevant tools:`);
            relevantTools.forEach(t => {
                console.log(`\n🔹 ${t.name}`);
                console.log(`   Description: ${t.description}`);
                console.log(`   Schema:`, JSON.stringify(t.inputSchema, null, 2));
            });

        }
    } catch (err) {
        console.log('❌ Error:', err.message);
    }
}

findTools();
