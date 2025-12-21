# Production Deployment Guide

## 1. Google OAuth Setup (REQUIRED)

**Yes, you need to add your production URL to Google Cloud Console!**

### Important: You Need a "Web Application" Client Type

If you see "Desktop client" in your OAuth credentials, that won't work! You need a **"Web application"** type.

### Steps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. **If you have a "Desktop client" type:**
   - You need to create a NEW OAuth client
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**
   - Select **Web application** (NOT Desktop client!)
   - Give it a name like "Template Builder Web"
   - Under **Authorized JavaScript origins**, click **+ ADD URI** and add:
     ```
     http://localhost:3000
     ```
   - Click **+ ADD URI** again and add your production origin:
     ```
     https://template-builder-gilt.vercel.app
     ```
     (Note: No trailing slash, just the base URL)
   - Under **Authorized redirect URIs**, click **+ ADD URI** and add:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
   - Click **+ ADD URI** again and add your production callback URL:
     ```
     https://template-builder-gilt.vercel.app/api/auth/callback/google
     ```
   - Click **CREATE**
   - Copy the new **Client ID** and **Client Secret**

4. **If you already have a "Web application" type:**
   - Click on your OAuth 2.0 Client ID
   - Under **Authorized JavaScript origins**, add (if not already there):
     ```
     http://localhost:3000
     https://template-builder-gilt.vercel.app
     ```
   - Under **Authorized redirect URIs**, click **+ ADD URI**
   - Add your production callback URL:
     ```
     https://template-builder-gilt.vercel.app/api/auth/callback/google
     ```
   - Also add your custom domain if you have one
   - Click **SAVE**

### Corporate vs Personal Google Account

- **Corporate Google accounts work fine** - you just need the right OAuth client type
- If your corporate account has restrictions, you might need admin approval
- Personal Google accounts work the same way - the issue is the client type, not the account type

## 2. Set Up Production Database

Your local SQLite database won't work in production. You need a hosted database.

### Option A: Vercel Postgres (Recommended - Easiest)

1. Go to your Vercel project dashboard
2. Click **Storage** tab
3. Click **Create Database** > **Postgres**
4. Choose a name and region
5. Click **Create**
6. Vercel will automatically add `POSTGRES_URL` to your environment variables

### Option B: Supabase (Free tier available)

1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Go to **Settings** > **Database**
4. Copy the **Connection string** (URI format)
5. Use this as your `DATABASE_URL` in Vercel

### Update Prisma Schema for Postgres

If using Postgres instead of SQLite, update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then run:
```bash
bun run db:push
```

## 3. Set Environment Variables in Vercel

Go to your Vercel project > **Settings** > **Environment Variables** and add:

```
DATABASE_URL=your-production-database-url
NEXTAUTH_URL=https://template-builder-gilt.vercel.app
NEXTAUTH_SECRET=your-secret-from-openssl-rand-base64-32
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Important:**
- Use your actual Vercel production URL for `NEXTAUTH_URL`
- Generate a new `NEXTAUTH_SECRET` for production (don't use the local one)
- Make sure to set these for **Production** environment

## 4. Initialize Production Database

After setting up the database and environment variables:

1. Go to Vercel project > **Deployments**
2. Click on the latest deployment
3. Go to **Functions** tab
4. Or use Vercel CLI:
   ```bash
   vercel env pull .env.production
   bunx prisma db push
   ```

## 5. Common Issues

### Middleware Error (500)
- **Cause**: Database not connected or missing environment variables
- **Fix**: Ensure `DATABASE_URL` is set in Vercel and database is accessible

### OAuth Redirect Error
- **Cause**: Production callback URL not added to Google Cloud Console
- **Fix**: Add production callback URL (step 1 above)

### Database Connection Error
- **Cause**: Wrong database URL or database not initialized
- **Fix**: Verify `DATABASE_URL` format and run `prisma db push`

## 6. Verify Deployment

1. Check that all environment variables are set
2. Verify database is accessible
3. Test OAuth login flow
4. Check Vercel function logs for errors

