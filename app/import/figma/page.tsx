import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImportFigmaPage() {
  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Import from Figma</CardTitle>
          <CardDescription>
            Use <code className="rounded bg-muted px-1.5 py-0.5 text-sm">figma-import-*.json</code> from{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">bun run figma:to-import</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Export a frame from Figma (API or plugin), then run the converter to get import JSON. Import the JSON via the API with your session cookie.
          </p>
          <pre className="rounded-md border bg-muted/50 p-4 text-xs overflow-x-auto">
{`# 1. Export raw frame (set FIGMA_FILE_KEY, FIGMA_NODE_ID)
bun scripts/export-figma-file.ts

# 2. Convert to import format
bun run figma:to-import

# 3. Import (while signed in at localhost:3000)
curl -X POST http://localhost:3000/api/import/figma \\
  -H "Content-Type: application/json" \\
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \\
  -d @examples/figma-import-*.json`}
          </pre>
          <p className="text-xs text-muted-foreground">
            <Link href="/" className="underline hover:no-underline">Back to home</Link>
            {" · "}
            <Link href="/admin" className="underline hover:no-underline">Admin</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
