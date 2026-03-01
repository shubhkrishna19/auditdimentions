// Quick diagnostic to see what's failing
import ZohoInspector from './zoho-inspector.js';

const inspector = new ZohoInspector();

console.log('Testing Zoho API connection...\n');

// Test 1: Get access token
try {
    const token = await inspector.getAccessToken();
    console.log('✅ Access token obtained:', token.substring(0, 30) + '...\n');
} catch (error) {
    console.error('❌ Token error:', error.message);
    process.exit(1);
}

// Test 2: Try to get module fields
console.log('Attempting to fetch Products module fields...\n');
try {
    const moduleInfo = await inspector.inspectModule('Products');
    console.log('✅ Success! Found', moduleInfo.fieldCount, 'fields\n');
    console.log('Sample fields:');
    moduleInfo.fields.slice(0, 5).forEach(f => {
        console.log(`  - ${f.display_label} (${f.api_name}) - ${f.data_type}`);
    });
} catch (error) {
    console.error('❌ Module inspection failed!');
    console.error('Error:', error.message);
    console.error('\nFull error:', error.response?.data || error);

    if (error.message.includes('INVALID_TOKEN') || error.message.includes('OAUTH')) {
        console.error('\n⚠️  Token issue detected. The Self Client may need additional scopes.');
    }
}

// Test 3: Try to get records (different API endpoint)
console.log('\n\nAttempting to fetch Products records...\n');
try {
    const records = await inspector.getSampleRecords('Products', 2);
    console.log('✅ Success! Retrieved', records.length, 'records\n');
    if (records.length > 0) {
        console.log('Sample record fields:', Object.keys(records[0]).slice(0, 10).join(', '));
    }
} catch (error) {
    console.error('❌ Record fetch failed!');
    console.error('Error:', error.message);
    console.error('\nFull error:', error.response?.data || error);
}
