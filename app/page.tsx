import { auth } from "@/lib/auth";
import SignInButton from "@/components/SignInButton";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

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
          <h1 className="text-3xl font-bold">Botpress Poster Generator</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in with your Botpress Google account to get started
          </p>
        </div>
        <SignInButton />
      </div>
    </div>
  );
}

