import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function TemplatesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Choose a Template</h1>
        <p className="text-muted-foreground mt-2">
          Select a template to start creating your poster
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/templates/mtl-code/create">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <FileText className="h-8 w-8 mb-2" />
              <CardTitle>MTL Code Event Poster</CardTitle>
              <CardDescription>
                Generate a linkedin/instagram poster for MTL Code 1350x1080
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Supports 1-3 speakers with customizable colors and formats
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

