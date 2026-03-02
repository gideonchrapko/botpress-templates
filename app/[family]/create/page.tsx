import { notFound } from "next/navigation";
import { getTemplateConfig } from "@/lib/template-registry";
import DynamicForm from "@/components/forms/DynamicForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function CreateTemplatePage({
  params,
}: {
  params: Promise<{ family: string }>;
}) {
  const { family } = await params;
  const config = await getTemplateConfig(family);

  if (!config) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: config.name },
        ]}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create {config.name}</h1>
        <p className="text-muted-foreground mt-2">
          Fill in the details to generate your poster
        </p>
      </div>
      <DynamicForm templateFamily={family} config={config} />
    </div>
  );
}
