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

async function verify() {
    try {
        const token = await getAccessToken();
        const headers = { Authorization: `Zoho-oauthtoken ${token}` };

        console.log('--- FINAL VERIFICATION ---');

        // 1. Check Counts
        const p = await axios.get(`${process.env.ZOHO_API_DOMAIN}/crm/v2/Parent_MTP_SKU?per_page=1`, { headers });
        const c = await axios.get(`${process.env.ZOHO_API_DOMAIN}/crm/v2/Products?per_page=1`, { headers });

        console.log(`Parent Count: ${p.data.info.count} (Expected: 230)`);
        console.log(`Child Count:  ${c.data.info.count} (Expected: 385)`);

        // 2. Spot Check Child SR-CLM-TM
        const search = await axios.get(`${process.env.ZOHO_API_DOMAIN}/crm/v2/Products/search?criteria=(Product_Code:equals:SR-CLM-TM)`, { headers });
        const child = search.data.data?.[0];

        if (child) {
            console.log('\n--- Child Record: SR-CLM-TM ---');
            console.log(`Product Name: ${child.Product_Name} (Should be Readable)`);
            console.log(`Product Code: ${child.Product_Code} (Should be SKU)`);
            console.log(`MTP_SKU ID:   ${child.MTP_SKU?.id} (Should be linked)`);
            console.log(`Subform Rows: ${child.Bill_Dimension_Weight?.length} (Should be 1)`);
        } else {
            console.log('\n❌ Child SR-CLM-TM not found!');
        }

    } catch (error) {
        console.error(error.response?.data || error.message);
    }
}

verify();
