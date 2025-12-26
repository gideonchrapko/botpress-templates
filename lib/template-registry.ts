import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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
  const templatesDir = join(process.cwd(), "templates");
  
  if (!existsSync(templatesDir)) {
    return [];
  }

  // For now, we'll hardcode the known families
  // In the future, we could read the directory
  const families = ["mtl-code", "code-a-quebec"];
  const configs: TemplateConfig[] = [];

  for (const family of families) {
    const config = await getTemplateConfig(family);
    if (config) {
      configs.push(config);
    }
  }

  return configs;
}

