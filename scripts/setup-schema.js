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

// Replace the provider line - find any provider = "value" in the datasource block
// Match: provider = "sqlite" or provider = "postgresql" (with optional whitespace)
const updatedSchema = schema.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)(?:["'][^"']+["']|env\(["'][^"']+["']\))/s,
  `$1"${provider}"`
);

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
