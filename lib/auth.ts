import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

// Validate required environment variables
const requiredEnvVars = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || process.env.AUTH_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
};

// In dev, log the callback URL so you can confirm it matches Google Console
if (process.env.NODE_ENV === "development" && requiredEnvVars.NEXTAUTH_URL) {
  const callbackUrl = `${requiredEnvVars.NEXTAUTH_URL.replace(/\/$/, "")}/api/auth/callback/google`;
  console.log("[auth] Google callback URL in use:", callbackUrl);
}

// Check for missing variables (only in production to avoid breaking dev)
if (process.env.NODE_ENV === "production") {
  const missing = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
  
  if (missing.length > 0) {
    console.error("Missing required NextAuth environment variables:", missing);
  }
}

export const authOptions = {
  adapter: PrismaAdapter(prisma) as any,
  secret: requiredEnvVars.NEXTAUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
  providers: [
    GoogleProvider({
      clientId: requiredEnvVars.GOOGLE_CLIENT_ID || "",
      clientSecret: requiredEnvVars.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      // Only allow verified emails from @botpress.com
      if (
        user.email &&
        user.email.endsWith("@botpress.com") &&
        profile?.email_verified === true
      ) {
        return true;
      }
      return false;
    },
    async session({ session, user }: any) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async signIn() {
      // Ensure database connection is active before sign in
      try {
        // Test connection with a simple query
        await prisma.$queryRaw`SELECT 1`;
      } catch (error: any) {
        console.error("Database connection failed during sign in:", error.message);
        // Try to reconnect
        try {
          await prisma.$connect();
        } catch (reconnectError: any) {
          console.error("Failed to reconnect to database:", reconnectError.message);
        }
      }
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "database" as const,
  },
  // Remove custom cookie config - let NextAuth handle it with defaults
  // Custom cookie config was causing parsing errors in production
};

// Create and export the auth instance for use in middleware and server components
export const { handlers, auth } = NextAuth(authOptions);

