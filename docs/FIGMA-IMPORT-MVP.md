# Figma Import MVP - Phase 3

This is the basic MVP for importing templates from Figma. It supports:
- **Flexible binding names** - Use any `{{bindingName}}` you want
- **Auto-detected field types** - Text, date, and image upload fields
- **Static SVGs** - Hardcoded SVGs that appear automatically
- **Multiple variants** - Export twice for different versions (e.g., with/without header)
- **User upload fields** - SVGs that users upload via the form

## Component Flow: JSON → Template

This diagram shows the complete flow from a Figma export JSON to a working template:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. JSON Example File                                            │
│    examples/december-layout-export.json                         │
│    - Contains: name, width, height, nodes[], images{}           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Import API Endpoint                                          │
│    app/api/import/figma/route.ts                                │
│    - Validates JSON structure                                   │
│    - Authenticates user                                         │
│    - Calls generateTemplateFromFigma()                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Figma Template Generator                                     │
│    lib/figma-template-generator.ts                              │
│    ┌───────────────────────────────────────────────────────── ┐ │
│    │ generateTemplateFromFigma()                              │ │
│    │  ├─ generateConfig() → config.json                       │ │
│    │  │   - Extracts bindings from node names                 │ │
│    │  │   - Creates field definitions                         │ │
│    │  │   - Sets template metadata                            │ │
│    │  │                                                        │ │
│    │  └─ generateHTMLTemplate() → template-1.html            │ │
│    │      - Converts nodes to HTML                            │ │
│    │      - Handles positioning, styling                      │ │
│    │      - Replaces bindings with {{fieldName}}              │ │
│    └─────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Database Storage                                             │
│    Prisma Template Model                                        │
│    - configJson: string (config.json content)                  │
│    - htmlContent: string (template-1.html content)              │
│    - htmlVariant2: string (template-2.html if exists)          │
│    - htmlVariant3: string (template-3.html if exists)           │
│    - width, height, format, etc.                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Template Registry                                            │
│    lib/template-registry.ts                                     │
│    - getTemplateConfig() → loads config.json from DB            │
│    - getAllTemplateConfigs() → lists all templates              │
│    - Checks database first, filesystem fallback                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Dynamic Form Generator                                       │
│    components/forms/DynamicForm.tsx                              │
│    - Reads config.json                                          │
│    - Builds Zod schema from fields                              │
│    - Renders form inputs (text, date, image, color, etc.)       │
│    - Handles form submission                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Template Engine                                              │
│    lib/template-engine.ts                                        │
│    - renderTemplateWithConfig()                                 │
│    - Loads HTML from database (htmlContent/htmlVariant2/etc.) │
│    - Replaces {{fieldName}} with actual values                  │
│    - Processes colors, images, text                             │
│    - Returns final HTML                                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Render API                                                   │
│    app/api/render/route.ts                                      │
│    - Takes rendered HTML                                        │
│    - Uses Puppeteer to generate images (PNG, JPG, PDF, etc.)   │
│    - Stores outputs in database                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

**1. Figma Export JSON** (`examples/december-layout-export.json`)
   - **Type**: `FigmaExport` (defined in `lib/figma-import-types.ts`)
   - **Contains**: `name`, `width`, `height`, `nodes[]`, `images{}`

**2. Import API** (`app/api/import/figma/route.ts`)
   - **Role**: Entry point for importing
   - **Validates**: JSON structure
   - **Calls**: `generateTemplateFromFigma()`

**3. Figma Template Generator** (`lib/figma-template-generator.ts`)
   - **Main Function**: `generateTemplateFromFigma()`
   - **Two Key Functions**:
     - `generateConfig()` - Creates `config.json` structure
     - `generateHTMLTemplate()` - Creates `template-1.html`
   - **Output**: Stores in database (Prisma)

