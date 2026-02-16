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
        {tool.description && (
          <p className="text-muted-foreground mt-2">{tool.description}</p>
        )}
      </div>
      {tool.iframeUrl ? (
        <div className="rounded-lg border overflow-hidden bg-muted/30">
          <iframe
            src={tool.iframeUrl}
            title={tool.name}
            className="w-full min-h-[calc(100vh-12rem)] border-0"
            allow="clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>This tool is coming soon.</p>
        </div>
      )}
    </div>
  );
}
