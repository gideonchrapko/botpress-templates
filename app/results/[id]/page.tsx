import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Download } from "lucide-react";
import { RetryRenderButton } from "@/components/RetryRenderButton";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getTemplateConfig } from "@/lib/template-registry";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/");
  }

  const submission = await prisma.submission.findUnique({
    where: { id },
  });

  if (!submission || submission.ownerEmail !== session.user.email) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p>Submission not found or access denied.</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Parse outputs from JSON (safely)
  let outputs: Array<{ url: string; format: string; mimeType: string }> | null = null;
  try {
    if (submission.outputs && typeof submission.outputs === "string" && submission.outputs.trim() !== "") {
      outputs = JSON.parse(submission.outputs) as Array<{ url: string; format: string; mimeType: string }>;
      if (!Array.isArray(outputs)) {
        outputs = null;
      }
    }
  } catch (error) {
    console.error("Error parsing outputs JSON:", error);
    outputs = null;
  }
  
  // Get first image output for preview (prefer PNG, then JPG, then WebP)
  const previewOutput = outputs?.find((o) => o.format !== "pdf") || outputs?.[0];
  const previewUrl = previewOutput ? previewOutput.url : null;
  const isPreviewImage = previewOutput?.format !== "pdf";

  // Load template config to get name (safely)
  let templateName = "Template";
  let templateHref = "/";
  try {
    const templateConfig = await getTemplateConfig(submission.templateFamily);
    templateName = templateConfig?.name || "Template";
    templateHref = `/${submission.templateFamily}/create`;
  } catch (error) {
    console.error("Error loading template config:", error);
    // Use defaults already set above
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <AutoRefresh hasOutputs={!!outputs && outputs.length > 0} submissionId={id} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: templateName, href: templateHref },
          { label: "Results" },
        ]}
      />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Poster Generated</h1>
        <p className="text-muted-foreground mt-2">
          Your poster has been generated successfully
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {outputs && outputs.length > 0 ? (
            <div className="space-y-4">
              {isPreviewImage && previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Generated poster"
                  className="w-full border rounded-lg"
                />
              ) : previewOutput ? (
                <div className="border rounded-lg p-8 text-center">
                  <p className="mb-4">PDF generated successfully</p>
                  <a href={previewOutput.url} download>
                    <Button>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </a>
                </div>
              ) : null}

              <div className="space-y-2">
                <h3 className="font-semibold">Download Formats</h3>
                <p className="text-sm text-muted-foreground">
                  {outputs.length} format{outputs.length !== 1 ? "s" : ""} available
                </p>
                <div className="flex flex-wrap gap-2">
                  {outputs.map((output) => (
                    <a
                      key={output.format}
                      href={output.url}
                      download={`poster.${output.format === "jpg" ? "jpeg" : output.format}`}
                    >
                      <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Download {output.format.toUpperCase()}
                      </Button>
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Link href="/">
                  <Button variant="outline">Back to Home</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Your poster is being generated. This may take a few moments.
              </p>
              <div className="flex gap-4 justify-center">
                <RetryRenderButton submissionId={id} />
                <Link href="/">
                  <Button variant="outline">Back to Home</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

