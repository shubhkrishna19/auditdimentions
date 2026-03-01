/**
 * Test if MCP Update is actually working
 * Fetch a record, verify update response, then re-fetch to confirm
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
        return JSON.parse(textContent);
    } catch {
        return textContent;
    }
}

async function testUpdate() {
    console.log('🧪 Testing if MCP updates actually work...\n');

    try {
        // Step 1: Get a parent with duplicate boxes
        console.log('Step 1: Finding a parent with boxes...');
        const listResponse = await callMCPTool('ZohoCRM_Get_Records', {
            path_variables: { module: 'Parent_MTP_SKU' },
            query_params: { fields: 'id,Name', per_page: 10 }
        });

        const parents = listResponse?.data || [];

        for (const parent of parents) {
            const recordResponse = await callMCPTool('ZohoCRM_Get_Record', {
                path_variables: { module: 'Parent_MTP_SKU', recordID: parent.id }
            });

            const record = recordResponse?.data?.[0];
            const boxes = record?.MTP_Box_Dimensions || [];

            if (boxes.length > 0) {
                console.log(`\n✅ Found: ${record.Name}`);
                console.log(`   Current boxes: ${boxes.length}`);
                console.log('   Box details:');
                boxes.forEach((b, i) => {
                    console.log(`   ${i + 1}. Box ${b.Box}: ${b.Length}x${b.Width}x${b.Height} cm, ${b.Weight}g`);
                });

                // Step 2: Try to update with a test modification
                console.log('\nStep 2: Attempting update...');

                const updateResponse = await callMCPTool('ZohoCRM_Update_Record', {
                    path_variables: { module: 'Parent_MTP_SKU', recordID: record.id },
                    body: {
                        data: [{
                            MTP_Box_Dimensions: boxes.slice(0, Math.max(1, boxes.length - 1)) // Remove last box as test
                        }]
                    }
                });

                console.log('\n📋 Update Response:');
                console.log(JSON.stringify(updateResponse, null, 2));

                // Step 3: Re-fetch to verify
                console.log('\nStep 3: Re-fetching to verify update...');
                await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds

                const verifyResponse = await callMCPTool('ZohoCRM_Get_Record', {
                    path_variables: { module: 'Parent_MTP_SKU', recordID: record.id }
                });

                const verifiedRecord = verifyResponse?.data?.[0];
                const verifiedBoxes = verifiedRecord?.MTP_Box_Dimensions || [];

                console.log(`\n🔍 Verification:`);
                console.log(`   Original boxes: ${boxes.length}`);
                console.log(`   After update: ${verifiedBoxes.length}`);

                if (verifiedBoxes.length !== boxes.length) {
                    console.log('\n✅ SUCCESS! Update worked - boxes changed from', boxes.length, 'to', verifiedBoxes.length);
                } else {
                    console.log('\n❌ FAILED! Update did not persist - boxes still', verifiedBoxes.length);
                    console.log('\n⚠️ This means the MCP Update_Record is not actually writing to CRM!');
                }

                break;
            }
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Full error:', error);
        throw error;
    }
}

testUpdate()
    .then(() => {
        console.log('\n✅ Test complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    });