**4. Type Definitions** (`lib/figma-import-types.ts`)
   - `FigmaExport` - Top-level export structure
   - `FigmaExportNode` - Individual node structure
   - `FigmaImportResult` - Return type from generator

**5. Template Registry** (`lib/template-registry.ts`)
   - **Role**: Loads templates from database/filesystem
   - **Used by**: Forms, template engine, UI

**6. Template Engine** (`lib/template-engine.ts`)
   - **Role**: Renders HTML with actual data
   - **Loads**: HTML from database
   - **Replaces**: `{{fieldName}}` placeholders

### Current Flow Summary

**JSON → Generator → Database → Registry → Form → Engine → Render**

1. **JSON** (`december-layout-export.json`)
2. **Generator** (`figma-template-generator.ts`) - Creates config + HTML
3. **Database** (Prisma) - Stores config + HTML
4. **Registry** (`template-registry.ts`) - Loads config
5. **Form** (`DynamicForm.tsx`) - Uses config to build form
6. **Engine** (`template-engine.ts`) - Uses HTML + data to render
7. **Render** (`app/api/render/route.ts`) - Generates final images

### What Needs to Change for Perfect Schema

Currently, `figma-template-generator.ts` has hardcoded rules. With a perfect schema:

1. **JSON** includes metadata (layout, textBehavior, colorSource, etc.)
2. **Generator** reads metadata instead of guessing
3. **No hardcoded rules** - everything comes from JSON

The generator becomes a simple translator: **JSON metadata → HTML**

## How It Works

1. **Figma Export Format**: Export your Figma design as JSON with this structure
2. **Binding Detection**: Name layers with `{{fieldName}}` to create form fields
3. **Template Generation**: API generates `config.json` and `template-1.html` automatically

## Figma Layer Naming Convention

**You have full control over binding names!** Use any name you want with the `{{bindingName}}` format.

### How It Works

1. **Name your layers** with `{{yourBindingName}}` format
2. **Field type is auto-detected** based on node type:
   - `TEXT` nodes → Text field (or Date field if name contains "date")
   - `RECTANGLE`, `VECTOR`, `COMPONENT`, `INSTANCE` → Image upload field
3. **Field labels are auto-generated** from binding names (e.g., `{{eventTitle}}` → "Event Title")

### Examples

**Text Fields:**
- `{{eventTitle}}` → Text field labeled "Event Title"
- `{{headerCopy}}` → Text field labeled "Header Copy"
- `{{subtitle}}` → Text field labeled "Subtitle"
- `{{description}}` → Text field labeled "Description"

**Date Fields:**
- `{{eventDate}}` → Date field (auto-detected because name contains "date")
- `{{startDate}}` → Date field
- `{{month}}` → Date field (if name contains "date")

**Image Upload Fields:**
- `{{logo}}` → Image upload field labeled "Logo"
- `{{svgLogo}}` → Image upload field labeled "Svg Logo"
- `{{companyLogo}}` → Image upload field labeled "Company Logo"
- `{{backgroundImage}}` → Image upload field labeled "Background Image"

### Static SVGs (No Binding Required)

**Static SVGs are automatically included!** If you have an SVG in your Figma file that you want to appear in the template (not as an upload field), just:

1. **Place the SVG** in your Figma design (as VECTOR, RECTANGLE with image fill, or COMPONENT)
2. **Don't add a binding** (no `{{name}}` needed)
3. **Export it** in your JSON with the `imageRef` pointing to the SVG data
4. **It will appear** in the template automatically

**Example:**
```json
{
  "nodes": [
    {
      "id": "decoration-1",
      "name": "Decoration",  // No binding - static SVG
      "type": "VECTOR",
      "x": 0,
      "y": 0,
      "width": 1080,
      "height": 1350,
      "fills": [
        {
          "type": "IMAGE",
          "imageRef": "decoration-svg"
        }
      ]
    }
  ],
  "images": {
    "decoration-svg": "data:image/svg+xml;base64,..."
  }
}
```

