import fs from 'fs';
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

async function auditRecords() {
    try {
        const token = await getAccessToken();
        const headers = { Authorization: `Zoho-oauthtoken ${token}` };

        console.log('--- AUDITING CHILD MODULE (Products) ---');
        // Search for a specific child known to have issues
        const r = await axios.get(`${process.env.ZOHO_API_DOMAIN}/crm/v2/Products/search?criteria=(Product_Code:equals:SR-CLM-TM)`, { headers });
        const records = r.data.data || [];

        console.log(`Found ${records.length} records for SR-CLM-TM`);
        records.forEach((rec, idx) => {
            console.log(`Record ${idx + 1}: ID=${rec.id}, Created=${rec.Created_Time}`);
            console.log(`  Subform (Bill_Dimension_Weight) Row Count: ${rec.Bill_Dimension_Weight?.length || 0}`);
            if (rec.Bill_Dimension_Weight?.length > 1) {
                console.log('  Rows:', JSON.stringify(rec.Bill_Dimension_Weight.map(row => row.BL), null, 2));
            }
        });

        console.log('\n--- AUDITING PARENT MODULE COUNT ---');
        const p = await axios.get(`${process.env.ZOHO_API_DOMAIN}/crm/v2/Parent_MTP_SKU?per_page=1`, { headers });
        console.log(`Total Parent Records in CRM: ${p.data.info.count}`);

    } catch (error) {
        console.error(error.response?.data || error.message);
    }
}

auditRecords();
