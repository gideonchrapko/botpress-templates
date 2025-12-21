# Required Vercel Environment Variables

Make sure ALL of these are set in Vercel (Settings > Environment Variables):

## Required Variables:

1. **DATABASE_URL** ✅ (You have this)
   ```
   postgres://4729413687803933a5468c3b8354b761a8ea6541e52749b0f5c33223a58cc188:sk_QzpN3HYG5LugEmS8lqpE1@db.prisma.io:5432/postgres?sslmode=require
   ```

2. **NEXTAUTH_URL** ⚠️ (Check this!)
   ```
   https://template-builder-gilt.vercel.app
   ```

3. **NEXTAUTH_SECRET** ⚠️ (Check this!)
   ```
   Generate with: openssl rand -base64 32
   ```

4. **GOOGLE_CLIENT_ID** ⚠️ (Check this!)
   ```
   Your Google OAuth Client ID
   ```

5. **GOOGLE_CLIENT_SECRET** ⚠️ (Check this!)
   ```
   Your Google OAuth Client Secret
   ```

## Important:
- Make sure they're set for **Production** environment (not just Preview/Development)
- After adding/updating variables, **redeploy** your app
- Check Vercel deployment logs for specific error messages

