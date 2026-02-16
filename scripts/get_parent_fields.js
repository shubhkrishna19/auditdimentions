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

async function run() {
    try {
        const token = await getAccessToken();
        const response = await axios.get(`${process.env.ZOHO_API_DOMAIN}/crm/v2/settings/fields?module=Parent_MTP_SKU`, {
            headers: { Authorization: `Zoho-oauthtoken ${token}` }
        });

        const fields = response.data.fields.map(f => ({
            label: f.field_label,
            api: f.api_name,
            type: f.data_type
        }));

        console.log(JSON.stringify(fields, null, 2));
    } catch (error) {
        console.error(error.response?.data || error.message);
    }
}

run();
