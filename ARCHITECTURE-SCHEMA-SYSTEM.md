# Schema-Driven Template System Architecture (Node-Based)

## Overview
A node-based template system where designs from Figma/Illustrator are converted to editable node graphs with constraints, then compiled to HTML for Puppeteer rendering.

---

## Core Concept

**Current System**: HTML string replacement → Find/replace patterns in HTML
**Schema System**: Node-based template graph → Compile to HTML → Render with Puppeteer

**Key Shift**: Move from "replace strings in HTML" to "editable nodes with constraints"

---

## Critical Architecture Changes

### 1. Node-Based Template Schema (Not String Replacement)

**Problem with Current Approach**:
- String replacement breaks with inconsistent layer naming
- Text flow/line breaks/auto-layout not handled
- Colors in gradients/effects/opacity not just hex values
- Layout variants require separate HTML files

**Solution: Node-Based Schema**

```typescript
interface TemplateNode {
  id: string
  type: "text" | "image" | "shape" | "group" | "container"
  
  // Geometry
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex: number
  
  // Constraints
  constraints: {
    horizontal: "pin-left" | "pin-right" | "scale" | "pin-center"
    vertical: "pin-top" | "pin-bottom" | "scale" | "pin-center"
  }
  
  // Style (Token-Based, Not Hex)
  style: {
    fill?: { token: "primary" | "secondary" | "background" | string, locked?: boolean }
    stroke?: { token: string, width?: number }
    opacity?: number
    effects?: Array<{ type: "shadow" | "blur", ... }>
  }
  
  // Editable Bindings
  binding?: {
    field: string              // "eventTitle", "speaker[0].name"
    type: "text" | "image" | "color"
  }
  
  // Text-Specific
  text?: {
    content: string            // Placeholder or bound value
    fontFamily: string
    fontSize: number
    fontWeight: number
    lineHeight: number
    textAlign: "left" | "center" | "right"
    maxLines?: number
    truncate?: "ellipsis" | "clip"
    autoFit?: { min: number, max: number }  // Scale font to fit
    reflow?: "grow-down" | "grow-up" | "fixed"  // Layout behavior
  }
  
  // Image-Specific
  image?: {
    src?: string              // Placeholder or bound value
    fit: "cover" | "contain" | "fill" | "none"
    focalPoint?: { x: number, y: number }  // 0-1 normalized
    mask?: {
      type: "rounded" | "blob" | "custom"
      borderRadius?: number
      path?: string           // SVG path for custom mask
    }
  }
  
  // Children (for groups/containers)
  children?: TemplateNode[]
}

interface TemplateSchema {
  name: string
  title: string
  dimensions: { width: number, height: number }
  
  // Node Graph (Source of Truth)
  nodes: TemplateNode[]
  
  // Color Tokens
  tokens: {
    primary: { default: string, editable: boolean }
    secondary: { default: string, editable: boolean }
    background: { default: string, editable: boolean }
    [key: string]: { default: string, editable: boolean }
  }
  
  // Variants (Overrides, Not Separate Files)
  variants: Array<{
    id: string
    name: string
    overrides: Array<{
      nodeId: string
      operation: "hide" | "show" | "move" | "swap" | "constraint"
      value: any
    }>
  }>
  
  // Field Definitions (for form generation)
  fields: SchemaField[]
}
```

---

### 2. Variants as Overrides (Not Separate HTML Files)

**Current Problem**: `template-1.html`, `template-2.html`, `template-3.html` = maintenance nightmare

**Solution**: Single node graph + variant overrides

```typescript
// Base template
nodes: [
  { id: "speaker1", type: "group", ... },
  { id: "speaker2", type: "group", ... },
  { id: "speaker3", type: "group", ... }
]

// Variant: 1 speaker
variant: {
  id: "1",
  overrides: [
    { nodeId: "speaker2", operation: "hide" },
    { nodeId: "speaker3", operation: "hide" }
  ]
}

// Variant: 2 speakers
variant: {
  id: "2",
  overrides: [
    { nodeId: "speaker3", operation: "hide" }
  ]
}
```

**Benefits**:
- Single source of truth
- Easy to add new variants
- No duplicate HTML files

---

