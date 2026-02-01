// Inspect MTP SKU module
import ZohoInspector from './zoho-inspector.js';

const inspector = new ZohoInspector();

console.log('🔍 Inspecting MTP SKU module...\n');

try {
    const moduleInfo = await inspector.inspectModule('Parent_MTP_SKU');

    console.log(`✅ Found ${moduleInfo.fieldCount} fields in Parent_MTP_SKU\n`);

    console.log('Key fields for Live Status implementation:');

    // Look for status-related fields
    const statusFields = moduleInfo.fields.filter(f =>
        f.api_name.toLowerCase().includes('status') ||
        f.api_name.toLowerCase().includes('active') ||
        f.api_name.toLowerCase().includes('live')
    );

    console.log('\nStatus/Active fields:');
    statusFields.forEach(f => {
        console.log(`  - ${f.api_name} (${f.display_label}) - ${f.data_type}`);
    });

    // Look for parent relationship fields
    const lookupFields = moduleInfo.fields.filter(f => f.data_type === 'lookup');

    console.log('\nLookup/Relationship fields:');
    lookupFields.forEach(f => {
        console.log(`  - ${f.api_name} (${f.display_label}) - links to ${f.lookup?.module || 'unknown'}`);
    });

    console.log('\nAll fields:');
    moduleInfo.fields.forEach(f => {
        console.log(`  - ${f.api_name} (${f.data_type})`);
    });

} catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTrying alternative module name: MTP_SKU');

    try {
        const moduleInfo = await inspector.inspectModule('MTP_SKU');
        console.log(`✅ Found ${moduleInfo.fieldCount} fields in MTP_SKU`);
    } catch (err2) {
        console.error('❌ Also failed:', err2.message);
        console.log('\nPlease provide the exact module API name for MTP SKU.');
    }
}