This decoration SVG will appear in your template automatically, no form field needed!

### Best Practices

- Use **camelCase** or **snake_case** for binding names
- Be descriptive: `{{eventTitle}}` is better than `{{title}}`
- For date fields, include "date" in the name for auto-detection
- For images/logos, use clear names like `{{logo}}` or `{{companyLogo}}`
- **Static SVGs**: Don't add bindings if you want them hardcoded in the template
- **Upload SVGs**: Add `{{logo}}` binding if users should upload their own
- The uploaded SVG will replace the placeholder in the template

### Multiple Variants

**To create templates with variants (e.g., with/without header):**

1. **Create variant 1** in Figma (e.g., with header)
   - Include `{{headerCopy}}` layer for header text
   - Export as JSON
   - Import via API → stored as `htmlContent` (variant 1)

2. **Create variant 2** in Figma (e.g., without header)
   - Remove or hide `{{headerCopy}}` layer
   - Export as JSON
   - Import again with **same template name**
   - **Automatically detected**: If variant 1 exists, variant 2 is stored as `htmlVariant2`
   - Config is updated to include both variants: `["1", "2"]`

3. **Update config** (manually or via database):
   - Set `variants: ["1", "2"]` in config
   - Users can select variant when creating posters

**Note**: Full variant support coming soon. For now, you can manually update the database to store both variants.

## API Endpoint

**POST** `/api/import/figma`

### Request Body

```json
{
  "name": "Simple Monthly Poster",
  "width": 1080,
  "height": 1350,
  "nodes": [
    {
      "id": "text-1",
      "name": "{{eventTitle}}",
      "type": "TEXT",
      "x": 100,
      "y": 200,
      "width": 880,
      "height": 80,
      "characters": "Event Title Placeholder",
      "style": {
        "fontFamily": "Aspekta",
        "fontSize": 64,
        "fontWeight": 700,
        "textAlign": "CENTER",
        "fill": "#000000"
      }
    },
    {
      "id": "logo-1",
      "name": "{{logo}}",
      "type": "RECTANGLE",
      "x": 50,
      "y": 50,
      "width": 200,
      "height": 100,
      "fills": [
        {
          "type": "IMAGE",
          "imageRef": "logo-image"
        }
      ]
    },
    {
      "id": "text-2",
      "name": "{{eventDate}}",
      "type": "TEXT",
      "x": 100,
      "y": 400,
      "width": 880,
      "height": 120,
      "characters": "January",
      "style": {
        "fontFamily": "Aspekta",
        "fontSize": 96,
        "fontWeight": 700,
        "textAlign": "CENTER",
        "fill": "#3D9DFF"
      }
    }
  ],
  "images": {
    "logo-image": "data:image/svg+xml;base64,..."
  }
}
```

### Response

```json
{
  "success": true,
  "templateId": "simple-monthly-poster",
  "templatePath": "/path/to/templates/simple-monthly-poster",
  "configPath": "/path/to/templates/simple-monthly-poster/config.json",
  "htmlPath": "/path/to/templates/simple-monthly-poster/template-1.html",
  "message": "Template \"Simple Monthly Poster\" created successfully!"
}
```

## Getting v0 from the Figma API

Use this to start the "one real template → export everything → v0 config" loop. No plugin required.

