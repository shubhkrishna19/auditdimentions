#!/usr/bin/env node

/**
 * Zoho API Inspector
 * Connects to your Zoho CRM to inspect modules, fields, and deployed scripts
 * Enables AI to "see" your Zoho environment for better iteration
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ZohoInspector {
    constructor() {
        this.clientId = process.env.ZOHO_CLIENT_ID;
        this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
        this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
        this.apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
        this.accessToken = null;
    }

    /**
     * Get fresh access token
     */
    async getAccessToken() {
        if (this.accessToken) return this.accessToken;

        try {
            const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
                params: {
                    refresh_token: this.refreshToken,
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'refresh_token'
                }
            });

            this.accessToken = response.data.access_token;
            return this.accessToken;
        } catch (error) {
            throw new Error(`Failed to get access token: ${error.message}`);
        }
    }

    /**
     * Inspect a CRM module - get all fields and their properties
     */
    async inspectModule(moduleName) {
        const token = await this.getAccessToken();

        try {
            const response = await axios.get(
                `${this.apiDomain}/crm/v3/settings/fields`,
                {
                    headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
                    params: { module: moduleName }
                }
            );

            const fields = response.data.fields.map(field => ({
                api_name: field.api_name,
                display_label: field.display_label,
                data_type: field.data_type,
                required: field.required || false,
                read_only: field.read_only || false,
                lookup: field.lookup ? {
                    module: field.lookup.module,
                    display_label: field.lookup.display_label
                } : null
            }));

            return {
                module: moduleName,
                fields,
                fieldCount: fields.length
            };
        } catch (error) {
            throw new Error(`Failed to inspect module ${moduleName}: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get sample records from a module
     */
    async getSampleRecords(moduleName, limit = 5) {
        const token = await this.getAccessToken();

        try {
            const response = await axios.get(
                `${this.apiDomain}/crm/v3/${moduleName}`,
                {
                    headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
                    params: { per_page: limit }
                }
            );

            return response.data.data || [];
        } catch (error) {
            throw new Error(`Failed to get sample records: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Test a deployed function
     */
    async testFunction(functionName, params = {}) {
        const token = await this.getAccessToken();

        try {
            const response = await axios.post(
                `${this.apiDomain}/crm/v3/functions/${functionName}/actions/execute`,
                params,
                {
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                output: response.data.details?.output,
                executionTime: response.data.details?.execution_time
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Generate a comprehensive environment snapshot
     */
    async generateSnapshot(modules = ['Products']) {
        console.log('🔍 Inspecting Zoho CRM environment...\n');

        const snapshot = {
            timestamp: new Date().toISOString(),
            modules: {}
        };

        for (const moduleName of modules) {
            try {
                console.log(`📋 Inspecting module: ${moduleName}`);

                const moduleInfo = await this.inspectModule(moduleName);

                // Try to get sample records, but don't fail if it doesn't work
                let sampleRecords = [];
                try {
                    sampleRecords = await this.getSampleRecords(moduleName, 3);
                } catch (recordError) {
                    console.log(`  ⚠️  Could not fetch sample records: ${recordError.message}`);
                }

                snapshot.modules[moduleName] = {
                    fields: moduleInfo.fields,
                    fieldCount: moduleInfo.fieldCount,
                    sampleRecords: sampleRecords.map(record => {
                        // Only include field values, not metadata
                        const cleanRecord = {};
                        moduleInfo.fields.forEach(field => {
                            if (record[field.api_name] !== undefined) {
                                cleanRecord[field.api_name] = record[field.api_name];
                            }
                        });
                        return cleanRecord;
                    })
                };

                console.log(`  ✅ Found ${moduleInfo.fieldCount} fields`);
                console.log(`  ✅ Retrieved ${sampleRecords.length} sample records\n`);
            } catch (error) {
                console.error(`  ❌ Error inspecting ${moduleName}: ${error.message}\n`);
                snapshot.modules[moduleName] = {
                    error: error.message,
                    fields: [],
                    fieldCount: 0,
                    sampleRecords: []
                };
            }
        }

        // Save snapshot
        const snapshotPath = path.join(__dirname, 'zoho_snapshot.json');
        fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
        console.log(`💾 Snapshot saved to: ${snapshotPath}\n`);

        return snapshot;
    }

    /**
     * Generate human-readable report
     */
    generateReport(snapshot) {
        let report = `# Zoho CRM Environment Snapshot\n`;
        report += `Generated: ${snapshot.timestamp}\n\n`;

        for (const [moduleName, moduleData] of Object.entries(snapshot.modules)) {
            report += `## Module: ${moduleName}\n\n`;
            report += `**Total Fields:** ${moduleData.fieldCount}\n\n`;

            report += `### Fields\n\n`;
            report += `| Field Name | Display Label | Type | Required | Lookup |\n`;
            report += `|------------|---------------|------|----------|--------|\n`;

            moduleData.fields.forEach(field => {
                report += `| ${field.api_name} | ${field.display_label} | ${field.data_type} | ${field.required ? '✅' : '❌'} | ${field.lookup ? field.lookup.module : '-'} |\n`;
            });

            report += `\n### Sample Data\n\n`;
            if (moduleData.sampleRecords.length > 0) {
                report += `\`\`\`json\n${JSON.stringify(moduleData.sampleRecords, null, 2)}\n\`\`\`\n\n`;
            } else {
                report += `No sample records available.\n\n`;
            }

            report += `---\n\n`;
        }

        const reportPath = path.join(__dirname, 'zoho_environment_report.md');
        fs.writeFileSync(reportPath, report);
        console.log(`📄 Report saved to: ${reportPath}\n`);

        return reportPath;
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const inspector = new ZohoInspector();

    const command = args[0];
    const moduleName = args[1] || 'Products';

    (async () => {
        try {
            switch (command) {
                case 'inspect':
                    const moduleInfo = await inspector.inspectModule(moduleName);
                    console.log(JSON.stringify(moduleInfo, null, 2));
                    break;

                case 'snapshot':
                    const modules = args.slice(1);
                    const snapshot = await inspector.generateSnapshot(modules.length > 0 ? modules : ['Products']);
                    inspector.generateReport(snapshot);
                    break;

                case 'test':
                    const functionName = args[1];
                    const params = args[2] ? JSON.parse(args[2]) : {};
                    const result = await inspector.testFunction(functionName, params);
                    console.log(JSON.stringify(result, null, 2));
                    break;

                default:
                    console.log(`
Zoho Inspector - See your Zoho environment

Usage:
  node zoho-inspector.js <command> [options]

Commands:
  inspect <module>           Inspect a module's fields
  snapshot [modules...]      Generate full environment snapshot
  test <function> [params]   Test a deployed function

Examples:
  node zoho-inspector.js inspect Products
  node zoho-inspector.js snapshot Products Contacts
  node zoho-inspector.js test calculate_variance '{"record_id": 123}'
          `);
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    })();
}

export default ZohoInspector;
