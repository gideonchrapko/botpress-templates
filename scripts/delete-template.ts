#!/usr/bin/env tsx
/**
 * Delete a template from the database by family ID
 * Usage: bun run scripts/delete-template.ts <template-family-id>
 * Example: bun run scripts/delete-template.ts simple-monthly-poster
 */

import { prisma } from "@/lib/prisma";

async function deleteTemplate(familyId: string) {
  let deletedFromDb = false;
  let deletedFromFs = false;
  
  // Delete from database
  try {
    const deleted = await prisma.template.delete({
      where: { family: familyId },
    });
    console.log(`✅ Deleted from database: ${deleted.name} (${deleted.family})`);
    deletedFromDb = true;
  } catch (error: any) {
    if (error.code === "P2025") {
      console.log(`ℹ️  Template "${familyId}" not found in database`);
    } else {
      console.error(`❌ Error deleting from database:`, error.message);
    }
  }
  
  // Delete from filesystem
  const { existsSync } = await import("fs");
  const { join } = await import("path");
  const { rm } = await import("fs/promises");
  
  const templateDir = join(process.cwd(), "templates", familyId);
  if (existsSync(templateDir)) {
    try {
      await rm(templateDir, { recursive: true, force: true });
      console.log(`✅ Deleted from filesystem: ${templateDir}`);
      deletedFromFs = true;
    } catch (error: any) {
      console.error(`❌ Error deleting from filesystem:`, error.message);
    }
  } else {
    console.log(`ℹ️  Template "${familyId}" not found in filesystem`);
  }
  
  if (!deletedFromDb && !deletedFromFs) {
    console.error(`❌ Template "${familyId}" not found in database or filesystem`);
    return false;
  }
  
  return true;
}

async function listAllTemplates() {
  try {
    const templates = await prisma.template.findMany({
      select: {
        family: true,
        name: true,
        format: true,
        createdAt: true,
        configJson: true,
        htmlContent: true,
      },
      orderBy: { createdAt: "desc" },
    });
    
    if (templates.length === 0) {
      console.log("No templates found in database");
      return;
    }
    
    console.log("\n📋 Templates in database:");
    console.log("─".repeat(60));
    templates.forEach((t: { family: string; name: string; format: string }) => {
      console.log(`  ${t.family.padEnd(30)} | ${t.name.padEnd(20)} | ${t.format}`);
    });
    console.log("─".repeat(60));
    console.log(`\nTotal: ${templates.length} template(s)\n`);
  } catch (error: any) {
    console.error(`❌ Error listing templates:`, error.message);
  }
}

async function deleteAllTemplates() {
  // Delete from database
  try {
    const result = await prisma.template.deleteMany({});
    console.log(`✅ Deleted ${result.count} template(s) from database`);
  } catch (error: any) {
    console.error(`❌ Error deleting all templates from database:`, error.message);
  }
  
  // Delete from filesystem (but keep the templates directory)
  const { existsSync } = await import("fs");
  const { readdir, rm } = await import("fs/promises");
  const { join } = await import("path");
  
  const templatesDir = join(process.cwd(), "templates");
  if (existsSync(templatesDir)) {
    try {
      const entries = await readdir(templatesDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
      
      for (const dir of dirs) {
        const templateDir = join(templatesDir, dir);
        await rm(templateDir, { recursive: true, force: true });
      }
      console.log(`✅ Deleted ${dirs.length} template(s) from filesystem`);
    } catch (error: any) {
      console.error(`❌ Error deleting from filesystem:`, error.message);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Usage:");
    console.log("  bun run scripts/delete-template.ts <template-family-id>  # Delete specific template");
    console.log("  bun run scripts/delete-template.ts --list                # List all templates");
    console.log("  bun run scripts/delete-template.ts --all                # Delete ALL templates");
    console.log("\nExample:");
    console.log("  bun run scripts/delete-template.ts simple-monthly-poster");
    await listAllTemplates();
    process.exit(1);
  }
  
  if (args[0] === "--list") {
    await listAllTemplates();
    process.exit(0);
  }
  
  if (args[0] === "--all") {
    console.log("⚠️  WARNING: This will delete ALL templates!");
    console.log("Press Ctrl+C to cancel, or wait 3 seconds...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    await deleteAllTemplates();
    process.exit(0);
  }
  
  const familyId = args[0];
  const success = await deleteTemplate(familyId);
  
  if (success) {
    await listAllTemplates();
  }
  
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
