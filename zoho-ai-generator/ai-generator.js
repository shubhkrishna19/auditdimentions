#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY not found in .env file');
    process.exit(1);
}

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

class AIZohoGenerator {
    constructor() {
        this.outputDir = path.join(__dirname, 'generated');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async generateCode(prompt, type = 'deluge') {
        console.log(`🤖 Asking Claude to generate ${type} code for: "${prompt}"...`);

        const systemPrompt = `You are an expert Zoho Developer specializing in Deluge, Client Scripts, and Creator specific code. 
        Your task is to generate clean, production-ready code based on the user's request.
        
        Rules:
        1. Return ONLY the code. Do not include markdown backticks or explanations unless requested relative to the code comments.
        2. If generating Deluge, ensure correct syntax for Zoho CRM/Creator.
        3. If generating Client Script (Javascript), use ZDK standard methods.
        `;

        try {
            const msg = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 4096,
                system: systemPrompt,
                messages: [
                    { role: "user", content: `Generate ${type} code for: ${prompt}` }
                ]
            });

            const code = msg.content[0].text;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const sanitizedPrompt = prompt.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const ext = type === 'deluge' ? 'dg' : 'js';
            const filename = `ai_gen_${sanitizedPrompt}_${timestamp}.${ext}`;
            const filepath = path.join(this.outputDir, filename);

            fs.writeFileSync(filepath, code);

            return {
                success: true,
                filename,
                filepath,
                code
            };

        } catch (error) {
            throw new Error(`AI Generation Failed: ${error.message}`);
        }
    }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);

    // Simple argument parsing
    const getArg = (flag) => {
        const index = args.indexOf(flag);
        return index !== -1 ? args[index + 1] : null;
    };

    const prompt = getArg('--prompt');
    const type = getArg('--type') || 'deluge'; // Default to deluge

    if (!prompt) {
        console.log(`
Zoho AI Code Generator (Powered by Claude)

Usage:
  node ai-generator.js --prompt "Your request here" [--type <deluge|client-script>]

Examples:
  node ai-generator.js --prompt "Calculate commission based on deal value"
  node ai-generator.js --type client-script --prompt "Validate phone number format"
        `);
        process.exit(0);
    }

    const generator = new AIZohoGenerator();
    generator.generateCode(prompt, type)
        .then(result => {
            console.log('✅ Code Generated Successfully!');
            console.log(`📁 File: ${result.filename}`);
            console.log(`📄 Path: ${result.filepath}`);
            console.log('\n--- Review Code Below ---\n');
            console.log(result.code);
        })
        .catch(err => {
            console.error('❌ Error:', err.message);
            process.exit(1);
        });
}

export default AIZohoGenerator;
