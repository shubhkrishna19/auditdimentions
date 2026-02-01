#!/usr/bin/env node

/**
 * Interactive CLI for Zoho AI Development
 * Provides connected ecosystem for iterative development
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ZohoCodeGenerator from './generator.js';
import ZohoInspector from './zoho-inspector.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ZohoDevCLI {
    constructor() {
        this.generator = new ZohoCodeGenerator();
        this.inspector = new ZohoInspector();
        this.snapshot = null;
    }

    async start() {
        console.log(chalk.cyan.bold('\n🤖 Zoho AI Development Assistant\n'));

        // Check if snapshot exists
        const snapshotPath = path.join(__dirname, 'zoho_snapshot.json');
        if (fs.existsSync(snapshotPath)) {
            this.snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
            console.log(chalk.green(`✅ Loaded environment snapshot from ${new Date(this.snapshot.timestamp).toLocaleString()}\n`));
        } else {
            console.log(chalk.yellow('⚠️  No environment snapshot found. Run "Inspect Zoho" first.\n'));
        }

        await this.mainMenu();
    }

    async mainMenu() {
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: '🔍 Inspect Zoho Environment (Connect & See Your Apps)', value: 'inspect' },
                    { name: '✨ Generate Code (Vibe Coding)', value: 'generate' },
                    { name: '🧪 Test Deployed Code', value: 'test' },
                    { name: '📊 View Environment Report', value: 'report' },
                    { name: '🚪 Exit', value: 'exit' }
                ]
            }
        ]);

        switch (action) {
            case 'inspect':
                await this.inspectEnvironment();
                break;
            case 'generate':
                await this.generateCode();
                break;
            case 'test':
                await this.testCode();
                break;
            case 'report':
                await this.viewReport();
                break;
            case 'exit':
                console.log(chalk.cyan('\n👋 Goodbye!\n'));
                process.exit(0);
        }

        await this.mainMenu();
    }

    async inspectEnvironment() {
        console.log(chalk.cyan('\n🔍 Inspecting Zoho Environment...\n'));

        const { modules } = await inquirer.prompt([
            {
                type: 'input',
                name: 'modules',
                message: 'Which modules to inspect? (comma-separated)',
                default: 'Products'
            }
        ]);

        const moduleList = modules.split(',').map(m => m.trim());

        try {
            this.snapshot = await this.inspector.generateSnapshot(moduleList);
            this.inspector.generateReport(this.snapshot);

            console.log(chalk.green('\n✅ Environment snapshot complete!\n'));
            console.log(chalk.gray('AI can now see your Zoho structure for better code generation.\n'));

            // Show summary
            for (const [moduleName, moduleData] of Object.entries(this.snapshot.modules)) {
                console.log(chalk.bold(`📋 ${moduleName}:`));
                console.log(`   Fields: ${moduleData.fieldCount}`);
                console.log(`   Sample Records: ${moduleData.sampleRecords.length}`);

                // Show key fields
                const keyFields = moduleData.fields
                    .filter(f => f.required || f.lookup)
                    .slice(0, 5);

                if (keyFields.length > 0) {
                    console.log(`   Key Fields: ${keyFields.map(f => f.api_name).join(', ')}`);
                }
                console.log('');
            }
        } catch (error) {
            console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
        }
    }

    async generateCode() {
        if (!this.snapshot) {
            console.log(chalk.yellow('\n⚠️  Please inspect your Zoho environment first!\n'));
            return;
        }

        const { codeType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'codeType',
                message: 'What type of code do you want to generate?',
                choices: [
                    { name: '🔗 Parent-Child Status Sync', value: 'parent-child' },
                    { name: '🧮 Field Calculation', value: 'calculation' },
                    { name: '✅ Custom Validation', value: 'validation' },
                    { name: '💬 Custom (Describe what you want)', value: 'custom' }
                ]
            }
        ]);

        if (codeType === 'parent-child') {
            await this.generateParentChildSync();
        } else if (codeType === 'calculation') {
            await this.generateCalculation();
        } else if (codeType === 'custom') {
            await this.generateCustomCode();
        }
    }

    async generateParentChildSync() {
        const modules = Object.keys(this.snapshot.modules);
        const firstModule = modules[0];
        const fields = this.snapshot.modules[firstModule].fields;

        const lookupFields = fields.filter(f => f.lookup);
        const statusFields = fields.filter(f =>
            f.data_type === 'picklist' ||
            f.data_type === 'boolean' ||
            f.api_name.toLowerCase().includes('status')
        );

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'module',
                message: 'Which module?',
                choices: modules
            },
            {
                type: 'list',
                name: 'parentField',
                message: 'Which field links to parent?',
                choices: lookupFields.map(f => ({ name: `${f.display_label} (${f.api_name})`, value: f.api_name }))
            },
            {
                type: 'list',
                name: 'statusField',
                message: 'Which field shows the status?',
                choices: statusFields.map(f => ({ name: `${f.display_label} (${f.api_name})`, value: f.api_name }))
            },
            {
                type: 'input',
                name: 'activeValue',
                message: 'Value when parent is active?',
                default: 'Y'
            },
            {
                type: 'input',
                name: 'inactiveValue',
                message: 'Value when parent is inactive?',
                default: 'NL'
            }
        ]);

        const parentField = lookupFields.find(f => f.api_name === answers.parentField);

        const result = this.generator.generateParentChildStatusScript({
            name: 'Live Status Sync',
            description: `Auto-update ${answers.statusField} based on parent ${answers.parentField}`,
            parentField: answers.parentField,
            statusField: answers.statusField,
            parentModule: parentField.lookup.module,
            parentStatusField: 'Product_Active', // TODO: Make this configurable
            activeValue: answers.activeValue,
            inactiveValue: answers.inactiveValue
        });

        console.log(chalk.green('\n✅ Code generated successfully!\n'));
        console.log(chalk.bold('📄 File:'), result.filename);
        console.log(chalk.bold('📁 Path:'), result.filepath);
        console.log(chalk.gray('\n' + result.deploymentInstructions));
    }

    async generateCalculation() {
        const modules = Object.keys(this.snapshot.modules);

        const { module } = await inquirer.prompt([
            {
                type: 'list',
                name: 'module',
                message: 'Which module?',
                choices: modules
            }
        ]);

        const fields = this.snapshot.modules[module].fields;
        const numberFields = fields.filter(f =>
            f.data_type === 'decimal' ||
            f.data_type === 'integer' ||
            f.data_type === 'currency'
        );

        const { description } = await inquirer.prompt([
            {
                type: 'input',
                name: 'description',
                message: 'Describe the calculation (e.g., "Calculate variance between billed and actual dimensions")'
            }
        ]);

        console.log(chalk.cyan('\n💡 AI Suggestion based on your description:\n'));
        console.log(chalk.gray('Analyzing available fields...\n'));

        // Show available numeric fields
        console.log(chalk.bold('Available numeric fields:'));
        numberFields.forEach(f => {
            console.log(`  - ${f.display_label} (${f.api_name})`);
        });

        const { inputFieldsStr, resultField, formula } = await inquirer.prompt([
            {
                type: 'input',
                name: 'inputFieldsStr',
                message: 'Input fields (comma-separated API names):',
                default: numberFields.slice(0, 3).map(f => f.api_name).join(', ')
            },
            {
                type: 'input',
                name: 'resultField',
                message: 'Result field API name:',
                default: 'Calculated_Result'
            },
            {
                type: 'input',
                name: 'formula',
                message: 'Formula (use field names as variables):',
                default: 'field1 + field2'
            }
        ]);

        const inputFields = inputFieldsStr.split(',').map(s => s.trim());

        const result = this.generator.generateFieldCalculationScript({
            name: 'Auto Calculator',
            description,
            inputFields,
            resultField,
            formula,
            decimals: 2
        });

        console.log(chalk.green('\n✅ Code generated successfully!\n'));
        console.log(chalk.bold('📄 File:'), result.filename);
        console.log(chalk.gray('\n' + result.deploymentInstructions));
    }

    async generateCustomCode() {
        const { description } = await inquirer.prompt([
            {
                type: 'input',
                name: 'description',
                message: 'Describe what you want to build:'
            }
        ]);

        console.log(chalk.cyan('\n🤖 AI is analyzing your request...\n'));
        console.log(chalk.yellow('⚠️  Custom code generation coming soon!'));
        console.log(chalk.gray('For now, use the predefined templates or contact support.\n'));
    }

    async testCode() {
        const { functionName, recordId } = await inquirer.prompt([
            {
                type: 'input',
                name: 'functionName',
                message: 'Function name to test:'
            },
            {
                type: 'input',
                name: 'recordId',
                message: 'Test record ID (optional):',
                default: ''
            }
        ]);

        console.log(chalk.cyan('\n🧪 Testing function...\n'));

        try {
            const params = recordId ? { record_id: recordId } : {};
            const result = await this.inspector.testFunction(functionName, params);

            if (result.success) {
                console.log(chalk.green('✅ Function executed successfully!\n'));
                console.log(chalk.bold('Output:'));
                console.log(result.output);
                console.log(chalk.gray(`\nExecution time: ${result.executionTime}ms`));
            } else {
                console.log(chalk.red('❌ Function failed!\n'));
                console.log(chalk.bold('Error:'));
                console.log(result.error);
            }
        } catch (error) {
            console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
        }
    }

    async viewReport() {
        const reportPath = path.join(__dirname, 'zoho_environment_report.md');

        if (fs.existsSync(reportPath)) {
            const report = fs.readFileSync(reportPath, 'utf8');
            console.log('\n' + report);
        } else {
            console.log(chalk.yellow('\n⚠️  No report found. Run "Inspect Zoho" first.\n'));
        }
    }
}

// Start CLI
const cli = new ZohoDevCLI();
cli.start().catch(error => {
    console.error(chalk.red('\n❌ Fatal error:', error.message));
    process.exit(1);
});
