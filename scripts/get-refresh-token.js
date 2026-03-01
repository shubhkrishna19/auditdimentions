const https = require('https');

// ⚠️ Load these from environment — never hardcode
const clientId = process.env.ZOHO_CLIENT_ID;
const clientSecret = process.env.ZOHO_CLIENT_SECRET;
const code = process.env.ZOHO_AUTH_CODE; // one-time code from Zoho OAuth consent screen

const postData = `code=${code}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=authorization_code`;

const options = {
    hostname: 'accounts.zoho.com',
    path: '/oauth/v2/token',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        const response = JSON.parse(data);
        if (response.refresh_token) {
            console.log('\n✅ SUCCESS! Your tokens:\n');
            console.log('REFRESH_TOKEN:', response.refresh_token);
            console.log('\nACCESS_TOKEN (for reference):', response.access_token);
            console.log('\nEXPIRES IN:', response.expires_in, 'seconds');
            console.log('\n⚠️  SAVE THE REFRESH_TOKEN - You need it for config!\n');
        } else {
            console.error('❌ Error:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error);
});

req.write(postData);
req.end();
