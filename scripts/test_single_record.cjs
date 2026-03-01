/**
 * Simple test: Fetch ONE record to see if subform data comes through
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

    console.log(`\n📤 Calling ${toolName}...`);
    console.log('Args:', JSON.stringify(args, null, 2));

    const response = await axios.post(BASE_URL, payload, {
        headers: { 'Content-Type': 'application/json' }
    });

    if (response.data.error) {
        console.error('❌ MCP Error:', JSON.stringify(response.data.error, null, 2));
        throw new Error(`MCP Error: ${JSON.stringify(response.data.error)}`);
    }

    const textContent = response.data.result?.content?.[0]?.text;
    if (!textContent) {
        console.log('⚠️ No text content in response');
        return null;
    }

    try {
        const parsed = JSON.parse(textContent);
        console.log('✅ Response received');
        return parsed;
    } catch {
        console.log('⚠️ Could not parse as JSON');
        return textContent;
    }
}

async function testSingleRecord() {
    console.log('🧪 Testing single record fetch...\n');

    try {
        // First get a list of IDs
        console.log('Step 1: Get list of Parent IDs...');
        const listResponse = await callMCPTool('ZohoCRM_Get_Records', {
            path_variables: { module: 'Parent_MTP_SKU' },
            query_params: { fields: 'id,Name', per_page: 1 }
        });

        const firstParent = listResponse?.data?.[0];
        if (!firstParent) {
            console.log('❌ No parents found');
            return;
        }

        console.log(`\nFound parent: ${firstParent.Name} (ID: ${firstParent.id})`);

        // Now fetch that specific record
        console.log('\nStep 2: Fetch full record with subforms...');
        const recordResponse = await callMCPTool('ZohoCRM_Get_Record', {
            path_variables: { module: 'Parent_MTP_SKU', recordID: firstParent.id }
        });

        const record = recordResponse?.data?.[0];
        if (!record) {
            console.log('❌ No record data returned');
            return;
        }

        console.log('\n📦 Record data:');
        console.log(`Name: ${record.Name}`);
        console.log(`ID: ${record.id}`);

        const boxes = record.MTP_Box_Dimensions;
        if (boxes && boxes.length > 0) {
            console.log(`\n✅ SUCCESS! Found ${boxes.length} boxes:`);
            console.log(JSON.stringify(boxes, null, 2));
        } else {
            console.log('\n❌ No boxes found in record');
            console.log('Full record keys:', Object.keys(record));
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        throw error;
    }
}

testSingleRecord()
    .then(() => {
        console.log('\n✅ Test complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    });
