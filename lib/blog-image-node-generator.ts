/**
 * Blog Image Node Generator
 * 
 * Generates a node graph schema for blog images dynamically based on component selection.
 * This replaces the HTML template approach with a proper node-based template.
 */

import { TemplateSchema, FrameNode, ImageNode, TemplateNode } from './node-types';
import { TemplateSelection, ComponentInfo } from './blog-image-rules';
import { AI_RULES, getPositionsForBackground } from './blog-image-rules';
import { BlogImageTemplateConfig } from './blog-image-template';

/**
 * Generate a node graph schema for a blog image based on component selection
 */
export function generateBlogImageNodeSchema(
  selection: TemplateSelection,
  components: ComponentInfo[],
  config: BlogImageTemplateConfig
): TemplateSchema {
  const { width, height, blogImage } = config;
  const { defaultBackgroundColor } = blogImage;

  // Find selected components
  const background = components.find(c => c.type === 'background' && c.name === selection.background);
  const mainImage = components.find(c => c.type === 'main' && c.name === selection.mainImage);
  const supportingImages = selection.supportingImages
    .map(name => components.find(c => c.type === 'supporting' && c.name === name))
    .filter(Boolean) as ComponentInfo[];

  if (!background) {
    const availableBackgrounds = components
      .filter(c => c.type === 'background')
      .map(c => c.name)
      .join(', ');
    throw new Error(
      `Background component "${selection.background}" not found. ` +
      `Available backgrounds: ${availableBackgrounds || 'none'}`
    );
  }
  
  if (!mainImage) {
    const availableMainImages = components
      .filter(c => c.type === 'main')
      .map(c => c.name)
      .join(', ');
    throw new Error(
      `Main image component "${selection.mainImage}" not found. ` +
      `Available main images: ${availableMainImages || 'none'}`
    );
  }

  // Check for image URLs
  if (!background.imageUrl) {
    throw new Error(`Background component "${background.name}" is missing imageUrl`);
  }
  
  if (!mainImage.imageUrl) {
    throw new Error(`Main image component "${mainImage.name}" is missing imageUrl`);
  }

  // Extract background type (e.g., "bg-one", "bg-two")
  const bgType = selection.background.split('-').slice(0, 2).join('-');
  
  // Get positioning rules
  const illustrationRule = AI_RULES.mainIllustrationRules[bgType as keyof typeof AI_RULES.mainIllustrationRules];
  const positions = getPositionsForBackground(bgType);

  // Build nodes array
  const nodes: TemplateNode[] = [];
  let zIndex = 0;

  // Background image (full canvas)
  const backgroundNode: ImageNode = {
    id: 'background-image',
    type: 'image',
    x: 0,
    y: 0,
    width,
    height,
    zIndex: zIndex++,
    src: background.imageUrl || '',
    fit: 'cover',
    binding: {
      field: 'backgroundImageUrl',
      type: 'image',
    },
  };
  nodes.push(backgroundNode);

  // Main image
  const mainImageX = illustrationRule?.x ?? 375;
  const mainImageY = illustrationRule?.y ?? 125;
  const mainImageWidth = illustrationRule?.width ?? blogImage.componentSizes.mainIllustration.width;
  const mainImageHeight = illustrationRule?.height ?? blogImage.componentSizes.mainIllustration.height;

  const mainImageNode: ImageNode = {
    id: 'main-image',
    type: 'image',
    x: mainImageX,
    y: mainImageY,
    width: mainImageWidth,
    height: mainImageHeight,
    zIndex: zIndex++,
    src: mainImage.imageUrl || '',
    fit: 'contain',
    binding: {
      field: 'mainImageUrl',
      type: 'image',
    },
  };
  nodes.push(mainImageNode);

  // Supporting images
  supportingImages.forEach((supporting, index) => {
    if (index >= positions.length || !supporting.imageUrl) {
      return;
    }

    const position = positions[index];
    const size = position.customSize || blogImage.componentSizes.supportingGraphic;
    
    // Use small size for bg-four
    const finalSize = bgType === 'bg-four' && blogImage.componentSizes.supportingGraphicSmall
      ? blogImage.componentSizes.supportingGraphicSmall
      : size;

    const supportingNode: ImageNode = {
      id: `supporting-image-${index}`,
      type: 'image',
      x: position.x,
      y: position.y,
      width: finalSize.width,
      height: finalSize.height,
      zIndex: zIndex++,
      src: supporting.imageUrl,
      fit: 'contain',
      binding: {
        field: `supportingImageUrl${index}`,
        type: 'image',
      },
    };
    nodes.push(supportingNode);
  });

  // Grid layer (on top of everything - highest zIndex)
  // The Grid layer is inside the background component, not a separate component
  // Add it last so it has the highest zIndex and renders on top
  if (background.gridImageUrl) {
    const gridNode: ImageNode = {
      id: 'grid-layer',
      type: 'image',
      x: 0,
      y: 0,
      width,
      height,
      zIndex: zIndex++, // Highest zIndex - renders on top of everything
      src: background.gridImageUrl,
      fit: 'cover',
    };
    nodes.push(gridNode);
  }

  // Create root frame
  const root: FrameNode = {
    id: 'root',
    type: 'frame',
    width,
    height,
    padding: 0,
    backgroundColor: defaultBackgroundColor,
    overflow: 'hidden',
    boxSizing: 'border-box',
    children: nodes,
  };

  // Create schema
  const schema: TemplateSchema = {
    id: 'blog-image-generator',
    name: 'Blog Image Generator',
    title: 'Blog Image Generator',
    version: 1,
    dimensions: {
      width,
      height,
    },
    root,
    tokens: {},
    variants: [
      {
        id: '1',
        name: 'Default',
        overrides: [],
      },
    ],
    bindings: [
      {
        nodeId: 'background-image',
        field: 'backgroundImageUrl',
        type: 'image',
      },
      {
        nodeId: 'main-image',
        field: 'mainImageUrl',
        type: 'image',
      },
      ...supportingImages.map((_, index) => ({
        nodeId: `supporting-image-${index}`,
        field: `supportingImageUrl${index}`,
        type: 'image' as const,
      })),
    ],
  };

  return schema;
}

