import { auth } from "@/lib/auth";
import SignInButton from "@/components/SignInButton";
import DriveGallery from "@/components/DriveGallery";
import { DRIVE_FOLDER_IDS } from "@/lib/drive-config";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Link2 } from "lucide-react";
import { getAllTemplateConfigs } from "@/lib/template-registry";
import { HomeTabs } from "@/components/HomeTabs";
import { getMarketingTools } from "@/lib/marketing-tools";

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
    const [configs, marketingTools] = await Promise.all([
      getAllTemplateConfigs(),
      getMarketingTools(),
    ]);

    return (
      <div className="container mx-auto py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Botpress Design Tools</h1>
          <p className="mt-2 text-muted-foreground">
            Create templates and access design resources
          </p>
        </header>

        {error === "Forbidden" && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">You don’t have access to that page.</p>
          </div>
        )}

        <HomeTabs
          toolsTab={
            <section className="space-y-12">
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">Marketing Tools</h2>
                  <p className="text-muted-foreground mt-1">
                    Streamline marketing tasks and workflows
                  </p>
                </div>
                {marketingTools.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg">
                    <p className="text-muted-foreground">Add more</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {marketingTools.map((tool) => (
                      <Link key={tool.slug} href={`/tools/${tool.slug}`}>
                        <Card className="flex h-full min-h-[180px] flex-col cursor-pointer hover:shadow-lg transition-shadow">
                          <CardHeader className="p-4 pb-1">
                            <Link2 className="h-5 w-5 mb-1.5 text-muted-foreground" />
                            <CardTitle className="text-base">{tool.name}</CardTitle>
                            {tool.author && (
                              <p className="text-xs text-muted-foreground">by {tool.author}</p>
                            )}
                            <CardDescription className="line-clamp-2 text-xs">
                              {tool.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 pt-0 flex-1" />
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
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
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {configs.map((config) => {
                      const peopleField = config.fields.find((f) => f.type === "people");
                      const maxPeople = peopleField?.maxCount || 3;
                      const isBlogImageGenerator = config.id === "blog-image-generator";

                      return (
                        <Link key={config.id} href={`/${config.id}/create`}>
                          <Card className="flex h-full min-h-[180px] flex-col cursor-pointer hover:shadow-lg transition-shadow">
                            <CardHeader className="p-4 pb-1">
                              <FileText className="h-5 w-5 mb-1.5 text-muted-foreground" />
                              <CardTitle className="text-base">{config.name}</CardTitle>
                              <CardDescription className="line-clamp-2 text-xs">
                                {isBlogImageGenerator
                                  ? "Generate blog images automatically using word matching and your Figma components"
                                  : `Generate a poster for ${config.name} ${config.height}x${config.width}`}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-end">
                              <p className="text-xs text-muted-foreground line-clamp-2">
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
              </div>
            </section>
          }
          resourcesTab={
            <section className="space-y-12">
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">Branding Assets</h2>
                  <p className="text-muted-foreground mt-1">
                    Access Branding Assets from Google Drive
                  </p>
                </div>
                <DriveGallery folderId={DRIVE_FOLDER_IDS.branding} />
              </div>
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">Design Resources</h2>
                  <p className="text-muted-foreground mt-1">
                    Access design resources from Google Drive
                  </p>
                </div>
                <DriveGallery folderId={DRIVE_FOLDER_IDS.designResources} />
              </div>
            </section>
          }
        />
      </div>
    );
  }

  // Not authenticated - show sign in page (fills main, no scroll, content centered)
  return (
    <div className="flex h-full min-h-0 overflow-hidden items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8 text-center">
        <h1 className="text-3xl font-bold">Botpress Design Tools</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in with your Botpress Google account to get started
        </p>
        {error === "Configuration" && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-left">
            <p className="text-sm text-destructive">
              Authentication configuration error. Please check that all required environment variables are set in Vercel.
            </p>
          </div>
        )}
        {error === "Forbidden" && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">You don’t have access to that page.</p>
          </div>
        )}
        <div className="flex justify-center pt-2">
          <SignInButton />
        </div>
      </div>
    </div>
  );
}