### 3. Token-Based Color System (Not Hex Replacement)

**Current Problem**: `colorReplacements: { "#B5DAFF": "secondaryColor" }` breaks with:
- RGBA colors
- Gradients
- Effects/shadows
- Style variables

**Solution**: Token-based styling

```typescript
// Node style uses tokens
{
  id: "header",
  style: {
    fill: { token: "primary" },  // Not hex!
    stroke: { token: "secondary" }
  }
}

// User edits token value
tokens: {
  primary: { default: "#3D9DFF", editable: true },
  secondary: { default: "#B5DAFF", editable: true }
}

// Compilation: Replace token → actual color
// Handles gradients, effects, etc.
```

**Import Process**:
1. Figma plugin detects fills/strokes
2. Maps to tokens (or asks user to map)
3. Stores as `{ token: "primary" }` not `{ hex: "#3D9DFF" }`
4. Some nodes can be "locked" (not tokenized)

---

### 4. Text Areas with Layout Rules

**Current Problem**: Text replacement can overflow, break layout

**Solution**: Text box model in schema

```typescript
{
  id: "eventTitle",
  type: "text",
  text: {
    content: "{{eventTitle}}",
    fontSize: 50,
    maxLines: 2,
    truncate: "ellipsis",
    autoFit: { min: 30, max: 50 },  // Scale down if needed
    reflow: "grow-down",            // This block grows, others pinned
    textAlign: "center"
  },
  constraints: {
    horizontal: "pin-center",
    vertical: "pin-top"
  }
}
```

**Compilation**: Generate CSS with:
- `overflow: hidden`
- `text-overflow: ellipsis`
- `line-clamp`
- Auto-fit font scaling (JS or CSS)

---

### 5. Image Slots with Fit/Crop Controls

**Current Problem**: Images placed randomly, no control

**Solution**: Image slot specification

```typescript
{
  id: "speakerHeadshot",
  type: "image",
  image: {
    src: "{{speaker[0].headshot}}",
    fit: "cover",                    // cover | contain | fill
    focalPoint: { x: 0.5, y: 0.3 }, // Face detection or manual
    mask: {
      type: "rounded",
      borderRadius: 999
    }
  },
  constraints: {
    horizontal: "pin-right",
    vertical: "pin-center"
  }
}
```

**Compilation**: Generate CSS with:
- `object-fit: cover`
- `object-position` from focalPoint
- Mask/clip-path from mask definition

---

### 6. Figma Plugin Approach (Not Direct Import)

**Figma Plugin Exports**:
```typescript
{
  nodes: [
    {
      id: "node-123",
      type: "text",
      name: "{{eventTitle}}",  // Designer names layer with binding
      geometry: { x, y, w, h },
      style: { fill: { token: "primary" } },
      text: { content, fontSize, ... }
    }
  ],
  assets: [...],
  variants: [
    {
      frame: "1 Speaker",
      overrides: [...]
    }
  ]
}
```

**Illustrator**: Accept SVG/PDF export → Parse → Same node structure
- Don't try to parse native .ai files
- Require export to SVG/PDF
- User maps layers to bindings in UI

---

### 7. Object Storage (Not Base64 in DB)

**Current**: Base64 in database
**Problem**: DB bloat, slow queries, expensive

**Solution**: 
- Metadata in DB (node graph, bindings, tokens)
- Assets in S3/R2 (images, fonts, outputs)
- Signed URLs for access

```typescript
// Database
Submission {
  id: string
  templateId: string
  data: JSON              // Form data (small)
  outputUrls: string[]   // S3 URLs, not base64
}

// S3/R2
s3://bucket/templates/{templateId}/assets/logo.svg
s3://bucket/outputs/{submissionId}/poster.png
```

---

### 8. Render Queue (Not Direct Rendering)

**Current**: Direct Puppeteer render on submit
**Problem**: Timeouts, cold starts, memory issues

**Solution**: Job queue system

```typescript
// Submit creates job
RenderJob {
  id: string
  submissionId: string
  status: "pending" | "processing" | "completed" | "failed"
  retries: number
  createdAt: DateTime
}

// Worker processes queue
- Polls for pending jobs
- Renders with Puppeteer
- Uploads to S3
- Updates job status
- Retries on failure
```

