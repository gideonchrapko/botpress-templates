/**
 * Test script for Figma import
 * Usage: bun run scripts/test-figma-import.ts
 */

import { readFile } from "fs/promises";
import { join } from "path";

async function testImport() {
  console.log("🧪 Testing Figma Import...\n");

  // Read example export
  const exportPath = join(process.cwd(), "examples", "figma-export-example.json");
  const exportData = JSON.parse(await readFile(exportPath, "utf-8"));

  console.log("📦 Export Data:");
  console.log(`   Name: ${exportData.name}`);
  console.log(`   Dimensions: ${exportData.width} × ${exportData.height}`);
  console.log(`   Nodes: ${exportData.nodes.length}\n`);

  // Check for required bindings
  const nodeNames = extractNodeNames(exportData.nodes);
  const bindings = nodeNames.filter(name => name.includes("{{") && name.includes("}}"));
  
  console.log("🔗 Detected Bindings:");
  bindings.forEach(binding => {
    console.log(`   - ${binding}`);
  });

  if (bindings.length === 0) {
    console.warn("⚠️  No bindings detected! Make sure layer names use {{bindingName}} format.\n");
  }

  // Check for required fields
  const requiredBindings = ["eventTitle", "eventDate", "logo"];
  const missing = requiredBindings.filter(req => 
    !bindings.some(b => b.includes(req))
  );

  if (missing.length > 0) {
    console.warn("⚠️  Missing recommended bindings:");
    missing.forEach(b => console.warn(`   - {{${b}}}`));
    console.log("");
  }

  // Validate structure
  console.log("✅ Validation:");
  const hasName = !!exportData.name;
  const hasDimensions = !!(exportData.width && exportData.height);
  const hasNodes = Array.isArray(exportData.nodes) && exportData.nodes.length > 0;

  console.log(`   Name: ${hasName ? "✅" : "❌"}`);
  console.log(`   Dimensions: ${hasDimensions ? "✅" : "❌"}`);
  console.log(`   Nodes: ${hasNodes ? "✅" : "❌"}\n`);

  if (hasName && hasDimensions && hasNodes) {
    console.log("✅ Export structure is valid!\n");
    console.log("📝 Next steps:");
    console.log("   1. Make sure dev server is running: bun run dev");
    console.log("   2. Sign in to the app");
    console.log("   3. Import via API:");
    console.log(`      curl -X POST http://localhost:3000/api/import/figma \\`);
    console.log(`        -H "Content-Type: application/json" \\`);
    console.log(`        -H "Cookie: next-auth.session-token=YOUR_TOKEN" \\`);
    console.log(`        -d @${exportPath}\n`);
    console.log("   4. Check templates: http://localhost:3000/");
    console.log("   5. Test template: http://localhost:3000/templates/{template-id}/create\n");
  } else {
    console.error("❌ Export structure is invalid. Please fix the issues above.\n");
    process.exit(1);
  }
}

function extractNodeNames(nodes: any[]): string[] {
  const names: string[] = [];
  
  function traverse(node: any) {
    if (node.name) {
      names.push(node.name);
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  nodes.forEach(traverse);
  return names;
}

testImport().catch(console.error);
