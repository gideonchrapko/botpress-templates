import { readFile } from "fs/promises";
import { join } from "path";
import { format } from "date-fns";
import { Submission } from "@prisma/client";
import { existsSync } from "fs";
import { lightenColor } from "@/lib/utils";

const BASE_WIDTH = 1080;
const BASE_HEIGHT = 1350;

export function getPosterDimensions(scale: number) {
  return {
    width: BASE_WIDTH * scale,
    height: BASE_HEIGHT * scale,
  };
}

export async function renderTemplate(submission: Submission): Promise<string> {
  const templateVariant = submission.templateVariant;
  // Convert mtl-code-1, mtl-code-2, mtl-code-3 to quebec-linkedin-1, quebec-linkedin-2, quebec-linkedin-3
  const templateFileName = templateVariant.replace("mtl-code-", "quebec-linkedin-");
  const templatePath = join(
    process.cwd(),
    "templates",
    `${templateFileName}.html`
  );

  let html = await readFile(templatePath, "utf-8");
  const people = JSON.parse(submission.people);
  const uploadUrls = JSON.parse(submission.uploadUrls);

  // Get the assets directory path from public folder
  const assetsDir = join(
    process.cwd(),
    "public",
    "assets"
  );

  // Helper function to convert file to base64 data URI
  const fileToDataUri = async (filePath: string): Promise<string | null> => {
    if (!existsSync(filePath)) {
      return null;
    }
    try {
      const fileBuffer = await readFile(filePath);
      const ext = filePath.split(".").pop()?.toLowerCase();
      let mimeType = "image/png";
      if (ext === "svg") mimeType = "image/svg+xml";
      else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
      else if (ext === "png") mimeType = "image/png";
      else if (ext === "webp") mimeType = "image/webp";
      const base64 = fileBuffer.toString("base64");
      return `data:${mimeType};base64,${base64}`;
    } catch {
      return null;
    }
  };

  // Convert all asset paths (logo SVG, decoration SVG, etc.) to base64 data URIs
  // Exclude speaker-photo.png as it will be replaced with user headshots
  const assetSrcRegex = /src="assets\/([^"]+)"/g;
  let assetSrcMatch;
  while ((assetSrcMatch = assetSrcRegex.exec(html)) !== null) {
    const assetFile = assetSrcMatch[1];
    if (assetFile === "speaker-photo.png") {
      continue; // Skip speaker-photo.png, will be replaced later
    }
    const assetPath = join(assetsDir, assetFile);
    
    // Special handling for decoration.svg - replace primary color before converting
    if (assetFile === "decoration.svg") {
      let svgContent = await readFile(assetPath, "utf-8");
      // Replace #3D9DFF with the selected primary color
      svgContent = svgContent.replace(/#3D9DFF/g, submission.primaryColor);
      // Convert to base64
      const base64 = Buffer.from(svgContent).toString("base64");
      const dataUri = `data:image/svg+xml;base64,${base64}`;
      html = html.replace(assetSrcMatch[0], `src="${dataUri}"`);
    } else {
      const dataUri = await fileToDataUri(assetPath);
      if (dataUri) {
        html = html.replace(assetSrcMatch[0], `src="${dataUri}"`);
      }
    }
  }

  // Also handle SVG <image href> elements for assets (but not speaker-photo.png)
  const assetHrefRegex = /href="assets\/([^"]+)"/g;
  let assetHrefMatch;
  while ((assetHrefMatch = assetHrefRegex.exec(html)) !== null) {
    const assetFile = assetHrefMatch[1];
    if (assetFile === "speaker-photo.png") {
      continue; // Skip speaker-photo.png, will be replaced later
    }
    const assetPath = join(assetsDir, assetFile);
    const dataUri = await fileToDataUri(assetPath);
    if (dataUri) {
      html = html.replace(assetHrefMatch[0], `href="${dataUri}"`);
    }
  }

  // Format date
  const formattedDate = format(new Date(submission.eventDate), "EEEE, MMMM d");

  // Replace colors in template:
  // - #F4F4F4 (whitish background/text) stays the same - DO NOT replace
  // - #3D9DFF (primary color) → user's selected primary color
  // - #B5DAFF (lighter hue) → dynamically generated lighter version of primary color
  const lighterPrimaryColor = lightenColor(submission.primaryColor, 25); // Lighten by 25% to create a slightly lighter hue (darker than before)
  
  html = html.replace(/#3D9DFF/g, submission.primaryColor);
  html = html.replace(/#B5DAFF/g, lighterPrimaryColor);

  // Replace event title
  html = html.replace(/Placeholder Text/g, submission.eventTitle);

  // Replace date
  html = html.replace(/Thursday, November 20/g, formattedDate);

  // Location is hardcoded in template - no replacement needed
  // Address: "400 Blvd. De Maisonneuve Ouest"
  // City: "Montreal, QC  H3A 1L4"
  
  // Format door time from HH:MM (24-hour) to h:mm a (12-hour with AM/PM)
  const formatDoorTime = (time24: string): string => {
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12; // Convert to 12-hour format (0 becomes 12)
    return `${hour12}:${minutes}${ampm}`;
  };
  
  // Use doorTime from submission, or default to 6:00 PM if not available (for backwards compatibility)
  const doorTime = (submission as any).doorTime || "18:00";
  const formattedDoorTime = formatDoorTime(doorTime);
  html = html.replace(/Doors open @ 6:00PM/g, `Doors open @ ${formattedDoorTime}`);

  // Replace people information using a sequential block-based approach
  // For each person, find and replace ALL their placeholders (name, role, talk title) together
  // This ensures each person's data goes to the correct section
  
  for (let index = 0; index < people.length; index++) {
    const person = people[index];
    
    // Create a function to replace the first occurrence of any pattern from an array
    const replaceFirst = (patterns: RegExp[], replacement: string): boolean => {
      for (const pattern of patterns) {
        if (html.match(pattern)) {
          html = html.replace(pattern, replacement);
          return true;
        }
      }
      return false;
    };
    
    // Replace name - try all possible name placeholders, replace first match only
    const namePatterns = [
      /Michael Masson/,
      /John Doe/,
    ];
    replaceFirst(namePatterns, person.name);
    
    // Replace role - try all possible role placeholders, replace first match only
    const rolePatterns = [
      /CTO @ Botpress/,
      /Graphic Designer @ Botpress/,
    ];
    replaceFirst(rolePatterns, person.role);
    
    // Replace talk title - try all possible talk title placeholders, replace first match only
    const talkTitlePatterns = [
      /Kubernetes the right way: A platform engineering approach to K8s/,
      /Lorem Ipsum Dolor Sit/,
    ];
    replaceFirst(talkTitlePatterns, person.talkTitle);
    
    // Headshot is already a base64 data URI (stored directly in database)
    let headshotDataUri: string | null = null;
    if (person.headshotUrl && person.headshotUrl.startsWith("data:")) {
      // Already a data URI, use directly
      headshotDataUri = person.headshotUrl;
    } else if (person.headshotUrl.startsWith("/storage/")) {
      // Fallback: try to read from file system (for backwards compatibility)
      const storagePath = person.headshotUrl.replace("/storage/", "");
      const filePath = process.env.VERCEL
        ? join("/tmp", "storage", storagePath)
        : join(process.cwd(), person.headshotUrl);
      headshotDataUri = await fileToDataUri(filePath);
    }

    if (headshotDataUri) {
      // Replace headshot images - handle both <img src> and <image href> (SVG) formats
      // Replace the first remaining occurrence of speaker-photo.png for each person
      const imgSrcPattern = /src="assets\/speaker-photo\.png"/;
      const svgHrefPattern = /href="assets\/speaker-photo\.png"/;
      
      if (html.match(imgSrcPattern)) {
        html = html.replace(imgSrcPattern, `src="${headshotDataUri}"`);
      } else if (html.match(svgHrefPattern)) {
        html = html.replace(svgHrefPattern, `href="${headshotDataUri}"`);
      }
    }
  }

  // Inject CSS variables for colors
  const styleTag = `
    <style>
      :root {
        --primary: ${submission.primaryColor};
        --secondary: ${submission.secondaryColor};
      }
    </style>
  `;
  html = html.replace("</head>", `${styleTag}</head>`);

  return html;
}

