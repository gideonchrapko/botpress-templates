import { auth } from "@/lib/auth";
import SignInButton from "@/components/SignInButton";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const error = params?.error;

  // Only redirect if we have a session and we're not in the middle of an OAuth callback
  // This prevents redirect loops during the OAuth flow
  if (session) {
    // Use a small delay to ensure the session is fully established
    redirect("/templates");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Botpress Design Tools</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in with your Botpress Google account to get started
          </p>
          {error === "Configuration" && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                Authentication configuration error. Please check that all required environment variables are set in Vercel.
              </p>
            </div>
          )}
        </div>
        <SignInButton />
      </div>
    </div>
  );
}

