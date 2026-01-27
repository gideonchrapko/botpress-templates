import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";

export interface TemplateField {
  type: "text" | "color" | "date" | "time" | "people" | "image";
  name: string;
  label: string;
  placeholder?: string;
  default?: string;
  maxLength?: number;
  format?: string;
  locale?: string;
  prefix?: string;
  maxCount?: number;
  fields?: TemplateField[];
  replacements?: Array<{
    pattern: string;
    type: string;
    regex?: string;
    flags?: string;
  }>;
}

export interface TemplateConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  variants: string[];
  fields: TemplateField[];
  // Hybrid system: Explicit format selection
  // "node" = use node graph renderer (good for simple posters with fixed layouts)
  // "html" = use HTML template renderer (good for long-format content, dynamic text)
  // undefined = auto-detect based on file presence (defaults to "html" for backwards compatibility)
  format?: "node" | "html";
  assets: {
    logo: {
      default: string;
      swap: Record<string, string>;
    };
    decoration?: {
      file: string;
      colorReplacements: string[];
    };
  };
  colorReplacements?: Record<string, string>;
  address?: {
    venueName: string;
    addressLine: string;
    cityLine: string;
  };
}

const configCache: Map<string, TemplateConfig> = new Map();

export async function getTemplateConfig(family: string): Promise<TemplateConfig | null> {
  // Check cache first
  if (configCache.has(family)) {
    return configCache.get(family)!;
  }

  // Priority 1: Check database (for Figma imports and production)
  try {
    const template = await prisma.template.findUnique({
      where: { family },
    });
    
    if (template?.configJson) {
      const config = JSON.parse(template.configJson) as TemplateConfig;
      configCache.set(family, config);
      return config;
    }
  } catch (error: any) {
    // Silently fall back to filesystem if database is unavailable
    // This is expected during build time or if DATABASE_URL isn't configured
    if (error?.code !== 'P1001' && error?.code !== 'P1017') {
      // Only log non-connection errors
      console.warn(`Failed to load template ${family} from database:`, error?.message || error);
    }
    // Fall through to filesystem
  }

  // Priority 2: Check filesystem (for existing templates and development)
  const configPath = join(process.cwd(), "templates", family, "config.json");
  
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const configContent = await readFile(configPath, "utf-8");
    const config = JSON.parse(configContent) as TemplateConfig;
    configCache.set(family, config);
    return config;
  } catch {
    return null;
  }
}

export async function getAllTemplateConfigs(): Promise<TemplateConfig[]> {
  const configs: TemplateConfig[] = [];
  const processedFamilies = new Set<string>();

  // Priority 1: Load from database (Figma imports and production)
  try {
    const dbTemplates = await prisma.template.findMany({
      where: {
        configJson: { not: null },
      },
    });

    for (const template of dbTemplates) {
      if (template.configJson) {
        try {
          const config = JSON.parse(template.configJson) as TemplateConfig;
          configs.push(config);
          processedFamilies.add(template.family);
        } catch (error) {
          console.warn(`Failed to parse config for template ${template.family}:`, error);
        }
      }
    }
  } catch (error: any) {
    // Silently fall back to filesystem if database is unavailable
    // This is expected during build time or if DATABASE_URL isn't configured
    if (error?.code !== 'P1001' && error?.code !== 'P1017') {
      // Only log non-connection errors
      console.warn("Failed to load templates from database:", error?.message || error);
    }
  }

  // Priority 2: Load from filesystem (existing templates and development)
  const templatesDir = join(process.cwd(), "templates");
  
  if (existsSync(templatesDir)) {
    const { readdir } = await import("fs/promises");
    const entries = await readdir(templatesDir, { withFileTypes: true });
    const families = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    
    for (const family of families) {
      // Skip if already loaded from database
      if (processedFamilies.has(family)) {
        continue;
      }
      
      const config = await getTemplateConfig(family);
      if (config) {
        configs.push(config);
      }
    }
  }

  return configs;
}

