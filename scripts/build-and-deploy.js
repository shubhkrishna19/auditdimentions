#!/usr/bin/env node

/**
 * Build and Deploy Script
 * Builds the app and syncs to both Vercel (dist) and Zoho Catalyst (ZohoIntegrationEngine/client)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting build process...\n');

// Step 1: Build the app
console.log('📦 Building application...');
try {
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Build complete!\n');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

// Step 2: Sync to Zoho Catalyst client folder
console.log('🔄 Syncing to Zoho Catalyst client folder...');
const distDir = path.join(rootDir, 'dist');
const zohoClientDir = path.join(rootDir, 'ZohoIntegrationEngine', 'client');

try {
    // Remove old files (except .catalyst folder)
    const files = fs.readdirSync(zohoClientDir);
    for (const file of files) {
        if (file !== '.catalyst') {
            const filePath = path.join(zohoClientDir, file);
            fs.rmSync(filePath, { recursive: true, force: true });
        }
    }

    // Copy new build files
    const distFiles = fs.readdirSync(distDir);
    for (const file of distFiles) {
        const srcPath = path.join(distDir, file);
        const destPath = path.join(zohoClientDir, file);

        if (fs.statSync(srcPath).isDirectory()) {
            fs.cpSync(srcPath, destPath, { recursive: true });
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }

    console.log('✅ Synced to Zoho Catalyst!\n');
} catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ BUILD & DEPLOY COMPLETE!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📂 Vercel build: dist/');
console.log('📂 Zoho Catalyst build: ZohoIntegrationEngine/client/');
console.log('\n💡 Next steps:');
console.log('   1. Commit and push to GitHub');
console.log('   2. Vercel will auto-deploy from dist/');
console.log('   3. Zoho Catalyst will auto-deploy from ZohoIntegrationEngine/client/');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