1. **Token**  
   Figma → Settings → Account → [Personal access tokens](https://www.figma.com/developers/api#access-tokens). Create one. Add to `.env`:  
   `FIGMA_ACCESS_TOKEN=your_token`

2. **File key**  
   From the Figma file URL: `figma.com/file/abc123/MyFile` → file key is `abc123`.

3. **Export raw file**  
   One file key = one Figma file (all pages/frames). To export a single template when you have many in one file, pass the frame’s node ID:
   ```bash
   FIGMA_FILE_KEY=abc123 bun scripts/export-figma-file.ts
   # Or only one frame:
   FIGMA_FILE_KEY=abc123 FIGMA_NODE_ID=123:456 bun scripts/export-figma-file.ts
   ```  
   Get the node ID: in Figma, right‑click the frame → **Copy link to selection** → use the `node-id=` value from the URL.  
   Writes `examples/figma-raw-<file_key>.json` (full file) and, if `FIGMA_NODE_ID` is set, `examples/figma-raw-<file_key>-<node_id>.json` (just that frame).

4. **Turn it into import format**  
   Run the converter script (it maps raw Figma nodes to the shape the import API expects):
   ```bash
   bun run figma:to-import examples/figma-raw-<file_key>-<node_id>.json
   ```
   Or with no args if you have exactly one `figma-raw-*-*.json` in `examples/`: `bun run figma:to-import`.  
   This writes `examples/figma-import-<name>.json`. To get form fields (bindings), rename layers in Figma to `{{fieldName}}` (e.g. `{{eventTitle}}`, `{{logo}}`) and re-export the frame, then run the converter again. You can also hand-edit the generated JSON or use `examples/figma-export-example.json` as a reference.

5. **Import and test**  
   ```bash
   bun run dev
   # Sign in, then:
   curl -X POST http://localhost:3000/api/import/figma \
     -H "Content-Type: application/json" \
     -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
     -d @examples/figma-import-<name>.json
   ```  
   Open the app, go to the new template, fill the form, generate. Check layout and bindings.

6. **Iterate**  
   If something’s wrong: fix the Figma file (names, structure) or your mapping (script/hand edit). Re-export from API if you changed Figma (step 3), then re-map and re-import. Repeat until the generated template matches and the config is good enough to treat as v0.

## Testing the MVP

### Quick Start (5 Steps)

1. **Run Database Migration**
   ```bash
   bun run db:push
   ```

2. **Start Dev Server**
   ```bash
   bun run dev
   ```

3. **Validate Your Export JSON**
   ```bash
   bun run test:figma
   ```
   This validates your `examples/figma-export-example.json` file.

4. **Get Your Session Token**
   - Sign in at `http://localhost:3000`
   - Open DevTools → Application → Cookies
   - Copy `next-auth.session-token` value

5. **Import Template**
   ```bash
   curl -X POST http://localhost:3000/api/import/figma \
     -H "Content-Type: application/json" \
     -H "Cookie: next-auth.session-token=YOUR_TOKEN_HERE" \
     -d @examples/figma-export-example.json
   ```

### Step-by-Step Testing Workflow

#### Step 1: Create Your Figma Design

1. Create a frame: 1080 × 1350
2. Add elements with binding names (use any names you want):
   - `{{logo}}` or `{{yourLogoName}}` - Rectangle/Image for logo upload
   - `{{eventTitle}}` or `{{yourTitleName}}` - Text for event title
   - `{{eventDate}}` or `{{yourDateName}}` - Text for date/month
   - Static SVGs (no binding) - Will appear automatically
3. For variants (e.g., with/without header):
   - Create variant 1 with `{{headerCopy}}` layer
   - Create variant 2 without `{{headerCopy}}` layer
   - Export both separately
4. Note positions, sizes, and styles for each element

#### Step 2: Create Export JSON

1. Copy `examples/figma-export-example.json` as starting point
2. Update with your Figma values:
   - Name, width, height
   - Node positions (x, y, width, height)
   - Text styles (fontFamily, fontSize, fontWeight, fill)
   - Layer names with `{{bindingName}}` format

#### Step 3: Validate Export

```bash
bun run test:figma
```

Checks: Valid JSON structure, required fields, bindings detected, missing bindings.

#### Step 4: Import Template

```bash
curl -X POST http://localhost:3000/api/import/figma \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN_HERE" \
  -d @your-export.json
```

Expected response:
```json
{
  "success": true,
  "templateId": "simple-monthly-poster",
  "message": "Template created successfully in database!"
}
```

#### Step 5: Verify Template

1. **Check template list**: `http://localhost:3000/templates` - Your template should appear
2. **Check database**: `bun run db:studio` - Open Template table, verify template exists
3. **Test form**: `http://localhost:3000/templates/{template-id}/create` - Should show form with your fields

#### Step 6: Test Rendering

1. Fill out the form (Event Title, Date, Color)
2. Click "Generate"
3. Check result: Event title in correct position, month name displayed, layout matches Figma

#### Step 7: Create Second Variant (Optional)

If you want two variants (e.g., with/without header):
1. Export variant 2 from Figma (without header layer)
2. Import again with same template name
3. System will store as `htmlVariant2` in database
4. Update config to include both variants: `"variants": ["1", "2"]`
5. Users can select variant when creating posters

#### Step 8: Iterate and Re-Import

If something's wrong:
1. Update your export JSON with corrected values
2. Re-run the import (same template ID = update)
3. Test again
4. Repeat until perfect

### Using curl

```bash
curl -X POST http://localhost:3000/api/import/figma \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d @examples/figma-export-example.json
```

### Using Browser DevTools

1. Open your app in browser (signed in)
2. Open DevTools (F12) → Console tab
3. Run:
   ```javascript
   fetch('/api/import/figma', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       name: "My Template",
       width: 1080,
       height: 1350,
       nodes: [...]
     })
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error);
   ```

### Verification Checklist

After importing, verify:
- [ ] Template appears in `/templates` page
- [ ] Can access `/templates/{template-id}/create`
- [ ] Form shows correct fields (eventTitle, eventDate, primaryColor)
- [ ] Can generate a poster
- [ ] Generated poster matches Figma design

### Debug Common Issues

**Template not appearing?**
- Check database: `bun run db:studio`
- Verify import response was successful
- Check console for errors

**Wrong positions?**
- Verify X, Y, width, height in export JSON
- Check Figma frame position (should be 0, 0)
- Update export JSON and re-import

**Wrong fonts?**
- Check font family name in export JSON
- Verify font size, weight values
- Use fonts available in your template (Aspekta, etc.)

**Colors not matching?**
- Check color values in export JSON (hex format)
- Update `style.fill` in export JSON
- Check `colorReplacements` in generated config

**Bindings not working?**
- Ensure layer names have `{{bindingName}}` format
- No typos in binding names
- Config has matching field definitions

## What Gets Generated

Templates are stored in the **database** (production-ready), not the filesystem. This ensures templates persist in serverless environments like Vercel.

### Database Storage

Templates are stored in the `Template` Prisma model:
- **`configJson`**: Full config.json as JSON string
- **`htmlContent`**: HTML template for variant 1
- **`htmlVariant2`**: HTML template for variant 2 (if needed)
- **`htmlVariant3`**: HTML template for variant 3 (if needed)
- **`family`**: Template ID (e.g., "simple-monthly-poster")
- **`name`**, **`width`**, **`height`**, **`format`**: Template metadata

### config.json Structure

```json
{
  "id": "simple-monthly-poster",
  "name": "Simple Monthly Poster",
  "width": 1080,
  "height": 1350,
  "variants": ["1"],
  "format": "html",
  "fields": [
    {
      "type": "text",
      "name": "eventTitle",
      "label": "Event Title",
      "placeholder": "Enter event title",
      "maxLength": 100,
      "replacements": [
        { "pattern": "{{eventTitle}}", "type": "text" }
      ]
    },
    {
      "type": "date",
      "name": "eventDate",
      "label": "Event Date",
      "format": "MMMM",
      "locale": "en",
      "replacements": [
        { "pattern": "{{eventDate}}", "type": "date" }
      ]
    },
    {
      "type": "color",
      "name": "primaryColor",
      "label": "Primary Color",
      "default": "#3D9DFF",
      "replacements": [
        { "pattern": "#3D9DFF", "type": "color" }
      ]
    }
  ],
  "assets": {
    "logo": {
      "default": "mtl-code-wide.svg",
      "swap": {}
    }
  },
  "colorReplacements": {}
}
```

### template-1.html

An HTML template with:
- Absolute positioned elements matching Figma layout
- Placeholders for `{{eventTitle}}` and `{{eventDate}}`
- Logo placeholder using `{{logo}}`
- Styles extracted from Figma (fonts, sizes, colors)

### Template Registry Behavior

The template registry checks in this order:
1. **Database first** (for Figma imports and production)
2. **Filesystem fallback** (for existing templates and development)

This ensures:
- ✅ New Figma imports work in production
- ✅ Existing templates continue to work
- ✅ Development workflow unchanged

## Limitations (MVP)

- ✅ Supports basic text nodes with bindings (flexible naming)
- ✅ Supports logo/image upload fields
- ✅ Supports static SVGs (hardcoded, no binding needed)
- ✅ Extracts font styles (family, size, weight, color, alignment)
- ✅ Generates HTML templates (not node graphs yet)
- ✅ **Stores templates in database** (production-ready)
- ✅ **Works in serverless environments** (Vercel, etc.)
- ✅ **Supports multiple variants** (export twice, stored as variant 1 & 2)
- ❌ No support for complex layouts (flexbox, grid)
- ❌ No support for gradients or effects
- ❌ No automatic variant detection (must export separately)
- ❌ No support for advanced node types (complex shapes, paths, etc.)

## Getting Values from Figma

1. **Position & Size**: 
   - Select layer → Check Properties panel → Note X, Y, Width, Height
   - Or use Figma's "Copy as CSS" to get position

2. **Text Styles**:
   - Select text layer → Check Text properties
   - Font Family: Check font dropdown
   - Font Size: Check size input
   - Font Weight: Check weight dropdown (400 = Regular, 700 = Bold)
   - Color: Check fill color (convert to hex)

3. **Layer Names**:
   - Double-click layer name → Rename with `{{bindingName}}`

## Export JSON Template

```json
{
  "name": "My Template",
  "width": 1080,
  "height": 1350,
  "nodes": [
    {
      "id": "frame-1",
      "name": "Frame",
      "type": "FRAME",
      "x": 0,
      "y": 0,
      "width": 1080,
      "height": 1350,
      "children": [
        {
          "id": "text-1",
          "name": "{{eventTitle}}",
          "type": "TEXT",
          "x": 100,
          "y": 200,
          "width": 880,
          "height": 80,
          "characters": "Placeholder",
          "style": {
            "fontFamily": "Aspekta",
            "fontSize": 64,
            "fontWeight": 700,
            "textAlign": "CENTER",
            "fill": "#000000"
          }
        }
      ]
    }
  ],
  "images": {}
}
```

## Next Steps

1. **Figma Plugin**: Create actual Figma plugin to export this format
2. **UI Import Page**: Create `/app/admin/templates/import/figma` page
3. **Enhanced Export**: Support more node types and properties
4. **Node Graph Export**: Option to export as node graph instead of HTML
5. **Perfect Schema**: Define export schema with metadata to eliminate hardcoded rules (see MIGRATION-ROADMAP.md Step 1)

## Roadmap Alignment

The design-tool strategy is **Figma as single source of truth**: start from one real template, export what Figma gives you (node tree, styles, constraints), then iterate. See the "Strategy: Figma as Single Source of Truth" section in `MIGRATION-ROADMAP.md`.

This MVP fits into **Phase 3: Design Tool Import** from the migration roadmap:
- ✅ Basic Figma export format
- ✅ Import API endpoint
- ✅ Database storage (production-ready)
- ⏳ Figma plugin (next step)
- ⏳ Import UI (next step)
- ⏳ Perfect export schema (Step 1 in roadmap)