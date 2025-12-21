import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "database" as const,
  },
};

// Create and export the auth instance for use in middleware and server components
export const { handlers, auth } = NextAuth(authOptions);

