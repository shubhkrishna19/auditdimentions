import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function fetchUsers() {
    console.log('🔍 Fetching Zoho Users...');

    const payload = {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: {
            name: "ZohoCRM_Get_Users",
            arguments: {
                query_params: { type: 'ActiveUsers' } // Get active users only
            }
        }
    };

    try {
        const res = await axios.post(BASE_URL, payload, { headers: { 'Content-Type': 'application/json' } });

        if (res.data.result?.content?.[0]?.text) {
            const data = JSON.parse(res.data.result.content[0].text);
            if (data.users) {
                console.log(`\n✅ Found ${data.users.length} Active Users:`);
                data.users.forEach(u => {
                    console.log(`---`);
                    console.log(`Full Name: ${u.full_name}`);
                    console.log(`Email: ${u.email}`);
                    console.log(`Role: ${u.role.name}`);
                    console.log(`Profile: ${u.profile.name}`);
                    console.log(`ID: ${u.id}`);
                });
            }
        } else {
            console.log('Unexpected response:', JSON.stringify(res.data, null, 2));
        }

    } catch (err) {
        console.log('❌ Error:', err.message);
    }
}

fetchUsers();
