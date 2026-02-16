import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function callMCP(toolName, args) {
    const payload = {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: toolName, arguments: args }
    };
    const res = await axios.post(BASE_URL, payload);
    return res.data;
}

async function testFields() {
    const fields = ['id', 'Product_Code', 'Product_Category', 'Weight_Category_Billed', 'Total_Weight'];
    for (const f of fields) {
        const res = await callMCP('ZohoCRM_Get_Records', {
            path_variables: { module: 'Products' },
            query_params: { fields: f, per_page: 1 }
        });
        if (res.error) {
            console.log(`❌ Field ${f} FAILED:`, res.error.message);
        } else {
            console.log(`✅ Field ${f} OK`);
        }
    }
}

testFields();
