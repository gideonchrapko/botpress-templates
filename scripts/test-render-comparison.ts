#!/usr/bin/env bun
/**
 * Test Render Comparison
 * Compares legacy HTML template rendering vs node-based rendering
 * Usage: bun scripts/test-render-comparison.ts <template-family> <variant>
 */

import { renderTemplateWithConfig } from "../lib/template-engine";
import { getNodeTemplateSchema } from "../lib/node-registry";
import { compileNodeGraphToHTML } from "../lib/node-to-html-compiler";
import { getTemplateConfig } from "../lib/template-registry";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { writeFile } from "fs/promises";
import { join } from "path";

// Mock submission data
const mockSubmission = {
  id: "test",
  templateFamily: "mtl-code",
  templateVariant: "mtl-code-1",
  eventTitle: "Test Event Title",
  eventDate: new Date("2024-11-20"),
  doorTime: "18:00",
  venueName: "Test Venue",
  addressLine: "400 Blvd. De Maisonneuve Ouest",
  cityLine: "Montreal, QC  H3A 1L4",
  primaryColor: "#3D9DFF",
  secondaryColor: "#B5DAFF",
  people: JSON.stringify([
    {
      name: "Michael Masson",
      role: "CTO @ Botpress",
      talkTitle: "Kubernetes the right way: A platform engineering approach to K8s",
      headshot: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    },
  ]),
  uploadUrls: JSON.stringify({}), // Empty upload URLs for test
  formats: ["png"],
  scale: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: "test",
} as any;

async function main() {
  const args = process.argv.slice(2);
  const templateFamily = args[0] || "mtl-code";
  const variant = args[1] || "1";

  console.log(`🧪 Testing render comparison for ${templateFamily} variant ${variant}...\n`);

  // Load config
  const config = await getTemplateConfig(templateFamily);
  if (!config) {
    console.error(`❌ Config not found for ${templateFamily}`);
    process.exit(1);
  }

  // Test 1: Legacy HTML rendering
  console.log("1️⃣ Rendering with legacy HTML template...");
  let legacyHTML: string;
  try {
    legacyHTML = await renderTemplateWithConfig(mockSubmission);
    await writeFile(join(process.cwd(), "test-output-legacy.html"), legacyHTML);
    console.log("   ✅ Legacy HTML rendered");
  } catch (error) {
    console.error("   ❌ Legacy HTML render failed:", error);
    process.exit(1);
  }

  // Format date and time (used by both renders)
  const dateField = config.fields.find(f => f.name === "eventDate");
  const timeField = config.fields.find(f => f.name === "doorTime");

  let formattedDate = mockSubmission.eventDate.toString();
  let formattedTime = mockSubmission.doorTime;

  if (dateField && dateField.format) {
    const locale = dateField.locale === "fr" ? fr : undefined;
    formattedDate = format(mockSubmission.eventDate, dateField.format, locale ? { locale } : undefined);
  }

  if (timeField) {
    const prefix = timeField.prefix || "";
    if (timeField.format === "12h") {
      const [hours, minutes] = mockSubmission.doorTime.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      formattedTime = `${prefix}${hour12}:${minutes}${ampm}`;
    } else {
      formattedTime = `${prefix}${mockSubmission.doorTime}`;
    }
  }

  // Test 2: Node-based rendering
  console.log("2️⃣ Rendering with node-based schema...");
  let nodeHTML: string;
  try {
    const schema = await getNodeTemplateSchema(templateFamily, variant);
    if (!schema) {
      console.error(`   ❌ Schema not found for ${templateFamily} variant ${variant}`);
      process.exit(1);
    }

    // Prepare data
    const data = {
      eventTitle: mockSubmission.eventTitle,
      eventDate: formattedDate,
      doorTime: formattedTime,
      venueName: mockSubmission.venueName,
      addressLine: mockSubmission.addressLine,
      cityLine: mockSubmission.cityLine,
      primaryColor: mockSubmission.primaryColor,
      secondaryColor: mockSubmission.secondaryColor,
      people: JSON.parse(mockSubmission.people),
      logo: "assets/mtl-code-wide.svg", // Mock logo
    };

    // Resolve tokens
    const tokens: Record<string, string> = {};
    if (schema.tokens.primary) {
      tokens.primary = mockSubmission.primaryColor;
    }
    if (schema.tokens.secondary) {
      tokens.secondary = mockSubmission.secondaryColor;
    }

    // Compile
    nodeHTML = await compileNodeGraphToHTML(schema, {
      data,
      tokens,
      variantId: variant,
    });

    await writeFile(join(process.cwd(), "test-output-node.html"), nodeHTML);
    console.log("   ✅ Node HTML rendered");
  } catch (error) {
    console.error("   ❌ Node HTML render failed:", error);
    process.exit(1);
  }

  // Compare
  console.log("\n📊 Comparison:");
  console.log(`   Legacy HTML size: ${legacyHTML.length} bytes`);
  console.log(`   Node HTML size: ${nodeHTML.length} bytes`);
  console.log(`   Size difference: ${Math.abs(legacyHTML.length - nodeHTML.length)} bytes`);

  // Basic structure comparison
  const legacyHasBody = legacyHTML.includes("<body");
  const nodeHasBody = nodeHTML.includes("<body");
  const legacyHasRoot = legacyHTML.includes('id="root"') || legacyHTML.includes('width: 1080px');
  const nodeHasRoot = nodeHTML.includes('id="root"') || nodeHTML.includes('width: 1080px');

  console.log("\n✅ Structure check:");
  console.log(`   Legacy has body: ${legacyHasBody ? "✅" : "❌"}`);
  console.log(`   Node has body: ${nodeHasBody ? "✅" : "❌"}`);
  console.log(`   Legacy has root container: ${legacyHasRoot ? "✅" : "❌"}`);
  console.log(`   Node has root container: ${nodeHasRoot ? "✅" : "❌"}`);

  // Check for key content
  const legacyHasTitle = legacyHTML.includes(mockSubmission.eventTitle);
  const nodeHasTitle = nodeHTML.includes(mockSubmission.eventTitle);
  const legacyHasDate = legacyHTML.includes(formattedDate);
  const nodeHasDate = nodeHTML.includes(formattedDate);
  
  // Also check if date appears in any form (timezone might cause slight differences)
  const datePattern = /\w+day,\s*\w+\s+\d+/;
  const legacyHasDatePattern = datePattern.test(legacyHTML);
  const nodeHasDatePattern = datePattern.test(nodeHTML);

  console.log("\n✅ Content check:");
  console.log(`   Legacy has event title: ${legacyHasTitle ? "✅" : "❌"}`);
  console.log(`   Node has event title: ${nodeHasTitle ? "✅" : "❌"}`);
  console.log(`   Legacy has formatted date: ${legacyHasDate ? "✅" : "❌"} (${formattedDate})`);
  console.log(`   Node has formatted date: ${nodeHasDate ? "✅" : "❌"} (${formattedDate})`);
  console.log(`   Legacy has date pattern: ${legacyHasDatePattern ? "✅" : "❌"}`);
  console.log(`   Node has date pattern: ${nodeHasDatePattern ? "✅" : "❌"}`);

  console.log("\n📁 Output files:");
  console.log("   - test-output-legacy.html");
  console.log("   - test-output-node.html");
  console.log("\n💡 Open both files in a browser to visually compare renders.");
}

main().catch(console.error);

