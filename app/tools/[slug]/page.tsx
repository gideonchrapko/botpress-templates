import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getMarketingToolBySlug } from "@/lib/marketing-tools";

export default async function MarketingToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getMarketingToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Marketing Tools", href: "/" },
          { label: tool.name },
        ]}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{tool.name}</h1>
        <p className="text-muted-foreground mt-2">{tool.description}</p>
      </div>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p>This tool is coming soon.</p>
      </div>
    </div>
  );
}
