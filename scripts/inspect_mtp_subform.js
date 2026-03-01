import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function getSubformFields(module, subformApi) {
    const payload = {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: {
            name: "ZohoCRM_Get_Fields",
            arguments: {
                query_params: { module: module, type: "all" }
            }
        }
    };

    const res = await axios.post(BASE_URL, payload, { headers: { 'Content-Type': 'application/json' } });
    if (res.data.result?.content?.[0]) {
        const data = JSON.parse(res.data.result.content[0].text);
        const subform = data.fields.find(f => f.api_name === subformApi);
        if (subform && subform.lookup) {
            // Sometimes subform fields are listed under lookup or association
            console.log(`Subform: ${subformApi}`);
            // Let's just fetch fields of the associated module directly
            const assocModule = subform.associated_module?.module;
            if (assocModule) {
                const p2 = {
                    jsonrpc: "2.0", id: 2, method: "tools/call",
                    params: {
                        name: "ZohoCRM_Get_Fields",
                        arguments: {
                            query_params: { module: assocModule }
                        }
                    }
                };
                const res2 = await axios.post(BASE_URL, p2, { headers: { 'Content-Type': 'application/json' } });
                console.log(res2.data.result.content[0].text);
            }
        }
    }
}

getSubformFields('Parent_MTP_SKU', 'MTP_Box_Dimensions');
