/**
 * Quick test script for node-to-HTML compiler
 * Run: bunx tsx test-compiler.ts
 */

import { compileNodeGraphToHTML } from "./lib/node-to-html-compiler";
import { TemplateSchema } from "./lib/node-types";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

async function testCompiler() {
  console.log("🧪 Testing Node-to-HTML Compiler...\n");

  try {
    // Load test schema
    const schemaPath = join(process.cwd(), "templates", "test-template", "schema.json");
    const schemaContent = await readFile(schemaPath, "utf-8");
    const schema: TemplateSchema = JSON.parse(schemaContent);

    console.log("✅ Schema loaded:", schema.name);

    // Test data
    const testData = {
      eventTitle: "My Test Event",
    };

    // Test tokens
    const testTokens = {
      primary: "#FF5733", // Orange
    };

    // Compile
    console.log("📝 Compiling node graph to HTML...");
    const html = compileNodeGraphToHTML(schema, {
      data: testData,
      tokens: testTokens,
    });

    // Save output
    const outputPath = join(process.cwd(), "test-output.html");
    await writeFile(outputPath, html);

    console.log("✅ HTML generated successfully!");
    console.log(`📄 Output saved to: ${outputPath}`);
    console.log(`📏 HTML size: ${html.length} bytes`);
    console.log("\n💡 Open test-output.html in your browser to see the result");

    // Verify HTML contains expected content
    if (!html.includes("My Test Event")) {
      throw new Error("❌ HTML should contain bound data 'My Test Event'");
    }

    if (!html.includes("#FF5733")) {
      throw new Error("❌ HTML should contain resolved token color '#FF5733'");
    }

    if (!html.includes("1080px")) {
      throw new Error("❌ HTML should contain dimensions '1080px'");
    }

    console.log("\n✅ All checks passed!");

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testCompiler();

