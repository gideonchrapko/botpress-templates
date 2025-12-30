# Staging Environment Setup Guide

This guide will help you set up a staging branch with a separate Vercel deployment for testing.

## Step 1: Push Staging Branch to GitHub

```bash
git push -u origin staging
```

## Step 2: Set Up Separate Database for Staging

You'll need a separate PostgreSQL database for staging. Options:

### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **Create Database** → **Postgres**
3. Create a new database named `template-builder-staging`
4. Copy the connection string

### Option B: External Database (Supabase, Neon, etc.)
1. Create a new database instance
2. Copy the connection string (format: `postgresql://user:password@host:port/database`)

## Step 3: Configure Vercel Project Settings

### 3.1 Add Staging Branch to Vercel

1. Go to your Vercel project: **Settings** → **Git**
2. Under **Production Branch**, keep `main`
3. Under **Preview Branches**, ensure `staging` is included (or add it)

### 3.2 Create Staging Environment Variables

1. Go to **Settings** → **Environment Variables**
2. For each variable, add a **Staging** environment version:

**Required Variables for Staging:**

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/staging_db
DATABASE_PROVIDER=postgresql

# NextAuth
# Use your Vercel preview domain (e.g., https://your-project-staging.vercel.app)
# You'll get this URL after first deployment - check Deployments tab
NEXTAUTH_URL=https://your-project-staging.vercel.app
NEXTAUTH_SECRET=<generate-new-secret-for-staging>
AUTH_SECRET=<same-as-NEXTAUTH_SECRET>

# Google OAuth (you can use the same credentials or create separate ones)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Vercel (auto-set, but verify)
VERCEL=1
```

**Note:** For `NEXTAUTH_URL`, you can:
1. Deploy first, then copy the preview URL from Vercel dashboard
2. Or use a placeholder and update after first deployment

**To generate a new NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3.3 Set Up Google OAuth for Staging

**Option A: Use Same OAuth Credentials (Easiest)**
- You can use the same Google OAuth credentials for both production and staging
- Just add the staging preview URL as an additional authorized redirect URI

**Option B: Create Separate OAuth Credentials (More Secure)**
- Create separate OAuth credentials specifically for staging

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your OAuth 2.0 Client ID settings
3. Add authorized redirect URI:
   - `https://your-project-staging.vercel.app/api/auth/callback/google`
   - (You'll get the exact URL after first deployment - check Vercel Deployments tab)
4. If using separate credentials, copy the Client ID and Secret to Vercel environment variables

## Step 4: Deploy Staging Branch

### 4.1 Automatic Deployment (Recommended)

Vercel will automatically deploy the `staging` branch when you push to it. To trigger:

```bash
git push origin staging
```

### 4.2 Manual Deployment

1. Go to Vercel dashboard → **Deployments**
2. Click **Create Deployment**
3. Select `staging` branch
4. Deploy

## Step 5: Set Up Domain for Staging

### Option A: Use Vercel's Default Preview Domain (Easiest - No Custom Domain Needed!)

**Vercel automatically provides a preview domain for your staging branch:**
- Format: `your-project-name-staging.vercel.app` or `your-project-name-git-staging-yourteam.vercel.app`
- This is **free** and requires **no setup** - it's automatically created!

**Steps:**
1. After deploying the staging branch, go to **Deployments** in Vercel
2. Click on your staging deployment
3. Copy the deployment URL (e.g., `https://template-builder-staging.vercel.app`)
4. Set `NEXTAUTH_URL` in Vercel environment variables to this URL
5. In Google OAuth, add this URL as an authorized redirect URI:
   - `https://your-project-staging.vercel.app/api/auth/callback/google`

**That's it!** No custom domain purchase needed.

### Option B: Custom Domain (Optional - Only if you want a branded URL)

If you want a custom domain like `staging.yourdomain.com`:

1. In Vercel: **Settings** → **Domains**
2. Add domain: `staging.yourdomain.com`
3. Configure DNS:
   - Add a CNAME record: `staging` → `cname.vercel-dns.com`
   - Or A record as instructed by Vercel
4. Wait for DNS propagation (5-60 minutes)
5. Update `NEXTAUTH_URL` in Vercel to match: `https://staging.yourdomain.com`

## Step 6: Initialize Staging Database

After the first deployment, run migrations:

### Option A: Via Vercel CLI

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Link to your project
vercel link

# Run migrations
vercel env pull .env.staging.local
DATABASE_URL=$(grep DATABASE_URL .env.staging.local | cut -d '=' -f2)
bunx prisma migrate deploy
```

### Option B: Via Vercel Dashboard

1. Go to **Deployments** → Select staging deployment
2. Open **Functions** tab
3. Create a temporary API route to run migrations (one-time)

### Option C: Direct Database Access

If you have direct database access:
```bash
# Set DATABASE_URL to staging database
export DATABASE_URL="postgresql://..."
bunx prisma migrate deploy
```

## Step 7: Verify Staging Environment

1. Visit your staging URL
2. Test authentication (Google OAuth)
3. Test form submission
4. Verify database operations
5. Check that files are being stored correctly

## Step 8: Keep Environments Separate

### Environment-Specific Code (if needed)

You can add environment detection in your code:

```typescript
// lib/config.ts
export const isStaging = process.env.VERCEL_ENV === 'preview' || 
                         process.env.NEXT_PUBLIC_ENV === 'staging';

// Usage
if (isStaging) {
  // Staging-specific behavior
}
```

### Database Connection

Your `prisma.ts` already handles this via `DATABASE_URL` environment variable, so staging will automatically use the staging database.

## Troubleshooting

### Issue: Authentication not working
- Verify `NEXTAUTH_URL` matches your staging domain exactly
- Check Google OAuth redirect URI matches
- Ensure `NEXTAUTH_SECRET` is set

### Issue: Database connection errors
- Verify `DATABASE_URL` is set for staging environment
- Check `DATABASE_PROVIDER=postgresql` is set
- Ensure database is accessible from Vercel

### Issue: Build fails
- Check all environment variables are set for staging
- Verify Prisma migrations are compatible
- Check build logs in Vercel dashboard

## Quick Reference

**Production (main branch):**
- Domain: `yourdomain.com` (or `your-project.vercel.app` if no custom domain)
- Database: Production PostgreSQL
- OAuth: Production credentials

**Staging (staging branch):**
- Domain: `your-project-staging.vercel.app` (free, auto-generated by Vercel)
- Database: Staging PostgreSQL
- OAuth: Same or separate credentials (just add staging URL to redirect URIs)

## Next Steps

1. Push staging branch: `git push origin staging`
2. Set up Vercel environment variables
3. Create staging database
4. Configure Google OAuth for staging domain
5. Deploy and test!

