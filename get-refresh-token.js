const https = require('https');

const clientId = '1000.CGGK0M58LOXYJG9IR23UZ5G7XAZZBA';
const clientSecret = 'f60455449d30984ca1c026a872a2395cb5100dba36';
const code = '1000.1d7b7d56c760608797ec7de81c3b520b.4273fc6387b519240e443109996b005f';

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
