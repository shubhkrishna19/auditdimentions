/**
 * DIAGNOSTIC: Check what box data actually looks like in CRM
 */

require('dotenv').config({ path: '.env.mcp' });
const axios = require('axios');

const MCP_URL = process.env.MCP_SERVER_URL;
const MCP_KEY = process.env.MCP_API_KEY;
const BASE_URL = `${MCP_URL}?key=${MCP_KEY}`;

async function callMCPTool(toolName, args) {
    const payload = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: toolName, arguments: args }
    };

    const response = await axios.post(BASE_URL, payload, {
        headers: { 'Content-Type': 'application/json' }
    });

    if (response.data.error) {
        throw new Error(`MCP Error: ${JSON.stringify(response.data.error)}`);
    }

    const textContent = response.data.result?.content?.[0]?.text;
    if (!textContent) return null;

    try {
        return JSON.parse(textContent);
    } catch {
        return textContent;
    }
}

async function diagnoseBoxData() {
    console.log('🔍 DIAGNOSTIC: Checking box data structure...\n');

    try {
        // Get first 5 parents
        console.log('📦 Fetching sample Parent_MTP_SKU products...');
        const parentsResponse = await callMCPTool('ZohoCRM_Get_Records', {
            path_variables: { module: 'Parent_MTP_SKU' },
            query_params: { fields: 'all', per_page: 5 }
        });

        const parents = parentsResponse?.data || [];
        console.log(`Found ${parents.length} parents\n`);

        for (const parent of parents) {
            console.log(`\n--- ${parent.Name} ---`);
            console.log(`ID: ${parent.id}`);

            const boxes = parent.MTP_Box_Dimensions;
            if (boxes && boxes.length > 0) {
                console.log(`Boxes (${boxes.length} total):`);
                console.log(JSON.stringify(boxes, null, 2));

                // Check for duplicates
                const seen = new Map();
                for (let i = 0; i < boxes.length; i++) {
                    const box = boxes[i];
                    const key = `${box.Box}-${box.Length}-${box.Width}-${box.Height}-${box.Weight}`;
                    if (seen.has(key)) {
                        console.log(`⚠️  DUPLICATE FOUND: Box at index ${i} matches index ${seen.get(key)}`);
                    } else {
                        seen.set(key, i);
                    }
                }
            } else {
                console.log('No boxes');
            }
        }

        // Get first 5 children
        console.log('\n\n📦 Fetching sample Products (children)...');
        const childrenResponse = await callMCPTool('ZohoCRM_Get_Records', {
            path_variables: { module: 'Products' },
            query_params: { fields: 'all', per_page: 5 }
        });

        const children = childrenResponse?.data || [];
        console.log(`Found ${children.length} children\n`);

        for (const child of children) {
            console.log(`\n--- ${child.Product_Code} ---`);
            console.log(`ID: ${child.id}`);

            const boxes = child.Bill_Dimension_Weight;
            if (boxes && boxes.length > 0) {
                console.log(`Boxes (${boxes.length} total):`);
                console.log(JSON.stringify(boxes, null, 2));

                // Check for duplicates
                const seen = new Map();
                for (let i = 0; i < boxes.length; i++) {
                    const box = boxes[i];
                    const key = `${box.BL}-${box.Length}-${box.Width}-${box.Height}-${box.Weight}`;
                    if (seen.has(key)) {
                        console.log(`⚠️  DUPLICATE FOUND: Box at index ${i} matches index ${seen.get(key)}`);
                    } else {
                        seen.set(key, i);
                    }
                }
            } else {
                console.log('No boxes');
            }
        }

    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
        throw error;
    }
}

diagnoseBoxData()
    .then(() => {
        console.log('\n✅ Diagnostic complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