/**
 * Prepare data for node template binding
 */
export function prepareBlogImageNodeData(
  selection: TemplateSelection,
  components: ComponentInfo[]
): Record<string, any> {
  const background = components.find(c => c.type === 'background' && c.name === selection.background);
  const mainImage = components.find(c => c.type === 'main' && c.name === selection.mainImage);
  const supportingImages = selection.supportingImages
    .map(name => components.find(c => c.type === 'supporting' && c.name === name))
    .filter(Boolean) as ComponentInfo[];

  if (!background) {
    throw new Error(`Background component not found: ${selection.background}. Available: ${components.filter(c => c.type === 'background').map(c => c.name).join(', ')}`);
  }
  
  if (!mainImage) {
    throw new Error(`Main image component not found: ${selection.mainImage}. Available: ${components.filter(c => c.type === 'main').map(c => c.name).join(', ')}`);
  }

  if (!background.imageUrl) {
    throw new Error(`Background component missing imageUrl: ${background.name}`);
  }
  
  if (!mainImage.imageUrl) {
    throw new Error(`Main image component missing imageUrl: ${mainImage.name}`);
  }

  const data: Record<string, any> = {
    backgroundImageUrl: background.imageUrl,
    mainImageUrl: mainImage.imageUrl,
  };

  // Add supporting image URLs
  supportingImages.forEach((supporting, index) => {
    if (!supporting.imageUrl) {
      console.warn(`Supporting image ${supporting.name} missing imageUrl, skipping`);
      return;
    }
    data[`supportingImageUrl${index}`] = supporting.imageUrl;
  });

  return data;
}
