// Full CRM inspection
import ZohoInspector from './zoho-inspector.js';

const inspector = new ZohoInspector();

console.log('🔍 Starting full CRM inspection...\n');
console.log('This will inspect all standard modules in your Zoho CRM\n');

const modules = [
    'Products',
    'Contacts',
    'Accounts',
    'Leads',
    'Deals',
    'Invoices',
    'Quotes',
    'Purchase_Orders',
    'Sales_Orders',
    'Vendors'
];

const snapshot = await inspector.generateSnapshot(modules);
inspector.generateReport(snapshot);

console.log('\n✅ Full inspection complete!');
console.log('\nFiles generated:');
console.log('  📄 zoho_snapshot.json - Complete data for AI');
console.log('  📄 zoho_environment_report.md - Human-readable report');
console.log('\nSummary:');

let totalFields = 0;
for (const [moduleName, moduleData] of Object.entries(snapshot.modules)) {
    if (!moduleData.error) {
        console.log(`  ${moduleName}: ${moduleData.fieldCount} fields`);
        totalFields += moduleData.fieldCount;
    } else {
        console.log(`  ${moduleName}: ❌ ${moduleData.error}`);
    }
}

console.log(`\n📊 Total fields across all modules: ${totalFields}`);
