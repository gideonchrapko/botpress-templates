#!/usr/bin/env node

/**
 * Automatically sets the database provider in schema.prisma
 * based on DATABASE_PROVIDER environment variable
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const provider = process.env.DATABASE_PROVIDER || 'sqlite';

// Read the schema file
const schema = fs.readFileSync(schemaPath, 'utf8');

// Replace ONLY the provider in the datasource block (not the generator)
// Match: datasource db { ... provider = "value" ... }
const datasourceBlock = /(datasource\s+db\s*\{[^}]*?)(provider\s*=\s*)(?:["'][^"']+["']|env\(["'][^"']+["']\))([^}]*?\})/s;
const updatedSchema = schema.replace(datasourceBlock, (match, before, providerKeyword, after) => {
  return before + providerKeyword + `"${provider}"` + after;
});

if (updatedSchema !== schema) {
  fs.writeFileSync(schemaPath, updatedSchema);
  console.log(`✅ Database provider set to: ${provider}`);
} else {
  // Check if it's already set to the correct value
  if (schema.includes(`provider = "${provider}"`)) {
    // Already correct, no need to warn
  } else {
    console.warn('⚠️  Could not find provider line to replace');
  }
}
