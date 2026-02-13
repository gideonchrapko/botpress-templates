/**
 * Marketing tools shown under the Tools tab. Each has a slug used in the URL: /tools/[slug]
 */
export const MARKETING_TOOLS = [
  {
    slug: "url-creator",
    name: "URL Creator",
    description: "Create and manage tracking URLs for campaigns",
  },
  // Add more tools here, e.g.:
  // { slug: "utm-builder", name: "UTM Builder", description: "Build UTM parameters for links" },
] as const;

export type MarketingToolSlug = (typeof MARKETING_TOOLS)[number]["slug"];

export function getMarketingToolBySlug(slug: string) {
  return MARKETING_TOOLS.find((t) => t.slug === slug) ?? null;
}
