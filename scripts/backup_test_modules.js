import fs from 'fs';
import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12'; // Use the secure key from context

async function backup() {
    console.log('📦 Starting Module Backup...');

    const modules = [
        'test161__Commission_Settings',
        'test161__Commission_Sales'
    ];

    for (const moduleName of modules) {
        console.log(`\nFetching ${moduleName}...`);
        try {
            const res = await axios.post(BASE_URL, {
                jsonrpc: "2.0", id: 1, method: "tools/call",
                params: {
                    name: "ZohoCRM_Get_Records",
                    arguments: {
                        path_variables: { module: moduleName },
                        query_params: { page: 1, per_page: 200 }
                    }
                }
            });

            if (res.data.result?.content?.[0]?.text) {
                const result = JSON.parse(res.data.result.content[0].text);
                if (result.data) {
                    const count = result.data.length;
                    console.log(`✅ Found ${count} records.`);

                    const filename = `${moduleName}_backup.json`;
                    fs.writeFileSync(filename, JSON.stringify(result.data, null, 2));
                    console.log(`Saved to ${filename}`);
                } else {
                    console.log(`⚠️ No data found (or empty).`); // API might return "204 No Content" equivalent or empty array
                }
            } else {
                console.log(`⚠️ Unexpected response format.`);
            }

        } catch (err) {
            console.log(`❌ Error backing up ${moduleName}: ${err.message}`);
            // If 204 No Content, it's fine (empty module)
            if (err.response?.status === 204) console.log(" (Module is empty)");
        }
    }

    console.log('\n🎉 Backup Complete!');
}

backup();
