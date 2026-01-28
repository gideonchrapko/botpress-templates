import { auth } from "@/lib/auth";
import SignInButton from "@/components/SignInButton";
import DriveGallery from "@/components/DriveGallery";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { getAllTemplateConfigs } from "@/lib/template-registry";

// Force dynamic rendering to avoid database queries during build
export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const error = params?.error;

  // If authenticated, show the full page with templates and drive resources
  if (session) {
    const configs = await getAllTemplateConfigs();

    return (
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Botpress Design Tools</h1>
          <p className="mt-2 text-muted-foreground">
            Create templates and access design resources
          </p>
        </div>

        {/* Templates Section */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Templates</h2>
            <p className="text-muted-foreground mt-1">
              Generate posters and graphics from templates
            </p>
          </div>
          
          {configs.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">No templates available</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {configs.map((config) => {
                const peopleField = config.fields.find((f) => f.type === "people");
                const maxPeople = peopleField?.maxCount || 3;
                const isBlogImageGenerator = config.id === "blog-image-generator";
                
                return (
                  <Link key={config.id} href={`/${config.id}/create`}>
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <FileText className="h-8 w-8 mb-2" />
                        <CardTitle>{config.name}</CardTitle>
                        <CardDescription>
                          {isBlogImageGenerator 
                            ? "Generate blog images automatically using word matching and your Figma components"
                            : `Generate a poster for ${config.name} ${config.height}x${config.width}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {isBlogImageGenerator
                            ? "Enter your blog title and let word matching select the perfect components"
                            : `Supports 1-${maxPeople} speakers with customizable colors and formats`}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Google Drive Resources Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Design Resources</h2>
            <p className="text-muted-foreground mt-1">
              Access folders from Google Drive
            </p>
          </div>
          <DriveGallery />
        </section>
      </div>
    );
  }

  // Not authenticated - show sign in page
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

