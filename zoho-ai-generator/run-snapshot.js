// Direct snapshot test
import ZohoInspector from './zoho-inspector.js';

const inspector = new ZohoInspector();

console.log('Starting snapshot...\n');

const snapshot = await inspector.generateSnapshot(['Products']);
inspector.generateReport(snapshot);

console.log('\n✅ Done! Check zoho_snapshot.json and zoho_environment_report.md');
