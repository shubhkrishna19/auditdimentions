import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function checkChild(sku) {
    const payload = {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: {
            name: "ZohoCRM_Search_Records",
            arguments: {
                path_variables: { module: "Products" },
                query_params: { criteria: `(Product_Code:equals:${sku})`, fields: "Product_Code,Product_Identifiers" }
            }
        }
    };

    const res = await axios.post(BASE_URL, payload, { headers: { 'Content-Type': 'application/json' } });
    if (res.data.result?.content?.[0]) {
        console.log(res.data.result.content[0].text);
    }
}

checkChild('SR-CLM-2W');
