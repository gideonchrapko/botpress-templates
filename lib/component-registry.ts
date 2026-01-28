/**
 * Component Registry
 * 
 * Loads Figma component metadata for blog image generation.
 * Components are loaded from Figma API on-demand.
 */

import { ComponentInfo } from './blog-image-rules';

/**
 * Load components from Figma API
 * Requires FIGMA_ACCESS_TOKEN environment variable
 */
export async function loadComponentsFromFigma(fileId: string): Promise<ComponentInfo[]> {
  const accessToken = process.env.FIGMA_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('FIGMA_ACCESS_TOKEN not configured');
  }

  try {
    // Get file data from Figma API
    const response = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
      headers: {
        'X-Figma-Token': accessToken
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Figma API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const components: ComponentInfo[] = [];

    // Traverse the document tree to find components
    function traverseNode(node: any, fileId: string) {
      if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
        const component = categorizeComponent(node, fileId);
        if (component) {
          components.push(component);
        }
      }

      if (node.children) {
        node.children.forEach((child: any) => traverseNode(child, fileId));
      }
    }

    traverseNode(data.document, fileId);

    return components;
  } catch (error) {
    console.error('Error loading components from Figma:', error);
    throw error;
  }
}

/**
 * Categorize a Figma component based on naming convention
 */
function categorizeComponent(node: any, fileId: string): ComponentInfo | null {
  const name = node.name.toLowerCase();

  // Background images: bg-number-colour
  if (name.startsWith('bg-')) {
    return {
      id: node.id,
      name: node.name,
      type: 'background',
      description: `Background image: ${node.name}`,
      figmaFileId: fileId,
      figmaNodeId: node.id,
      imageUrl: `https://www.figma.com/file/${fileId}?node-id=${encodeURIComponent(node.id)}`
    };
  }

  // Main images: descriptive names
  if (name.includes('main') || name.includes('hero') || name.includes('primary')) {
    return {
      id: node.id,
      name: node.name,
      type: 'main',
      description: `Main image: ${node.name}`,
      figmaFileId: fileId,
      figmaNodeId: node.id,
      imageUrl: `https://www.figma.com/file/${fileId}?node-id=${encodeURIComponent(node.id)}`
    };
  }

  // Supporting images: only those starting with 'supporting-graphic-'
  if (name.startsWith('supporting-graphic-')) {
    return {
      id: node.id,
      name: node.name,
      type: 'supporting',
      description: `Supporting image: ${node.name}`,
      figmaFileId: fileId,
      figmaNodeId: node.id,
      imageUrl: `https://www.figma.com/file/${fileId}?node-id=${encodeURIComponent(node.id)}`
    };
  }

  return null;
}

/**
 * Get component image URL from Figma API
 * This generates a direct image URL for a component
 */
export async function getComponentImageUrl(fileId: string, nodeId: string, format: 'png' | 'jpg' = 'png'): Promise<string> {
  const accessToken = process.env.FIGMA_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('FIGMA_ACCESS_TOKEN not configured');
  }

  // Use Figma's image API to get rendered image
  const response = await fetch(
    `https://api.figma.com/v1/images/${fileId}?ids=${nodeId}&format=${format}`,
    {
      headers: {
        'X-Figma-Token': accessToken
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Figma Image API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const imageUrl = data.images?.[nodeId];
  
  if (!imageUrl) {
    throw new Error(`No image URL returned for node ${nodeId}`);
  }
  
  return imageUrl;
}
