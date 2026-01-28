import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lightenColor } from "@/lib/utils";
import { getTemplateConfig } from "@/lib/template-registry";
import sharp from "sharp";
import { selectComponentsWithWordMatch } from "@/lib/blog-image-generator";
import { loadComponentsFromFigma, getComponentImageUrl } from "@/lib/component-registry";
import { ComponentInfo } from "@/lib/blog-image-rules";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !session.user.email.endsWith("@botpress.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const templateFamily = (formData.get("templateFamily") as string) || "mtl-code";
    
    // Handle blog-image-generator specially
    if (templateFamily === "blog-image-generator") {
      const blogTitle = formData.get("blogTitle") as string;
      const keywords = formData.get("keywords") as string || blogTitle;
      
      if (!blogTitle) {
        return NextResponse.json({ error: "Blog title is required" }, { status: 400 });
      }

      // Load Figma components
      const figmaFileId = process.env.FIGMA_FILE_ID;
      if (!figmaFileId) {
        return NextResponse.json({ error: "FIGMA_FILE_ID not configured" }, { status: 500 });
      }

      let components: ComponentInfo[];
      try {
        components = await loadComponentsFromFigma(figmaFileId);
      } catch (error) {
        console.error("Error loading components from Figma:", error);
        return NextResponse.json({ 
          error: "Failed to load components from Figma",
          details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }

      if (components.length === 0) {
        return NextResponse.json({ error: "No components found in Figma file" }, { status: 400 });
      }
      
      // Select components using word matching (without image URLs first to avoid rate limits)
      let selection;
      try {
        selection = selectComponentsWithWordMatch(blogTitle, keywords, components);
      } catch (error) {
        console.error("Error selecting components:", error);
        return NextResponse.json({ 
          error: "Failed to select components",
          details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }

      // Now fetch image URLs only for selected components (much fewer API calls)
      const selectedComponentNames = [
        selection.background,
        selection.mainImage,
        ...selection.supportingImages
      ];
      
      const selectedComponents = components.filter(c => 
        selectedComponentNames.includes(c.name)
      );

      let componentsWithImages: ComponentInfo[];
      try {
        // Add a small delay between requests to avoid rate limiting
        componentsWithImages = [];
        for (const comp of selectedComponents) {
          const nodeId = comp.figmaNodeId || comp.id;
          const imageUrl = await getComponentImageUrl(figmaFileId, nodeId, "png");
          componentsWithImages.push({
            ...comp,
            imageUrl,
          });
          // Small delay to avoid rate limiting (50ms between requests)
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Also include all components (without images) for reference
        const allComponentsWithSelectedImages = components.map(comp => {
          const selected = componentsWithImages.find(c => c.id === comp.id);
          return selected || comp;
        });
        
        componentsWithImages = allComponentsWithSelectedImages;
      } catch (error) {
        console.error("Error fetching component image URLs:", error);
        return NextResponse.json({ 
          error: "Failed to fetch component images",
          details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }

      // Create submission with selected component data
      const submission = await prisma.submission.create({
        data: {
          ownerEmail: session.user.email,
          templateFamily: "blog-image-generator",
          templateVariant: "blog-image-generator-1",
          primaryColor: "#000000",
          secondaryColor: "#000000",
          scale: 1,
          formats: JSON.stringify(["png"]),
          eventTitle: blogTitle,
          venueName: "",
          addressLine: "",
          cityLine: "",
          eventDate: new Date(),
          doorTime: "",
          people: JSON.stringify([]),
          uploadUrls: JSON.stringify({
            selection: selection,
            components: componentsWithImages,
          }),
        },
      });

      // Trigger rendering (async)
      const cookies = req.headers.get("cookie") || "";
      fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/render`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies,
        },
        body: JSON.stringify({ submissionId: submission.id }),
      });

      return NextResponse.json({ submissionId: submission.id });
    }

    // Regular template handling
    const primaryColor = formData.get("primaryColor") as string;
    const peopleCount = formData.get("peopleCount") as string;
    const scale = parseInt(formData.get("scale") as string);
    // Get all formats from form data
    const formats = formData.getAll("formats") as string[];
    if (!formats || formats.length === 0) {
      return NextResponse.json({ error: "At least one format must be selected" }, { status: 400 });
    }
    
    // Get config to determine which fields are available
    const config = await getTemplateConfig(templateFamily);
    
    // Collect all dynamic text/date/time fields from form data
    const dynamicFields: Record<string, string | Date> = {};
    if (config) {
      for (const field of config.fields) {
        if (field.type === "text" || field.type === "time") {
          const value = formData.get(field.name) as string;
          if (value) {
            dynamicFields[field.name] = value;
          }
        } else if (field.type === "date") {
          const value = formData.get(field.name) as string;
          if (value) {
            // Store as ISO string for JSON serialization
            dynamicFields[field.name] = new Date(value).toISOString();
          }
        }
      }
    }
    
    // Backwards compatibility: use hardcoded fields if they exist, otherwise use defaults
    const eventTitle = (formData.get("eventTitle") as string) || dynamicFields.eventTitle as string || "";
    const eventDateValue = formData.get("eventDate") as string;
    const eventDate = eventDateValue ? new Date(eventDateValue) : (dynamicFields.eventDate as Date || new Date());
    const doorTime = (formData.get("doorTime") as string) || dynamicFields.doorTime as string || "18:00";
    
    // Get address from config (config already loaded above)
    const venueName = config?.address?.venueName || "Botpress HQ";
    const addressLine = config?.address?.addressLine || "400 Blvd. De Maisonneuve Ouest";
    const cityLine = config?.address?.cityLine || "Montreal, QC  H3A 1L4";

    // Safely parse peopleCount, defaulting to 0 if missing/invalid
    const peopleCountNum = peopleCount ? parseInt(peopleCount) || 0 : 0;
    const people = [];
    const uploadUrls = [];

    // Process each person (only if peopleCount > 0)
    for (let i = 0; i < peopleCountNum; i++) {
      const headshot = formData.get(`headshot_${i}`) as File;
      const name = formData.get(`person_${i}_name`) as string;
      const role = formData.get(`person_${i}_role`) as string;
      const talkTitle = formData.get(`person_${i}_talkTitle`) as string;

      if (!headshot || !name || !role || !talkTitle) {
        return NextResponse.json(
          { error: `Missing data for person ${i + 1}` },
          { status: 400 }
        );
      }

      // Convert headshot to base64 for storage (works in both local and Vercel)
      // First, compress and resize the image to reduce file size
      const bytes = await headshot.arrayBuffer();
      const inputBuffer = Buffer.from(bytes);
      
      // Resize to max 800x800 (maintains aspect ratio) and compress
      const compressedBuffer = await sharp(inputBuffer)
        .resize(800, 800, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, mozjpeg: true }) // Convert to JPEG for better compression
        .toBuffer();
      
      const mimeType = "image/jpeg";
      const base64 = compressedBuffer.toString("base64");
      const headshotDataUri = `data:${mimeType};base64,${base64}`;

      // Store as data URI instead of file path (works in serverless)
      const uploadUrl = headshotDataUri;
      uploadUrls.push(uploadUrl);

      people.push({
        name,
        role,
        talkTitle,
        headshotUrl: uploadUrl, // Now contains base64 data URI
      });
    }

    // Process standalone image fields (e.g., logo, svgLogo)
    const imageUploads: Record<string, string> = {};
    if (config) {
      for (const field of config.fields) {
        if (field.type === "image" && field.name !== "headshot") {
          const imageFile = formData.get(field.name) as File;
          if (imageFile) {
            // Convert to base64 data URI
            const bytes = await imageFile.arrayBuffer();
            const inputBuffer = Buffer.from(bytes);
            
            // For SVG, keep as-is. For other images, compress with sharp
            let mimeType = imageFile.type;
            let base64: string;
            
            if (imageFile.type === "image/svg+xml") {
              // SVG: read as text and convert to base64
              const svgText = inputBuffer.toString("utf-8");
              base64 = Buffer.from(svgText).toString("base64");
              mimeType = "image/svg+xml";
            } else {
              // Other images: compress with sharp
              const compressedBuffer = await sharp(inputBuffer)
                .resize(2000, 2000, {
                  fit: "inside",
                  withoutEnlargement: true,
                })
                .jpeg({ quality: 90, mozjpeg: true })
                .toBuffer();
              base64 = compressedBuffer.toString("base64");
              mimeType = "image/jpeg";
            }
            
            imageUploads[field.name] = `data:${mimeType};base64,${base64}`;
          }
        }
      }
    }

    const secondaryColor = lightenColor(primaryColor, 15);
    // For templates without people, use variant "1" (default)
    // For templates with people, use the people count as variant
    const templateVariant = peopleCountNum > 0 
      ? `${templateFamily}-${peopleCount}` 
      : `${templateFamily}-1`;

    // Merge standalone image uploads into uploadUrls array format
    // The template engine expects uploadUrls as array, but we'll also store imageUploads
    // in a way it can access. For now, we'll store them in a separate JSON field or
    // pass them through the render API. Let's use a simple approach: store in uploadUrls
    // with a special format that the template engine can parse.
    
    // Create submission record
    const submission = await prisma.submission.create({
      data: {
        ownerEmail: session.user.email,
        templateFamily,
        templateVariant,
        primaryColor,
        secondaryColor,
        scale,
        formats: JSON.stringify(formats),
        eventTitle,
        venueName,
        addressLine,
        cityLine,
        eventDate,
        doorTime,
        people: JSON.stringify(people),
        uploadUrls: JSON.stringify({
          headshots: uploadUrls,
          images: imageUploads, // Standalone image uploads (logo, etc.)
          fields: dynamicFields, // Dynamic text/date/time fields
        }),
      },
    });

    // Trigger rendering (async) - pass cookies for authentication
    const cookies = req.headers.get("cookie") || "";
    fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({ submissionId: submission.id }),
    });

    return NextResponse.json({ submissionId: submission.id });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

