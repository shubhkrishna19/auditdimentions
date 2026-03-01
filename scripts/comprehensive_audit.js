// Comprehensive Zoho Ecosystem Audit Script
// Collects ALL data needed for strategic analysis

import zohoMCP from './zoho_mcp_wrapper.js';
import fs from 'fs/promises';

async function runComprehensiveAudit() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {},
    crm: {},
    creator: {},
    dataQuality: {},
    recommendations: []
  };

  console.log('🔍 COMPREHENSIVE ZOHO ECOSYSTEM AUDIT');
  console.log('=' .repeat(70));
  console.log('Starting at:', new Date().toLocaleString());
  console.log('');

  try {
    // 1. Get ALL CRM Modules
    console.log('📦 Step 1: Fetching CRM Modules...');
    const modulesData = await zohoMCP.getCRMModules();
    const modules = modulesData.modules;

    const customModules = modules.filter(m => m.generated_type === 'custom');
    const standardModules = modules.filter(m => m.generated_type !== 'custom');

    report.crm.totalModules = modules.length;
    report.crm.customModules = customModules.map(m => ({
      name: m.api_name,
      label: m.singular_label,
      editable: m.editable
    }));
    report.crm.standardModules = standardModules.map(m => m.api_name);

    console.log(`   ✓ Found ${modules.length} modules (${customModules.length} custom, ${standardModules.length} standard)`);
    console.log('');

    // 2. Get Parent_MTP_SKU Data
    console.log('📊 Step 2: Analyzing Parent_MTP_SKU module...');
    const parentFields = await zohoMCP.getCRMFields('Parent_MTP_SKU', 'all');
    const parentRecords = await zohoMCP.getAllCRMRecords('Parent_MTP_SKU', 500);

    report.crm.parentMTPSKU = {
      totalFields: parentFields.fields.length,
      customFields: parentFields.fields.filter(f => f.custom_field).length,
      totalRecords: parentRecords.length,
      dataQuality: {
        withoutCategory: parentRecords.filter(r => !r.Product_Category).length,
        withoutWeightCategory: parentRecords.filter(r => !r.Weight_Category_Billed).length,
        withoutBilledWeight: parentRecords.filter(r => !r.Billed_Physical_Weight).length,
        withoutLiveStatus: parentRecords.filter(r => !r.ProductActive && !r.Live_Status).length
      }
    };

    console.log(`   ✓ ${parentFields.fields.length} fields, ${parentRecords.length} records`);
    console.log(`   ⚠️  ${report.crm.parentMTPSKU.dataQuality.withoutCategory} missing Product_Category`);
    console.log('');

    // 3. Get Products Data
    console.log('📊 Step 3: Analyzing Products module...');
    const productsFields = await zohoMCP.getCRMFields('Products', 'all');
    const productsRecords = await zohoMCP.getAllCRMRecords('Products', 500);

    report.crm.products = {
      totalFields: productsFields.fields.length,
      customFields: productsFields.fields.filter(f => f.custom_field).length,
      totalRecords: productsRecords.length,
      dataQuality: {
        withoutCategory: productsRecords.filter(r => !r.Product_Category).length,
        withoutWeightCategory: productsRecords.filter(r => !r.Weight_Category_Billed).length,
        withoutLiveStatus: productsRecords.filter(r => !r.Live_Status).length,
        withAuditData: productsRecords.filter(r => r.Last_Audited_Total_Weight_kg).length,
        withCategoryMismatch: productsRecords.filter(r => r.Category_Mismatch === true).length
      }
    };

    console.log(`   ✓ ${productsFields.fields.length} fields, ${productsRecords.length} records`);
    console.log(`   ✓ ${report.crm.products.dataQuality.withAuditData} have audit data`);
    console.log(`   ⚠️  ${report.crm.products.dataQuality.withCategoryMismatch} have category mismatches`);
    console.log('');

    // 4. Analyze Custom Modules
    console.log('🔧 Step 4: Analyzing custom modules...');
    for (const mod of customModules) {
      console.log(`   Checking ${mod.api_name}...`);
      try {
        const records = await zohoMCP.getAllCRMRecords(mod.api_name, 100);
        report.crm[mod.api_name] = {
          label: mod.singular_label,
          recordCount: records.length,
          status: records.length > 0 ? 'Active' : 'Empty'
        };
        console.log(`     ✓ ${records.length} records`);
      } catch (e) {
        console.log(`     ⚠️  Error: ${e.message}`);
        report.crm[mod.api_name] = { error: e.message };
      }
    }
    console.log('');

    // 5. Get Creator Applications
    console.log('🎨 Step 5: Fetching Zoho Creator applications...');
    try {
      const creatorApps = await zohoMCP.getCreatorApps();
      report.creator.applications = creatorApps.applications || [];
      report.creator.totalApps = report.creator.applications.length;

      console.log(`   ✓ Found ${report.creator.totalApps} Creator applications:`);
      report.creator.applications.forEach(app => {
        console.log(`     - ${app.application_name} (${app.link_name})`);
      });
    } catch (e) {
      console.log(`   ⚠️  Error accessing Creator: ${e.message}`);
      report.creator.error = e.message;
    }
    console.log('');

    // 6. Generate Summary
    console.log('📋 Step 6: Generating summary...');
    report.summary = {
      crmModules: report.crm.totalModules,
      customModules: customModules.length,
      totalProducts: report.crm.products.totalRecords,
      totalParentSKUs: report.crm.parentMTPSKU.totalRecords,
      creatorApps: report.creator.totalApps || 0,
      dataQualityScore: calculateDataQualityScore(report),
      auditCoverage: ((report.crm.products.dataQuality.withAuditData / report.crm.products.totalRecords) * 100).toFixed(1) + '%'
    };

    // 7. Generate Recommendations
    report.recommendations = generateRecommendations(report);

    // 8. Save Report
    const filename = `zoho_audit_${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(report, null, 2));

    console.log('');
    console.log('=' .repeat(70));
    console.log('✅ AUDIT COMPLETE!');
    console.log('=' .repeat(70));
    console.log('');
    console.log('SUMMARY:');
    console.log(`  CRM Modules: ${report.summary.crmModules} (${customModules.length} custom)`);
    console.log(`  Products: ${report.summary.totalProducts}`);
    console.log(`  Parent SKUs: ${report.summary.totalParentSKUs}`);
    console.log(`  Creator Apps: ${report.summary.creatorApps}`);
    console.log(`  Data Quality Score: ${report.summary.dataQualityScore}/100`);
    console.log(`  Audit Coverage: ${report.summary.auditCoverage}`);
    console.log('');
    console.log(`📄 Full report saved to: ${filename}`);
    console.log('');

    return report;

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    throw error;
  }
}

function calculateDataQualityScore(report) {
  let score = 100;
  const products = report.crm.products;
  const parent = report.crm.parentMTPSKU;

  // Deduct points for missing data
  if (products.totalRecords > 0) {
    score -= (products.dataQuality.withoutCategory / products.totalRecords) * 15;
    score -= (products.dataQuality.withoutWeightCategory / products.totalRecords) * 15;
    score -= (products.dataQuality.withoutLiveStatus / products.totalRecords) * 10;
    score -= (products.dataQuality.withCategoryMismatch / products.totalRecords) * 20;
  }

  if (parent.totalRecords > 0) {
    score -= (parent.dataQuality.withoutCategory / parent.totalRecords) * 10;
    score -= (parent.dataQuality.withoutWeightCategory / parent.totalRecords) * 10;
    score -= (parent.dataQuality.withoutBilledWeight / parent.totalRecords) * 10;
  }

  return Math.max(0, Math.round(score));
}

function generateRecommendations(report) {
  const recommendations = [];

  // Check for data quality issues
  if (report.crm.products.dataQuality.withoutCategory > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Data Quality',
      issue: `${report.crm.products.dataQuality.withoutCategory} products missing Product_Category`,
      action: 'Add validation rule to make Product_Category required',
      impact: 'Prevents filtering and categorization errors'
    });
  }

  if (report.crm.products.dataQuality.withCategoryMismatch > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Data Quality',
      issue: `${report.crm.products.dataQuality.withCategoryMismatch} products have category mismatches`,
      action: 'Create workflow to auto-update Weight_Category_Billed after audits',
      impact: 'Eliminates manual correction work'
    });
  }

  if (report.crm.products.dataQuality.withAuditData < report.crm.products.totalRecords * 0.5) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Process',
      issue: `Only ${report.crm.products.dataQuality.withAuditData} of ${report.crm.products.totalRecords} products have audit data`,
      action: 'Schedule regular audit cycles for all products',
      impact: 'Improves data accuracy and shipping cost accuracy'
    });
  }

  // Check for test modules in production
  const testModules = report.crm.customModules.filter(m => m.name.includes('test'));
  if (testModules.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Configuration',
      issue: `${testModules.length} test modules found in production (${testModules.map(m => m.name).join(', ')})`,
      action: 'Export data, create production modules, delete test modules',
      impact: 'Cleaner configuration and better organization'
    });
  }

  return recommendations;
}

// Run the audit
runComprehensiveAudit().catch(console.error);
