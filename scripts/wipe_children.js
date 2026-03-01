import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function getAccessToken() {
    const params = new URLSearchParams();
    params.append('refresh_token', process.env.ZOHO_REFRESH_TOKEN);
    params.append('client_id', process.env.ZOHO_CLIENT_ID);
    params.append('client_secret', process.env.ZOHO_CLIENT_SECRET);
    params.append('grant_type', 'refresh_token');

    const response = await axios.post(`${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`, params);
    return response.data.access_token;
}

async function wipeChildren() {
    console.log('⚠️ STARTING TOTAL CHILD MODULE WIPE ⚠️');
    try {
        const token = await getAccessToken();
        const headers = { Authorization: `Zoho-oauthtoken ${token}` };

        // Fetch all Products
        let allIds = [];
        let page = 1;
        let more = true;

        while (more) {
            process.stdout.write(`Fetching Page ${page}... `);
            const r = await axios.get(`${process.env.ZOHO_API_DOMAIN}/crm/v2/Products?page=${page}&per_page=200`, { headers });
            const data = r.data.data || [];
            if (data.length > 0) {
                const ids = data.map(d => d.id);
                allIds = allIds.concat(ids);
                console.log(`Found ${ids.length}`);
            } else {
                console.log('No more records.');
            }
            more = r.data.info.more_records;
            page++;
        }

        console.log(`\nFound ${allIds.length} Child Records to Delete.`);

        if (allIds.length === 0) {
            console.log('Nothing to delete.');
            return;
        }

        // Batch Delete
        for (let i = 0; i < allIds.length; i += 100) {
            const batch = allIds.slice(i, i + 100).join(',');
            try {
                process.stdout.write(`Deleting batch ${i + 1}-${Math.min(i + 100, allIds.length)}... `);
                await axios.delete(`${process.env.ZOHO_API_DOMAIN}/crm/v2/Products?ids=${batch}`, { headers });
                console.log('✅ Deleted.');
            } catch (e) {
                console.log('❌ Failed:', e.message);
            }
        }
        console.log('🏁 CHILD MODULE WIPED CLEAN.');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

wipeChildren();
