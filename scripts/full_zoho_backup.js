import fs from 'fs';
import path from 'path';
import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';
const BACKUP_DIR = './zoho_backups_full';

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callTool(name, args) {
    const res = await axios.post(BASE_URL, {
        jsonrpc: "2.0", id: Date.now(), method: "tools/call",
        params: { name, arguments: args }
    }, { headers: { 'Content-Type': 'application/json' } });

    if (res.data.result?.content?.[0]?.text) {
        return JSON.parse(res.data.result.content[0].text);
    }
    return null;
}

async function runPriorityBackup() {
    console.log('📦 Starting Priority Zoho CRM Backup...');

    const priorityModules = [
        'Parent_MTP_SKU',
        'Products',
        'MTP_Box_Dimensions',
        'Product_Identifiers',
        'Audit_Dimentions',
        'Bill_Dimension_Weight'
    ];

    for (const apiName of priorityModules) {
        try {
            console.log(`\n--- Processing ${apiName} ---`);

            // 1. Get Fields
            const fieldsData = await callTool('ZohoCRM_Get_Fields', { query_params: { module: apiName } });
            if (!fieldsData || !fieldsData.fields) {
                console.log(`❌ Failed to get fields for ${apiName}`);
                continue;
            }

            const fieldNames = fieldsData.fields.map(f => f.api_name).join(',');
            console.log(`   Fetched ${fieldsData.fields.length} field names.`);

            // 2. Fetch Records with actual fields
            let allRecords = [];
            let page = 1;
            let hasMore = true;

            while (hasMore && page <= 5) {
                const result = await callTool('ZohoCRM_Get_Records', {
                    path_variables: { module: apiName },
                    query_params: { page: page, per_page: 200, fields: fieldNames }
                });

                if (result && result.data && result.data.length > 0) {
                    allRecords = allRecords.concat(result.data);
                    console.log(`   Page ${page}: Fetched ${result.data.length} records.`);
                    if (result.info?.more_records && page < 5) {
                        page++;
                        await sleep(500);
                    } else {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            }

            if (allRecords.length > 0) {
                fs.writeFileSync(path.join(BACKUP_DIR, `${apiName}.json`), JSON.stringify(allRecords, null, 2));
                console.log(`✅ Success: Saved ${allRecords.length} records.`);
            }

        } catch (err) {
            console.log(`❌ Error backing up ${apiName}: ${err.message}`);
        }
    }
    console.log('\n🏁 Priority Backup Complete.');
}

runPriorityBackup();