**Benefits**:
- Handles timeouts gracefully
- Can scale workers
- Idempotent renders
- Caching by hash(config+data)

---

## Architecture Layers (Updated)

### 1. Import Layer (Figma/Illustrator → Node Graph)

**Figma Plugin**:
- Reads Figma API
- Extracts nodes (positions, styles, text)
- Detects bindings from layer names (`{{eventTitle}}`)
- Maps colors to tokens
- Exports node graph JSON

**Illustrator Adapter**:
- Accepts SVG/PDF export
- Parses to node structure
- User maps layers to bindings
- Same output format

### 2. Template Editor (Node Graph → Refined Schema)

**Location**: `app/admin/templates/{id}/edit`

**Features**:
- Visual node editor
- Map tokens (Primary/Secondary/Background)
- Confirm bindings for text/image slots
- Define variants (show/hide/move nodes)
- Set text/image constraints
- Preview compiled HTML

### 3. Schema Registry (Node Graph Storage)

**Location**: `lib/schema-registry.ts`

**Storage**:
- Node graph in database (not files)
- Assets in S3/R2
- Cached for performance

### 4. Compiler (Node Graph → HTML)

**Location**: `lib/node-to-html-compiler.ts`

**Process**:
1. Load node graph
2. Apply variant overrides
3. Resolve tokens → colors
4. Apply bindings (form data → node content)
5. Generate HTML + CSS
6. Handle constraints (flexbox/grid)
7. Apply text/image rules

**Output**: HTML string (ready for Puppeteer)

### 5. Render Queue

**Location**: `lib/render-queue.ts` + `app/api/render/worker.ts`

**Process**:
1. Submit creates render job
2. Worker picks up job
3. Compiles node graph → HTML
4. Puppeteer renders
5. Uploads to S3
6. Updates job status

---

## Updated Schema Definition

```typescript
interface TemplateSchema {
  // Identity
  id: string
  name: string
  title: string
  userId: string              // Multi-tenant
  isPublic: boolean
  
  // Dimensions
  dimensions: {
    width: number
    height: number
  }
  
  // Node Graph (Source of Truth)
  nodes: TemplateNode[]
  
  // Color Tokens
  tokens: Record<string, {
    default: string
    editable: boolean
    locked?: boolean           // Can't be changed
  }>
  
  // Variants (Overrides)
  variants: Array<{
    id: string
    name: string
    overrides: VariantOverride[]
  }>
  
  // Field Definitions (for form generation)
  fields: SchemaField[]
  
  // Assets (S3 URLs)
  assets: {
    images: string[]           // S3 URLs
    fonts: string[]           // S3 URLs
  }
}
```

---

## Migration Path

### Phase 1: Node Graph Foundation
- Define `TemplateNode` interface
- Build node-to-HTML compiler
- Keep current HTML templates (compile to node graph manually)
- Test compilation pipeline

### Phase 2: Figma Plugin
- Build Figma plugin
- Export to node graph format
- Template editor UI for mapping
- Import flow

### Phase 3: Variant System
- Implement variant overrides
- Update compiler to handle variants
- Remove separate HTML files

### Phase 4: Token System
- Replace hex colors with tokens
- Update compiler to resolve tokens
- Template editor for token mapping

### Phase 5: Object Storage
- Move assets to S3/R2
- Update storage routes
- Keep metadata in DB

### Phase 6: Render Queue
- Build job queue system
- Worker process
- Retry logic
- Caching

---

## Key Benefits

1. **Scalable**: Node graph handles any layout
2. **Reliable**: Constraints prevent layout breaks
3. **Flexible**: Variants as overrides, not duplicates
4. **Maintainable**: Single source of truth
5. **Import-Friendly**: Figma/Illustrator → Node graph is natural
6. **Performance**: Object storage, render queue, caching

---

## Implementation Priority

1. **Node Graph Schema** (Foundation)
2. **Node-to-HTML Compiler** (Core)
3. **Figma Plugin** (Import)
4. **Template Editor** (Refinement)
5. **Variant System** (Overrides)
6. **Token System** (Colors)
7. **Object Storage** (Scale)
8. **Render Queue** (Reliability)
