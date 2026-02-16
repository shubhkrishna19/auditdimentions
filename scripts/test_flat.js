import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function testFlat() {
    console.log('🔍 Testing ZohoCRM_Get_Records (Flat Args)...');

    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: "ZohoCRM_Get_Records",
            arguments: {
                module: "Parent_MTP_SKU",
                per_page: 10
            }
        }
    };

    try {
        const res = await axios.post(BASE_URL, payload);
        console.log('Response:', JSON.stringify(res.data, null, 2).substring(0, 1000));
        if (res.data.result?.content?.[0]?.text) {
            console.log('Text Content:', res.data.result.content[0].text.substring(0, 500));
        }
    } catch (err) {
        console.log('Error:', err.message);
    }
}

testFlat();
