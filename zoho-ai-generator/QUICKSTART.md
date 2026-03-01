# Quick Reference: Zoho AI Generator Commands

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start interactive CLI
npm start
# or
node cli.js
```

## 📋 Common Commands

### Inspect Zoho Environment
```bash
# Interactive mode
node cli.js
# Select: "🔍 Inspect Zoho Environment"

# Command line
node zoho-inspector.js snapshot Products Contacts Leads
```

### Generate Code

#### Parent-Child Status Sync
```bash
node generator.js --type parent-child-status
```

#### Field Calculation
```bash
node generator.js --type field-calculation
```

### Test Deployed Code
```bash
node zoho-inspector.js test calculate_variance '{"record_id": 123456}'
```

## 📁 File Structure

```
zoho-ai-generator/
├── cli.js                    # Interactive CLI (START HERE)
├── generator.js              # Code generator
├── zoho-inspector.js         # Zoho API connector
├── deploy-client-script.js   # Deployment tool (coming soon)
├── package.json
├── .env                      # Your credentials (create from .env.example)
├── .env.example              # Template
├── generated/                # Generated code output
├── zoho_snapshot.json        # Environment cache
└── zoho_environment_report.md # Human-readable report
```

## 🔑 Environment Variables

```env
ZOHO_CLIENT_ID=1000.XXXXX
ZOHO_CLIENT_SECRET=YYYYY
ZOHO_REFRESH_TOKEN=1000.ZZZZZ
ZOHO_ORG_ID=your_org_id
```

## 🎯 Workflow

1. **Inspect** → See your Zoho structure
2. **Generate** → AI creates code based on actual fields
3. **Deploy** → Copy-paste or auto-deploy
4. **Test** → Verify it works
5. **Iterate** → Fix and repeat if needed

## 💡 Tips

- Run `Inspect` first to let AI see your Zoho environment
- Use interactive CLI for guided experience
- Check `generated/` folder for output files
- Read deployment instructions in generated files
