/**
 * Blog Image Generator
 * 
 * Generates blog images by selecting components based on blog title using word matching.
 * This replaces the need for hardcoded templates - everything is generated dynamically.
 */

import { AI_RULES, getAllowedBackgroundsForMain, TemplateSelection, ComponentInfo } from './blog-image-rules';

/**
 * Extract meaningful words from text (removes common stop words)
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'how', 'what', 'when', 'where', 'why',
    'the', 'this', 'these', 'those', 'i', 'you', 'we', 'they', 'me', 'him', 'her'
  ]);

  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Calculate relevance score for a component name based on keywords
 */
function calculateRelevanceScore(componentName: string, keywords: string[]): number {
  const nameLower = componentName.toLowerCase();
  let score = 0;

  keywords.forEach(keyword => {
    // Exact match gets highest score
    if (nameLower === keyword) {
      score += 10;
    }
    // Word boundary match (whole word)
    else if (new RegExp(`\\b${keyword}\\b`).test(nameLower)) {
      score += 5;
    }
    // Partial match (substring)
    else if (nameLower.includes(keyword)) {
      score += 2;
    }
  });

  return score;
}

/**
 * Select best matching main image using word matching
 */
function selectMainImageByWordMatch(
  mainImages: ComponentInfo[],
  blogTitle: string,
  keywords: string
): ComponentInfo {
  const allKeywords = [
    ...extractKeywords(blogTitle),
    ...extractKeywords(keywords || '')
  ];

  if (allKeywords.length === 0) {
    // No keywords, return random image for variety
    return mainImages[Math.floor(Math.random() * mainImages.length)];
  }

  // Score all images
  const scoredImages = mainImages.map(image => ({
    image,
    score: calculateRelevanceScore(image.name, allKeywords)
  }));

  // Sort by score (highest first)
  scoredImages.sort((a, b) => b.score - a.score);

  // Get top matches (within 2 points of the best score for variety)
  const topScore = scoredImages[0].score;
  const topMatches = scoredImages.filter(
    item => item.score >= topScore - 2 && item.score > 0
  );

  // If we have good matches, randomly pick from top 3 for variety
  if (topMatches.length > 0) {
    const candidates = topMatches.slice(0, Math.min(3, topMatches.length));
    return candidates[Math.floor(Math.random() * candidates.length)].image;
  }

  // No good matches, return random image
  return mainImages[Math.floor(Math.random() * mainImages.length)];
}

/**
 * Select components using word matching
 */
export function selectComponentsWithWordMatch(
  blogTitle: string,
  keywords: string,
  components: ComponentInfo[]
): TemplateSelection {
  const backgrounds = components.filter(c => c.type === 'background');
  const mainImages = components.filter(c => c.type === 'main');
  const supportingImages = components.filter(c => c.type === 'supporting');

  if (mainImages.length === 0) {
    throw new Error('No main images available');
  }

  // Select main image using word matching
  const mainImage = selectMainImageByWordMatch(mainImages, blogTitle, keywords);

  return selectComponentsForMain(mainImage.name, backgrounds, supportingImages);
}

/**
 * Select background and supporting images for a given main image
 */
function selectComponentsForMain(
  mainImageName: string,
  backgrounds: ComponentInfo[],
  supportingImages: ComponentInfo[]
): TemplateSelection {
  // Get allowed backgrounds for this main image
  const allowedBackgrounds = getAllowedBackgroundsForMain(mainImageName);
  const availableBackgrounds = backgrounds.filter(bg =>
    allowedBackgrounds.some(type => bg.name.startsWith(type))
  );

  if (availableBackgrounds.length === 0) {
    // Fallback to first available background
    if (backgrounds.length === 0) {
      throw new Error('No backgrounds available');
    }
    const fallbackBg = backgrounds[0];
    const bgType = fallbackBg.name.split('-').slice(0, 2).join('-');
    const rule = AI_RULES.backgroundRules[bgType as keyof typeof AI_RULES.backgroundRules];
    const numSupporting = rule ? rule.maxSupporting : 0;
    
    return {
      background: fallbackBg.name,
      mainImage: mainImageName,
      supportingImages: supportingImages.slice(0, numSupporting).map(s => s.name),
      layout: 'standard',
      reasoning: `Selected ${mainImageName} with fallback background ${fallbackBg.name}`
    };
  }

  // Group backgrounds by base type for variety
  const backgroundGroups: { [key: string]: ComponentInfo[] } = {};
  availableBackgrounds.forEach(bg => {
    const baseType = bg.name.split('-').slice(0, 2).join('-');
    if (!backgroundGroups[baseType]) {
      backgroundGroups[baseType] = [];
    }
    backgroundGroups[baseType].push(bg);
  });

  // Randomly select a base type, then randomly select from that group
  const baseTypes = Object.keys(backgroundGroups);
  const selectedBaseType = baseTypes[Math.floor(Math.random() * baseTypes.length)];
  const selectedGroup = backgroundGroups[selectedBaseType];
  const background = selectedGroup[Math.floor(Math.random() * selectedGroup.length)];

  // Use rules to pick supporting images
  const bgType = background.name.split('-').slice(0, 2).join('-');
  const rule = AI_RULES.backgroundRules[bgType as keyof typeof AI_RULES.backgroundRules];
  const numSupporting = rule ? rule.maxSupporting : 0;

  const supportingPool = [...supportingImages];
  const supportingImagesPicked: string[] = [];
  for (let i = 0; i < numSupporting && supportingPool.length > 0; i++) {
    const idx = Math.floor(Math.random() * supportingPool.length);
    supportingImagesPicked.push(supportingPool[idx].name);
    supportingPool.splice(idx, 1);
  }

  return {
    background: background.name,
    mainImage: mainImageName,
    supportingImages: supportingImagesPicked,
    layout: bgType,
    reasoning: `Selected ${mainImageName} with ${background.name} background and ${supportingImagesPicked.length} supporting images`
  };
}
