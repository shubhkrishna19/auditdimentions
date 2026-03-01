
require('dotenv').config({ path: '.env.mcp' });
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const fs = require('fs');

async function inspectProduct() {
    console.log('🔍 Inspecting Product via MCP...');

    // Get the tool list to find the Get_Record tool name if unsure, but we know it's ZohoCRM_Get_Record

    // Config
    const transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-zoho-crm"]
    });

    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    await client.connect(transport);
    console.log('✅ Connected to MCP Server');

    // Fetch Product by ID or search?
    // We need an ID. Let's Search first.
    // Platform: ZohoCRM_Search_Records

    const searchSku = "S-MO-W5";
    console.log(`🔎 Searching for SKU: ${searchSku}`);

    // Call Search
    const searchResult = await client.callTool({
        name: "ZohoCRM_Search_Records",
        arguments: {
            module: "Products",
            criteria: `(Product_Code:equals:${searchSku})`
        }
    });

    const products = JSON.parse(searchResult.content[0].text).data;

    if (!products || products.length === 0) {
        console.log('❌ Product not found via Search.');
        process.exit(1);
    }

    const productId = products[0].id;
    console.log(`✅ Found Product ID: ${productId}`);

    // Now Fetch Full Record to see Subforms
    console.log('📦 Fetching Full Record...');
    const recordResult = await client.callTool({
        name: "ZohoCRM_Get_Record",
        arguments: {
            module: "Products",
            recordID: productId
        }
    });

    const fullRecord = JSON.parse(recordResult.content[0].text).data[0];

    // Dump to file for inspection
    fs.writeFileSync('product_inspection.json', JSON.stringify(fullRecord, null, 2));
    console.log('📄 Saved full record to product_inspection.json');

    // Check specific fields
    console.log('\n--- Inspection Results ---');
    console.log(`Create Time: ${fullRecord.Created_Time}`);
    console.log(`Modified Time: ${fullRecord.Modified_Time}`);

    if (fullRecord.Product_Identifiers) {
        console.log('✅ Found field "Product_Identifiers":');
        console.log(JSON.stringify(fullRecord.Product_Identifiers, null, 2));
    } else {
        console.log('⚠️ Field "Product_Identifiers" NOT FOUND in response.');
    }

    if (fullRecord.Bill_Dimension_Weight) {
        console.log(`✅ Found field "Bill_Dimension_Weight" with ${fullRecord.Bill_Dimension_Weight.length} boxes.`);
    } else {
        console.log('⚠️ Field "Bill_Dimension_Weight" NOT FOUND.');
    }

    // Check for potential junk fields (unexpected arrays)
    const keys = Object.keys(fullRecord);
    const subforms = keys.filter(k => Array.isArray(fullRecord[k]) && typeof fullRecord[k][0] === 'object');
    console.log('\nPotential Subforms found:');
    subforms.forEach(s => console.log(`- ${s} (${fullRecord[s].length} items)`));

    client.close();
}

inspectProduct().catch(console.error);
