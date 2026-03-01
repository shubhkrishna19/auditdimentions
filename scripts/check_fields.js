import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function callMCP(toolName, args) {
    const payload = {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: toolName, arguments: args }
    };
    const res = await axios.post(BASE_URL, payload);
    return JSON.parse(res.data.result.content[0].text);
}

async function check() {
    const p = await callMCP('ZohoCRM_Get_Records', { path_variables: { module: 'Parent_MTP_SKU' }, query_params: { per_page: 1 } });
    console.log('Parent Fields:', Object.keys(p.data[0]));
    const c = await callMCP('ZohoCRM_Get_Records', { path_variables: { module: 'Products' }, query_params: { per_page: 1 } });
    console.log('Product Fields:', Object.keys(c.data[0]));
}

check();
