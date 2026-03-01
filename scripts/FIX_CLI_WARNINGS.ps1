Write-Host "🔄 Upgrading Catalyst CLI to fix deprecation warnings..."

# 1. Uninstall the legacy CLI
Write-Host "1. Removing old CLI..."
npm uninstall -g zoho-catalyst-cli

# 2. Install the modern CLI (Fixes node warnings)
Write-Host "2. Installing modern zcatalyst-cli..."
npm install -g zcatalyst-cli

# 3. Verify
Write-Host "3. Verifying installation..."
catalyst --version

Write-Host "✅ Done! You can now retry your commands."
