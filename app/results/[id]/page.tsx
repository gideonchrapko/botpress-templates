import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Download } from "lucide-react";

export default async function ResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/");
  }

  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
  });

  if (!submission || submission.ownerEmail !== session.user.email) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p>Submission not found or access denied.</p>
            <Link href="/templates">
              <Button variant="outline" className="mt-4">
                Back to Templates
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isImage = submission.format !== "pdf";
  const previewUrl = submission.outputUrl
    ? `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${submission.outputUrl}`
    : null;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
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
          {submission.outputUrl ? (
            <div className="space-y-4">
              {isImage ? (
                <img
                  src={previewUrl!}
                  alt="Generated poster"
                  className="w-full border rounded-lg"
                />
              ) : (
                <div className="border rounded-lg p-8 text-center">
                  <p className="mb-4">PDF generated successfully</p>
                  <a href={previewUrl!} download>
                    <Button>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </a>
                </div>
              )}

              <div className="flex gap-4">
                <a href={previewUrl!} download>
                  <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Download {submission.format.toUpperCase()}
                  </Button>
                </a>
                <Link href="/templates">
                  <Button variant="outline">Back to Templates</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Your poster is being generated. Please refresh in a moment.
              </p>
              <Link href="/templates">
                <Button variant="outline">Back to Templates</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

