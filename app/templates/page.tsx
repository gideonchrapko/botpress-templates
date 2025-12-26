import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { getAllTemplateConfigs } from "@/lib/template-registry";

export default async function TemplatesPage() {
  const configs = await getAllTemplateConfigs();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Choose a Template</h1>
        <p className="text-muted-foreground mt-2">
          Find the template you need to generate your graphics
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {configs.map((config) => {
          const peopleField = config.fields.find((f) => f.type === "people");
          const maxPeople = peopleField?.maxCount || 3;
          
          return (
            <Link key={config.id} href={`/templates/${config.id}/create`}>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <FileText className="h-8 w-8 mb-2" />
                  <CardTitle>{config.name}</CardTitle>
                  <CardDescription>
                    Generate a poster for {config.name} {config.height}x{config.width}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Supports 1-{maxPeople} speakers with customizable colors and formats
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

