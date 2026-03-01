# Vercel Deployment Guide 🚀

To deploy your **Dimensions Audit Authenticator** to Vercel and connect it to your private repository `shubhkrishna19/auditdimentions`, follow these steps:

## 1. Prepare for Vercel
I have already added a `vercel.json` and fixed the layout issues that were preventing the app from rendering correctly.

## 2. GitHub Push
Ensure all current changes are pushed to your new repository:
```bash
git remote add origin https://github.com/shubhkrishna19/auditdimentions.git
git branch -M main
git add .
git commit -m "Configure Vercel deployment and fix rendering issues"
git push -u origin main
```

## 3. Vercel Configuration
1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** > **Project**.
3. Import your `auditdimentions` repository.
4. **Framework Preset:** Select **Vite** (Vercel should detect this automatically).
5. **Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
6. Click **Deploy**.

## 4. Zoho CRM Update
Once Vercel gives you a URL (e.g., `https://auditdimentions.vercel.app`), you **MUST** update the Widget URL in Zoho:
1. Go to Zoho CRM > Setup > Developer Space > Widgets.
2. Edit the **Dimensions Audit** widget.
3. Update the **Hosting** URL to your new Vercel URL.
4. Update the `widget-manifest.json` in your code as well (I have updated the local version for you).

## 🛠️ Performance & Rendering Fixes Included:
- ✅ **Standard Layout:** Wrapped the app in `app-layout` and `main-content` to match Zoho's design system.
- ✅ **Sidebar Restored:** Re-integrated the Sidebar for filtering and navigation.
- ✅ **Express.js Option:** If you truly need an Express backend, I can add a `server/` directory, but for a Zoho Widget, a static Vite build is faster and more reliable on Vercel.

> [!IMPORTANT]
> If you still see a blank page, check the Browser Console (F12). If there are errors about "ZOHO is not defined", remember that the widget only fully works when opened **inside** Zoho CRM.
