@echo off
echo ==========================================
echo 🚀 Dimensions Audit Authenticator -> Zoho Catalyst
echo ==========================================
echo.
echo [1/3] Building React App for Production...
call npm run build:catalyst
if %errorlevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b %errorlevel%
)
echo [SUCCESS] Build completed.

echo.
echo [2/3] Preparing Deployment Folder...
if not exist "ZohoIntegrationEngine\client" mkdir "ZohoIntegrationEngine\client"

echo Copying build artifacts to ZohoIntegrationEngine/client...
xcopy /E /I /Y "dist\*" "ZohoIntegrationEngine\client\"
if %errorlevel% neq 0 (
    echo [ERROR] File copy failed!
    pause
    exit /b %errorlevel%
)
echo [SUCCESS] Files ready for deployment.

echo.
echo [3/3] Deployment Instructions
echo ------------------------------------------
echo Your app is now ready to be deployed to Zoho Catalyst.
echo To deploy, run the following command in your terminal:
echo.
echo     cd ZohoIntegrationEngine
echo     catalyst deploy
echo.
echo ==========================================
echo DONE.
pause
