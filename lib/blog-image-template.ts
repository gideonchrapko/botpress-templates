/**
 * Blog Image Template System
 * 
 * Generates blog images using a template-based approach with minimal hardcoding.
 * Uses the same template engine as other templates for consistency.
 */

import { TemplateConfig } from './template-registry';

/**
 * Blog image template configuration
 * This replaces hardcoded values with configurable settings
 */
export interface BlogImageTemplateConfig extends TemplateConfig {
  blogImage: {
    dimensions: {
      width: number;
      height: number;
    };
    componentSizes: {
      mainIllustration: { width: number; height: number };
      supportingGraphic: { width: number; height: number };
      supportingGraphicSmall?: { width: number; height: number }; // For bg-four
    };
    defaultBackgroundColor: string;
  };
}

/**
 * Get environment-based configuration overrides
 */
function getConfigOverrides(): Partial<BlogImageTemplateConfig> {
  const overrides: Partial<BlogImageTemplateConfig> = {};

  // Allow dimensions to be overridden via environment variables
  if (process.env.BLOG_IMAGE_WIDTH) {
    const width = parseInt(process.env.BLOG_IMAGE_WIDTH, 10);
    if (!isNaN(width)) {
      overrides.width = width;
      if (!overrides.blogImage) {
        overrides.blogImage = {} as any;
      }
      const blogImage = overrides.blogImage!;
      if (!blogImage.dimensions) {
        blogImage.dimensions = {} as any;
      }
      blogImage.dimensions.width = width;
    }
  }

  if (process.env.BLOG_IMAGE_HEIGHT) {
    const height = parseInt(process.env.BLOG_IMAGE_HEIGHT, 10);
    if (!isNaN(height)) {
      overrides.height = height;
      if (!overrides.blogImage) {
        overrides.blogImage = {} as any;
      }
      const blogImage = overrides.blogImage!;
      if (!blogImage.dimensions) {
        blogImage.dimensions = {} as any;
      }
      blogImage.dimensions.height = height;
    }
  }

  return overrides;
}

/**
 * Default blog image template config
 * Can be overridden via environment variables or database config
 */
export function getDefaultBlogImageConfig(): BlogImageTemplateConfig {
  const overrides = getConfigOverrides();
  
  const config: BlogImageTemplateConfig = {
  id: 'blog-image-generator',
  name: 'Blog Image Generator',
  width: 1500,
  height: 1000,
  variants: ['1'],
  format: 'node',
  fields: [
    {
      type: 'text',
      name: 'blogTitle',
      label: 'Blog Title',
    },
    {
      type: 'text',
      name: 'keywords',
      label: 'Keywords',
    },
  ],
  assets: {
    logo: {
      default: '',
      swap: {},
    },
  },
  blogImage: {
    dimensions: {
      width: 1500,
      height: 1000,
    },
    componentSizes: {
      mainIllustration: { width: 700, height: 700 },
      supportingGraphic: { width: 500, height: 500 },
      supportingGraphicSmall: { width: 375, height: 375 },
    },
    defaultBackgroundColor: '#ffffff',
  },
  };

  // Apply overrides
  return {
    ...config,
    ...overrides,
    blogImage: {
      ...config.blogImage,
      ...(overrides.blogImage || {}),
      dimensions: {
        ...config.blogImage.dimensions,
        ...(overrides.blogImage?.dimensions || {}),
      },
      componentSizes: {
        ...config.blogImage.componentSizes,
        ...(overrides.blogImage?.componentSizes || {}),
      },
    },
  };
}

/**
 * Default config export for convenience
 */
export const DEFAULT_BLOG_IMAGE_CONFIG = getDefaultBlogImageConfig();
