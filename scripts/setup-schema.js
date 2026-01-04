#!/usr/bin/env node

/**
 * Automatically sets the database provider in schema.prisma
 * based on DATABASE_PROVIDER environment variable
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

// Load .env.local first, then .env
function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    }
    return env;
  }
  return {};
}

// Load environment variables (prioritize .env.local)
const envLocal = loadEnvFile(path.join(__dirname, '../.env.local'));
const env = loadEnvFile(path.join(__dirname, '../.env'));

// Auto-detect provider from DATABASE_URL if DATABASE_PROVIDER is not set
// Priority: .env.local > .env > process.env
let provider = envLocal.DATABASE_PROVIDER || env.DATABASE_PROVIDER || process.env.DATABASE_PROVIDER;
if (!provider) {
  // Check .env.local first, then .env, then process.env
  const databaseUrl = envLocal.DATABASE_URL || env.DATABASE_URL || process.env.DATABASE_URL || '';
  if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
    provider = 'postgresql';
  } else {
    provider = 'sqlite';
  }
}

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
