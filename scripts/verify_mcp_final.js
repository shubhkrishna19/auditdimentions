import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function verifySearch() {
    console.log('🔍 Testing ZohoCRM_Search_Records (Nested Args)...');

    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: "ZohoCRM_Search_Records",
            arguments: {
                path_variables: {
                    module: "Parent_MTP_SKU"
                },
                query_params: {
                    criteria: "(Name:equals:SR-CLM-T)"
                }
            }
        }
    };

    try {
        const res = await axios.post(BASE_URL, payload, { headers: { 'Content-Type': 'application/json' } });

        if (res.data.result && res.data.result.content) {
            const text = res.data.result.content[0].text;

            try {
                const result = JSON.parse(text);
                if (result.data && result.data.length > 0) {
                    const record = result.data[0];
                    console.log('\n--- VERIFIED DATA ---');
                    console.log(`SKU: ${record.Name}`);
                    console.log(`Product_Category: "${record.Product_Category}"`);
                    console.log(`Weight_Category_Billed: "${record.Weight_Category_Billed}"`);
                } else {
                    console.log('No data found in response:', text);
                }
            } catch (e) {
                console.log('Response was not JSON:', text);
            }

        } else {
            console.log('⚠️ API Error:', JSON.stringify(res.data, null, 2));
        }

    } catch (err) {
        if (err.response) {
            console.log('❌ HTTP Error:', err.response.status, JSON.stringify(err.response.data));
        } else {
            console.log('❌ Error:', err.message);
        }
    }
}

verifySearch();
