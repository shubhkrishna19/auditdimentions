import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function saveTools() {
    console.log('Testing connection...');
    try {
        const res = await axios.post(BASE_URL, {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
            params: {}
        });

        fs.writeFileSync('mcp_tools.json', JSON.stringify(res.data, null, 2));
        console.log('✅ Saved tools to mcp_tools.json');
    } catch (err) {
        console.error('Error:', err.message);
    }
}

saveTools();
