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

async function testUpdate() {
    try {
        const token = await getAccessToken();
        const headers = { Authorization: `Zoho-oauthtoken ${token}` };

        // 1. Search Record
        const search = await axios.get(`${process.env.ZOHO_API_DOMAIN}/crm/v2/Products/search?criteria=(Product_Code:equals:SR-CLM-TM)`, { headers });
        const record = search.data.data?.[0];

        if (!record) {
            console.log('Record not found');
            return;
        }

        console.log(`Updating Record ID: ${record.id}`);
        console.log(`Current Live_Status: ${record.Live_Status}`);

        // 2. Update Live_Status
        const payload = {
            data: [
                {
                    id: record.id,
                    Live_Status: 'Y'
                }
            ]
        };

        const update = await axios.put(`${process.env.ZOHO_API_DOMAIN}/crm/v2/Products`, payload, { headers });
        console.log('Update Response:', JSON.stringify(update.data, null, 2));

        // 3. Verify Immediately
        const verify = await axios.get(`${process.env.ZOHO_API_DOMAIN}/crm/v2/Products/${record.id}`, { headers });
        console.log('New Live_Status:', verify.data.data[0].Live_Status);

    } catch (error) {
        console.error(error.response?.data || error.message);
    }
}

testUpdate();
