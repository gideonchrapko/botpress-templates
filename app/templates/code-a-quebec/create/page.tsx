import CodeAQuebecForm from "@/components/forms/CodeAQuebecForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function CreateCodeAQuebecPosterPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Templates", href: "/templates" },
          { label: "Code @ Québec Event Poster" },
        ]}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Code @ Québec Event Poster</h1>
        <p className="text-muted-foreground mt-2">
          Fill in the details to generate your poster
        </p>
      </div>
      <CodeAQuebecForm />
    </div>
  );
}
