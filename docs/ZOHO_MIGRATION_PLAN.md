# Deployment Plan: Dimensions Audit Authenticator -> Zoho Catalyst ☁️

## Core Philosophy: "Do No Harm" 🛡️
As per your request, we will keep the current local development environment (using `mockData.js`) completely **untouched**.
The Zoho deployment will be a **separate build process** that creates a copy of the app configured for the live environment.

## Phase 1: Environment Separation (Frontend)
We will introduce a "Mode Switch" in the code.
*   **Development Mode (Default)**: Uses `mockData.js`. Run with `npm run dev`.
*   **Production Mode (Catalyst)**: Uses live API calls. Run with `npm run build:catalyst`.

### Action Items:
1.  Create `.env.development` (API_MODE=mock)
2.  Create `.env.production` (API_MODE=live)
3.  Update `DataContext.js` to choose the data source based on `import.meta.env.VITE_API_MODE`.

## Phase 2: Catalyst Backend Setup (The Bridge)
We need a secure way for the React app to talk to Zoho CRM.
*   We will create a new Catalyst Function: `audit_authenticator_api`.
*   This function will have endpoints:
    *   `GET /products`: Fetches live products from CRM.
    *   `POST /audit`: Saves audit data to CRM.
    *   `POST /bulk-update`: Handles the new bulk apply feature.

### Action Items:
1.  Initialize function in `ZohoIntegrationEngine/functions/audit_authenticator_api`.
2.  Write the Node.js logic to use `zcatalyst-sdk` and `zcql`.

## Phase 3: Deployment Pipeline
We will create a script to automate the "Copy & Deploy" process without touching your local files.

### The New `deploy-to-catalyst.bat` Script:
1.  Builds the React App in `production` mode (optimizing for speed).
2.  Copies the `dist` folder to `ZohoIntegrationEngine/client` (the hosting folder).
3.  Deploys using `catalyst deploy`.

## Summary
*   **Local**: You keep working on `localhost:5173` with instant feedback and mock data.
*   **Live**: The "Copy" lives on `https://audit-app.zohocatalyst.com` and talks to real data.
*   **Sync**: When you are happy with local changes, you run **one command** to update the live copy.

Shall I proceed with **Phase 1: Environment Separation**?
