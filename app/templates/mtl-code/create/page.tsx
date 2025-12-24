import MTLCodeForm from "@/components/forms/MtlCodeForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function CreateMtlCodePosterPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Templates", href: "/templates" },
          { label: "MTL Code Event Poster" },
        ]}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create MTL Code Event Poster</h1>
        <p className="text-muted-foreground mt-2">
          Fill in the details to generate your poster
        </p>
      </div>
      <MTLCodeForm />
    </div>
  );
}

