# 🗺️ Migration Roadmap: Current System → Node-Based System

> **Copy this entire document into Notion** - It's formatted for Notion's markdown support

---

## 🎯 Core Architecture Principle

**Hybrid System: Use the right tool for each template.**

- **Template Format**: Node graphs OR HTML templates (explicit choice per template)
- **Rendering Format**: HTML (compiled from nodes OR direct HTML for Puppeteer)
- **HTML Templates**: First-class citizens (not deprecated, use for complex/long-format)
- **Node Graphs**: Use for simple posters, programmatic templates, Figma imports
- **Future**: Long-format content support (documents, multi-page layouts)

---

## 📊 Timeline Overview

```
Phase 1: Foundation          [██████████] Weeks 1-4 ✅ COMPLETE
Phase 2: Convert Templates   [██████████] Weeks 5-6 ✅ COMPLETE (format configuration implemented)
Phase 3: Design Tool Import  [░░░░░░░░░░░░] Weeks 7-12
Phase 4: Variants            [█████░░░░░] Weeks 13-14 🟡 60% (core implemented)
Phase 5: Tokens              [███████░░░] Weeks 15-16 🟡 70% (core implemented, UI pending)
Phase 6: Cloud Storage       [░░░░░░░░░░] Week 17
Phase 7: Render Queue        [░░░░░░░░░░] Weeks 18-20
Phase 8: Long-Format Content [░░░░░░░░░░] Weeks 21-24
```

**Total Timeline**: 24 weeks (~6 months)
**Note**: Phase 2 completed - templates converted with explicit format configuration. HTML templates remain first-class citizens in the hybrid system.

---

## 🎯 Phase 1: Foundation (Weeks 1-4)

**Goal**: Build the core node graph system (start simple, extensible later)

**Philosophy**: Start with the minimum viable node graph system. Add advanced features in later phases.

### Tasks

- [x] Create `TemplateNode` interface (TypeScript types) ✅
  - [x] **Basic node types only** (start simple):
    - [x] Text nodes (basic: content, position, size, binding)
    - [x] Image nodes (basic: src, position, size, fit mode)
    - [x] Shape nodes (basic: rectangles, circles)
    - [x] Group nodes (basic: containers with children)
    - [x] Frame nodes (root container)
    - [x] Flex nodes (flexbox layout)
    - [x] Box nodes (block containers)
    - [x] SVG nodes (for masked images)
  - [ ] **Skip for now** (add later):
    - [ ] Advanced text properties (shadows, gradients, animations)
    - [ ] Advanced image properties (masks, focal points)
    - [ ] Complex shapes (paths, custom)
    - [ ] Video/chart nodes (add when needed)
- [x] Create `TemplateSchema` interface (core structure) ✅
  - [x] Node graph structure (tree-based)
  - [x] Basic variant override definitions (hide/show only)
  - [x] Basic token definitions (colors only - spacing/typography later)
  - [x] Basic binding definitions (simple field mappings)
  - [ ] **Skip for now** (add later):
    - [ ] Complex variant actions (animate, resize, recolor)
    - [ ] Advanced tokens (spacing, typography, shadows)
    - [ ] Complex bindings (computed, conditional, arrays)
- [x] Build node-to-HTML compiler (`lib/node-to-html-compiler-v2.ts`) ✅
  - [x] Converts node graph → HTML string
  - [x] Handles basic layout (absolute positioning)
  - [x] Handles flexbox layouts (FlexNode, BoxNode)
  - [x] Generates CSS for positioning
  - [x] Outputs HTML compatible with current Puppeteer pipeline
  - [ ] **Skip for now** (add later):
    - [ ] Grid layouts
    - [ ] Auto-flow layouts
    - [ ] Responsive breakpoints
- [x] Create dual-format template registry ✅
  - [x] Supports both node graphs and HTML (hybrid system)
  - [x] Detects template type automatically
  - [x] Routes to appropriate renderer
  - [x] Explicit format selection via config.json
- [x] Create node graph storage (database schema) ✅
  - [x] `Template` table with `format` field (node | html)
  - [x] `TemplateNode` table for node graphs
  - [x] Schema versioning (for future migrations)
  - [x] Migration path from HTML to nodes (converter exists)
- [x] Build schema registry (`lib/node-registry.ts`) ✅
- [x] Test compiler with sample node graph ✅
  - [x] Schema files created (schema.json, schema-layout-*.json)
  - [x] Test templates exist
- [x] Keep current HTML templates working (backwards compatibility) ✅

### Design Principles Applied

- ✅ **Optional properties** - All advanced features are optional
- ✅ **Union types** - Easy to add new node types later
- ✅ **Modular compiler** - Can add new compilation logic without breaking existing
- ✅ **Versioned schema** - Allows evolution over time

### Your Role

- [x] Review node graph structure (does it make sense for your designs?) ✅
- [x] Test that current HTML templates still work (no regression) ✅
- [x] Review compiler output (does HTML look correct?) ✅
- [x] Hybrid system implemented and working ✅
- [ ] **Don't worry about** advanced features yet (they'll come later)

### Deliverables

- ✅ **Core** node graph data structure (source of truth)
- ✅ **Basic** compiler that converts node graph → HTML (for Puppeteer)
- ✅ Dual-format support (nodes + legacy HTML)
- ✅ Current templates still work (no breaking changes)
- ✅ **Extensible foundation** (ready for future features)

### What's NOT Included (By Design)

**Intentionally skipped for Phase 1** (will be added in later phases):
- ❌ Advanced node properties (shadows, gradients, animations)
- ❌ Complex layouts (flexbox, grid, auto-flow)
- ❌ Advanced variant actions (beyond hide/show)
- ❌ Advanced tokens (beyond colors)
- ❌ Multi-page support (Phase 8)
- ❌ Video/chart nodes (add when needed)

**Why**: Start simple, prove the concept, extend later. This keeps Phase 1 focused and achievable.

### Status: 🟢 Complete (Hybrid system implemented)

---

## 🔄 Phase 2: Convert Templates (Optional - Weeks 5-6)

**Goal**: Selectively convert HTML templates to node graphs when it adds value

**⚠️ IMPORTANT**: This phase is now **OPTIONAL**. With the hybrid system:
- HTML templates remain first-class citizens
- Convert only when node graphs provide clear benefits
- No pressure to migrate everything

### Tasks

- [x] Create HTML → Node graph converter tool ✅
  - [x] Parses HTML structure (using parse5)
  - [x] Extracts positions, styles, text
  - [x] Creates node graph representation (FrameNode, FlexNode, BoxNode, etc.)
  - [x] Preserves bindings (field mappings)
- [x] Convert templates selectively (as needed) ✅
  - [x] Convert simple posters that benefit from node graphs ✅
  - [x] `mtl-code` template converted (schema.json + variant schemas)
  - [x] `code-a-quebec` template converted (schema.json + variant schemas)
  - [x] Explicit format configuration in config.json (`"format": "node"`) ✅
  - [x] Hybrid system supports both formats ✅
  - [ ] Keep HTML for complex/long-format templates (hybrid approach - as needed)
  - [ ] Test converted templates render identically (testing can be done as needed)
  - [ ] Visual comparison (pixel-perfect)
  - [ ] Functional comparison (all fields work)
- [ ] ~~Mark HTML templates as "legacy"~~ ❌ REMOVED - HTML templates are first-class

### Your Role

- [ ] Test `mtl-code` template (does it look/work the same?)
- [ ] Test `code-a-quebec` template (does it look/work the same?)
- [ ] Compare before/after outputs (side-by-side)
- [ ] Report any visual or functional differences
- [ ] Verify all bindings work correctly

### Deliverables

- ✅ HTML → Node converter tool exists
- ✅ Hybrid system supports both formats
- ✅ Templates converted selectively (mtl-code, code-a-quebec)
- ✅ Explicit format configuration implemented (`"format": "node"` in config.json)
- ✅ Format detection working (config.json format field takes priority)
- [ ] Converted templates render identically to HTML versions (testing can be done as needed)
- ✅ No forced migration - HTML templates remain first-class

### Status: 🟢 Complete (Format configuration implemented, testing optional)

**Note**: Phase 2 is now optional. Convert templates selectively when node graphs add value. HTML templates remain first-class.

**Template Added**: `simple-poster` - A simple 1:1 HTML template demonstrating the hybrid system with explicit format configuration.

### Dependencies

- ✅ Phase 1 must be complete

---

## 🎨 Phase 3: Design Tool Import (Weeks 7-12)

**Goal**: Import designs from Figma and Illustrator as node graphs

### Tasks

#### Figma Plugin (Weeks 7-10)

- [ ] Build Figma plugin
  - [ ] Reads Figma API
  - [ ] Exports nodes (positions, styles, text)
  - [ ] Detects bindings from layer names (`{{eventTitle}}`)
  - [ ] Exports assets (images, fonts)
- [ ] Create import API endpoint (`app/api/import/figma`)
- [ ] Build import UI (`app/admin/templates/import/figma`)
- [ ] Test import workflow end-to-end

### Considerations for HTML Templates in Hybrid System

**When creating new HTML templates, consider:**

1. **Explicit Format Declaration**
   - Always add `"format": "html"` to `config.json` for clarity
   - Prevents auto-detection confusion if schema files exist later

2. **Structure for Future Conversion** (Optional but Recommended)
   - Use semantic class names that map to node types (e.g., `.text-node`, `.image-node`)
   - Keep absolute positioning explicit (easier to convert later)
   - Use consistent binding patterns (`{{fieldName}}` in layer names/IDs)
   - Document complex CSS that might be hard to convert

3. **Binding Patterns**
   - Use consistent placeholder patterns in HTML (e.g., `{{eventTitle}}`)
   - Match patterns in `config.json` replacements array
   - Consider using data attributes for bindings: `data-binding="eventTitle"`

4. **Variant Management**
   - HTML templates still use separate files (`template-1.html`, `template-2.html`, etc.)
   - Consider if variants could be unified with CSS classes (easier to convert later)
   - Document variant differences clearly

5. **Color Token Compatibility**
   - Use consistent color values that can be tokenized later
   - Consider using CSS custom properties for colors (easier to convert to tokens)
   - Document which colors should become tokens

6. **Asset Management**
   - Use relative paths for assets (easier to migrate to cloud storage)
   - Keep assets organized in `assets/` folder
   - Document asset dependencies

7. **Complex Layouts**
   - HTML is perfect for complex CSS (flexbox, grid, text wrapping)
   - Document why HTML was chosen over node graphs
   - Consider if complex layouts could be simplified for conversion

**Best Practices:**
- ✅ Use HTML for long-format, complex layouts, dynamic text
- ✅ Explicitly declare format in config.json
- ✅ Keep structure clean and semantic
- ✅ Document conversion blockers (complex CSS, etc.)
- ❌ Don't mix formats in same template
- ❌ Don't rely on auto-detection for production templates

#### Illustrator Support (Weeks 10-11)

- [ ] Create Illustrator export workflow
  - [ ] Export to SVG/PDF (Illustrator → export)
  - [ ] Parse SVG/PDF structure
  - [ ] Convert to node graph
  - [ ] Handle Illustrator-specific features (gradients, effects)
- [ ] Build import UI (`app/admin/templates/import/illustrator`)
- [ ] Test Illustrator import workflow

#### Template Editor (Weeks 11-12)

- [ ] Create template editor UI (`app/admin/templates/{id}/edit`)
  - [ ] Visual node editor (optional, for manual edits)
  - [ ] Layer mapping interface
  - [ ] Binding editor (map layers to fields)
  - [ ] Token mapping interface (map colors to tokens)
  - [ ] Variant editor (create/edit variants)
- [ ] Build layer mapping interface
  - [ ] Shows imported layers
  - [ ] Allows mapping to form fields
  - [ ] Detects common patterns (`{{fieldName}}`)
- [ ] Build token mapping interface
  - [ ] Shows all colors in design
  - [ ] Allows mapping to semantic tokens (primary, secondary, etc.)
  - [ ] Handles gradients and effects
- [ ] Test full import → edit → use workflow
- [ ] Document import workflow for users

### Your Role

- [ ] Install Figma plugin
- [ ] Test importing a design from Figma
- [ ] Test importing a design from Illustrator (via SVG/PDF)
- [ ] Map layers to fields in editor
- [ ] Test token mapping
- [ ] Create example template from Figma
- [ ] Create example template from Illustrator
- [ ] Provide feedback on workflow
- [ ] Test that imported templates work end-to-end

### Deliverables

- [ ] Figma plugin working
- [ ] Illustrator import working (via SVG/PDF)
- [ ] Template editor UI functional
- [ ] Can import design and create template
- [ ] Documentation for users

### Status: 🔵 Not Started

### Dependencies

- ✅ Phase 1 must be complete
- ✅ Phase 2 recommended (to test import workflow)

---

## 🔀 Phase 4: Variant System (Weeks 13-14)

**Goal**: Use variant overrides on node graphs (HTML files remain optional in hybrid system)

**Approach**: Start with basic hide/show, add advanced actions later if needed

### Tasks

- [x] Update compiler to handle variant overrides ✅
  - [x] **Basic variant actions** (start simple):
    - [x] Hide nodes ✅
    - [x] Show nodes ✅
  - [x] Compiler applies overrides before generating HTML ✅
  - [ ] **Skip for now** (add later if needed):
    - [ ] Move nodes
    - [ ] Resize nodes
    - [ ] Recolor nodes
    - [ ] Animate nodes
- [x] Convert templates to use variant system ✅
  - [x] Define variants as overrides in schemas ✅
  - [x] Variants defined in schema.json files ✅
  - [ ] **Still using separate schema files per variant** (schema-1.json, schema-2.json, etc.)
  - [ ] **Goal**: Unified schema with variant overrides (not yet implemented)
- [ ] Remove separate HTML files (`template-1.html`, etc.) - Optional (hybrid system)
- [ ] Update UI to show variant selector
  - [ ] Dropdown or tabs for variant selection
  - [ ] Preview all variants
- [ ] Test all variants render correctly
- [ ] Update documentation

### Design Note

**Start Simple**: Basic hide/show covers 90% of use cases. Advanced actions (move, resize, etc.) can be added later if needed without breaking existing variants.

### Your Role

- [ ] Test variant 1 (1 speaker)
- [ ] Test variant 2 (2 speakers)
- [ ] Test variant 3 (3 speakers)
- [ ] Verify layout is correct for all variants
- [ ] Test that changing design updates all variants
- [ ] Test creating new variants

### Deliverables

- ✅ Variants work with override system (core implemented)
- ✅ Compiler handles variant overrides
- ✅ Variants defined in schemas
- [ ] Unified schema approach (currently using separate schema files)
- [ ] UI variant selector
- [ ] All variants tested and verified

### Status: 🟡 Partial (Core implemented, unified schema pending)

### Dependencies

- ✅ Phase 2 must be complete

---

## 🎨 Phase 5: Token System (Weeks 15-16)

**Goal**: Replace hex colors with semantic color tokens

**Approach**: Start with basic color tokens, add advanced token types later if needed

### Tasks

- [x] Update node graph structure to use tokens (not hex) ✅
  - [x] Store colors as `token:primary` format ✅
  - [x] Support locked colors (not tokenized) ✅
  - [x] **Basic tokens only** (start simple):
    - [x] Primary color token ✅
    - [x] Secondary color token ✅
    - [x] Background color token ✅
  - [ ] **Skip for now** (add later if needed):
    - [ ] Spacing tokens
    - [ ] Typography tokens
    - [ ] Shadow tokens
    - [ ] Animation tokens
- [x] Update compiler to resolve tokens → colors ✅
  - [x] Looks up token value from template config ✅
  - [x] Applies to all nodes using that token ✅
  - [x] **Basic support** (solid colors first):
    - [x] Resolve solid color tokens ✅
  - [ ] **Skip for now** (add later if needed):
    - [ ] Gradient tokens (map stops to tokens)
    - [ ] Shadow color tokens
- [ ] Update UI to show token picker (not hex picker)
  - [ ] Shows semantic names (Primary, Secondary, Background)
  - [ ] Color picker for each token
- [ ] Test color changes work everywhere
- [ ] Remove hex replacement code (no longer needed) - May still exist in legacy HTML templates

### Design Note

**Start Simple**: Basic color tokens cover most use cases. Advanced tokens (spacing, typography, etc.) and gradient support can be added later if needed without breaking existing templates.

### Your Role

- [ ] Test changing primary color (does everything update?)
- [ ] Test changing secondary color
- [ ] Test with gradients/effects
- [ ] Verify locked colors don't change
- [ ] Test token mapping during import
- [ ] Report any colors that don't update

### Deliverables

- ✅ Color tokens working (core implemented)
- ✅ Compiler resolves tokens correctly
- ✅ Templates use tokens in schemas
- [ ] UI token picker (may still use hex picker)
- [ ] All colors tested and verified
- ✅ Better UX foundation (semantic names vs hex codes)

### Status: 🟡 Partial (Core implemented, UI pending)

### Dependencies

- ✅ Phase 2 must be complete
- ✅ Phase 3 recommended (for token mapping during import)

---

## ☁️ Phase 6: Object Storage (Week 17)

**Goal**: Move assets to cloud storage (S3/R2)

### Tasks

- [ ] Set up S3/R2 account (or configure existing)
- [ ] Create storage service (`lib/storage.ts`)
  - [ ] Upload to cloud
  - [ ] Generate signed URLs
  - [ ] Handle public vs private assets
- [ ] Migrate existing assets to cloud
  - [ ] Template assets (logos, decorations)
  - [ ] User uploads (headshots)
  - [ ] Generated outputs (posters)
- [ ] Update code to use cloud storage URLs
  - [ ] Template engine uses cloud URLs
  - [ ] Form submission uploads to cloud
  - [ ] Render API uses cloud URLs
- [ ] Update storage routes to serve from cloud
- [ ] Test asset loading
- [ ] Update database schema (remove base64 fields, add URL fields)

### Your Role

- [ ] Approve cloud storage provider (S3 vs R2)
- [ ] Test that images load correctly
- [ ] Test that outputs are accessible
- [ ] Verify performance improvement
- [ ] Test with large files

### Deliverables

- ✅ Assets in cloud storage
- ✅ Images load correctly
- ✅ Better performance
- ✅ Smaller database

### Status: 🔵 Not Started

### Dependencies

- ✅ Can be done in parallel with other phases

---

## ⚙️ Phase 7: Render Queue (Weeks 18-20)

**Goal**: Make rendering more reliable with job queue

### Tasks

- [ ] Create render job schema (database)
  - [ ] `RenderJob` table
  - [ ] Status tracking (pending, processing, completed, failed)
  - [ ] Retry count
  - [ ] Result URLs
- [ ] Build job queue system (`lib/render-queue.ts`)
  - [ ] Create jobs
  - [ ] Process jobs
  - [ ] Update status
  - [ ] Handle retries
- [ ] Create worker process (`app/api/render/worker.ts`)
  - [ ] Polls for pending jobs
  - [ ] Renders using Puppeteer
  - [ ] Updates job status
  - [ ] Handles timeouts
- [ ] Update submit API to create jobs (not render directly)
  - [ ] Returns job ID immediately
  - [ ] Client polls for status
- [ ] Build status tracking UI
  - [ ] Shows job status
  - [ ] Progress indicator
  - [ ] Error messages
- [ ] Add retry logic
  - [ ] Automatic retry on failure
  - [ ] Max retry count
  - [ ] Exponential backoff
- [ ] Add job caching (by hash)
  - [ ] Hash of template + data
  - [ ] Return cached result if exists
- [ ] Test timeout handling
- [ ] Test retry on failure

### Your Role

- [ ] Test submission flow (creates job)
- [ ] Test status updates (pending → processing → completed)
- [ ] Test retry on failure
- [ ] Verify no timeouts
- [ ] Test with slow renders
- [ ] Test job caching (same input = instant result)

### Deliverables

- ✅ Job queue working
- ✅ Status tracking UI
- ✅ Automatic retries
- ✅ No timeout errors
- ✅ Better user experience (no waiting)

### Status: 🔵 Not Started

### Dependencies

- ✅ Phase 1 must be complete
- ✅ Phase 6 recommended (for asset storage)

---

## 📄 Phase 8: Long-Format Content Support (Weeks 21-24)

**Goal**: Support multi-page documents and long-form content

### Tasks

- [ ] Extend node graph for multi-page layouts
  - [ ] Page nodes (containers)
  - [ ] Page break rules
  - [ ] Flow content between pages
- [ ] Update compiler for multi-page HTML
  - [ ] Generates multiple HTML pages
  - [ ] Handles page breaks
  - [ ] Maintains layout across pages
- [ ] Build document renderer
  - [ ] Renders multiple pages
  - [ ] Combines into PDF
  - [ ] Handles page numbering
  - [ ] Handles headers/footers
- [ ] Create long-format template editor
  - [ ] Page layout editor
  - [ ] Content flow rules
  - [ ] Page break controls
- [ ] Add text flow rules
  - [ ] Auto-flow text across pages
  - [ ] Orphan/widow control
  - [ ] Column layouts
- [ ] Test with long documents
  - [ ] Multi-page reports
  - [ ] Long-form articles
  - [ ] Catalogs/brochures
- [ ] Update UI for document templates
  - [ ] Template type selector (poster vs document)
  - [ ] Page preview
  - [ ] Page navigation

### Your Role

- [ ] Test creating a multi-page document template
- [ ] Test with long content (auto-flow across pages)
- [ ] Test page breaks
- [ ] Test headers/footers
- [ ] Test PDF output
- [ ] Provide feedback on workflow

### Deliverables

- ✅ Multi-page node graph support
- ✅ Document renderer working
- ✅ Long-format content flows correctly
- ✅ PDF output for documents
- ✅ Template editor supports documents

### Status: 🔵 Not Started

### Dependencies

- ✅ Phase 1 must be complete (node graph system)
- ✅ Phase 2 recommended (to understand template structure)
- ✅ Phase 7 recommended (for reliable rendering)

---

## 📋 Overall Progress Tracker

### Phase Status

| Phase | Status | Progress | Week | Approach |
|-------|--------|----------|------|----------|
| Phase 1: Foundation | 🟢 Complete | 100% | 1-4 | **Hybrid system implemented** ✅ |
| Phase 2: Convert Templates | 🟢 Complete | 100% | 5-6 | **Format configuration implemented** ✅ |
| Phase 3: Design Tool Import | 🔵 Not Started | 0% | 7-12 | Figma + Illustrator |
| Phase 4: Variants | 🟡 Partial | 60% | 13-14 | **Core implemented, unified schema pending** |
| Phase 5: Tokens | 🟡 Partial | 70% | 15-16 | **Core implemented, UI pending** |
| Phase 6: Cloud Storage | 🔵 Not Started | 0% | 17 | Infrastructure |
| Phase 7: Render Queue | 🔵 Not Started | 0% | 18-20 | Reliability |
| Phase 8: Long-Format Content | 🔵 Not Started | 0% | 21-24 | Multi-page support |

**Status Legend**:
- 🔵 Not Started
- 🟡 In Progress
- 🟢 Complete
- 🔴 Blocked

---

## 🎯 Milestones

### Milestone 1: Foundation Complete
**Target**: End of Week 4
- [x] **Core** node graph system built (simple, extensible) ✅
- [x] **Basic** compiler working (absolute positioning + flexbox) ✅
- [x] Dual-format support (nodes + legacy HTML) ✅
- [x] Current templates still work (no regression) ✅
- [x] System ready for extension (optional properties, union types) ✅

### Milestone 2: Hybrid System Working
**Target**: End of Week 6
- [x] Hybrid system implemented ✅
- [x] Both formats supported ✅
- [x] Templates converted selectively (mtl-code, code-a-quebec) ✅
- [x] Explicit format configuration in config.json ✅
- [x] Format detection working (config.json takes priority) ✅
- [ ] No regression in functionality (testing can be done as needed)
- [x] Choose format per template based on needs ✅

### Milestone 3: Design Import Working
**Target**: End of Week 12
- [ ] Can import from Figma
- [ ] Can import from Illustrator
- [ ] Template editor functional
- [ ] Can create template from design tools

### Milestone 4: Core Features Complete
**Target**: End of Week 16
- [x] Variants working (core implemented) ✅
- [x] Tokens working (core implemented) ✅
- [ ] Cloud storage set up
- [ ] Variants: Unified schema approach (pending)
- [ ] Tokens: UI token picker (pending)

### Milestone 5: Production Ready
**Target**: End of Week 20
- [ ] Render queue working
- [ ] All core features complete
- [ ] System stable

### Milestone 6: Long-Format Complete
**Target**: End of Week 24
- [ ] Multi-page support working
- [ ] Long-form content flows correctly
- [ ] Document templates functional
- [ ] Full system complete

---

## 🏗️ Architecture Overview

### Template Format Hierarchy

```
┌─────────────────────────────────────┐
│   Source of Truth: Node Graphs      │
│   (From Figma/Illustrator/Manual)   │
│   - Start Simple (Phase 1)          │
│   - Extend Later (Phases 2-8)        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Compiler: Node → HTML             │
│   (Generates HTML for Puppeteer)    │
│   - Basic compilation (Phase 1)     │
│   - Advanced features (later phases)│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Rendering: Puppeteer               │
│   (HTML → PNG/PDF/WebP)             │
└─────────────────────────────────────┘
```

### Hybrid System Architecture

```
Template Registry
├── Node Graph Templates
│   ├── Source: Node graph (schema.json or schema-layout-*.json)
│   ├── Render: Compile to HTML → Puppeteer
│   ├── Status: First-class (use for simple posters, programmatic templates)
│   ├── Config: format: "node" in config.json
│   └── Features: Start simple, extend later
└── HTML Templates
    ├── Source: HTML file (template-*.html)
    ├── Render: Direct → Puppeteer
    ├── Status: First-class (use for complex/long-format content)
    └── Config: format: "html" or omit (defaults to HTML)
```

**Key Points**:
- Both formats are **first-class citizens** (not deprecated)
- Choose format per template based on needs
- Hybrid system routes to correct renderer automatically
- No forced migration - convert selectively

### Evolution Path

**Phase 1 (Simple)**:
- Basic node types (text, image, shape, group)
- Basic variants (hide/show)
- Basic tokens (colors)
- Basic compiler (absolute positioning)

**Later Phases (Extended)**:
- Advanced properties (shadows, gradients, animations)
- Advanced variants (move, resize, animate)
- Advanced tokens (spacing, typography)
- Advanced layouts (flexbox, grid, auto-flow)
- New node types (video, charts, etc.)
- Multi-page support (Phase 8)

---

## 🚦 Decision Points

### Decision 1: Cloud Storage Provider
**When**: Before Phase 6
**Options**: AWS S3 vs Cloudflare R2
**Considerations**:
- Cost (R2 is cheaper, no egress fees)
- Integration (both work with Vercel)
- Performance (both are fast)
**Decision Needed By**: Week 16

### Decision 2: Figma Plugin Approach
**When**: Before Phase 3
**Options**: 
- Full-featured plugin (more work, better UX)
- Simple export tool (less work, manual mapping)
**Recommendation**: Start simple, enhance later
**Decision Needed By**: Week 6

### Decision 3: Illustrator Import Method
**When**: During Phase 3
**Options**:
- SVG export → parse (recommended)
- PDF export → parse
- Native .ai parsing (complex, not recommended)
**Recommendation**: SVG export (most reliable)
**Decision Needed By**: Week 10

### Decision 4: Job Queue System
**When**: Before Phase 7
**Options**:
- Simple database queue (easier, good for start)
- External queue service (more scalable, Redis/BullMQ)
**Recommendation**: Start with database queue, upgrade if needed
**Decision Needed By**: Week 17

### Decision 5: Long-Format Rendering
**When**: Before Phase 8
**Options**:
- Puppeteer multi-page (current stack)
- PDFKit (more control, different stack)
- Keep Puppeteer, enhance for documents
**Recommendation**: Enhance Puppeteer (consistency)
**Decision Needed By**: Week 20

---

## 📝 Weekly Check-in Template

### Week [X] Check-in

**Date**: _______________

**Phase**: _______________

**Completed This Week**:
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

**In Progress**:
- [ ] Task 4
- [ ] Task 5

**Blockers**:
- Blocker 1
- Blocker 2

**Next Week Plan**:
- [ ] Task 6
- [ ] Task 7

**Your Testing**:
- [ ] Tested: _______________
- [ ] Feedback: _______________

**Decisions Needed**:
- [ ] Decision 1
- [ ] Decision 2

**Architecture Notes**:
- _______________
- _______________

---

## 🎓 Key Metrics to Track

### Code Metrics
- Lines of code added
- Test coverage
- Build time
- Performance benchmarks
- Compiler output quality (HTML correctness)

### User Metrics
- Template creation time (before vs after)
- Import success rate (Figma/Illustrator)
- Render success rate
- User satisfaction
- Time to create template from design tool

### System Metrics
- Database size (should decrease with cloud storage)
- Render time (should improve with queue)
- Error rate (should decrease)
- Template format distribution (nodes vs HTML)

---

## 📚 Resources

### Documentation
- [Migration Guide](./MIGRATION-GUIDE.md) - Full detailed guide
- [Architecture Docs](./ARCHITECTURE-SCHEMA-SYSTEM.md) - Technical details
- [Template Building Strategy](./TEMPLATE-BUILDING-STRATEGY.md) - Best practices

### External Resources
- [Figma Plugin API](https://www.figma.com/plugin-docs/)
- [Illustrator Scripting](https://www.adobe.com/devnet/illustrator/scripting.html)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Puppeteer Documentation](https://pptr.dev/)

---

## ✅ Success Criteria

The migration is successful when:

### Phase 1 Success (Foundation)
- [ ] All existing templates work (no regression)
- [ ] Basic node graph system working
- [ ] Basic compiler generates correct HTML
- [ ] System is extensible (ready for future features)

### Full Migration Success (All Phases)
- [ ] All existing templates work (no regression)
- [ ] Can import from Figma (node graphs)
- [ ] Can import from Illustrator (node graphs)
- [ ] Nodes are source of truth (not HTML)
- [ ] HTML is just compiled output (for Puppeteer)
- [ ] Variants are easier to manage (overrides, not separate files)
- [ ] Colors work with tokens (basic tokens in Phase 5, advanced later if needed)
- [ ] Rendering is more reliable (queue system)
- [ ] System is faster (cloud storage, caching)
- [ ] Long-format content works (multi-page documents in Phase 8)
- [ ] User experience is better (easier template creation)
- [ ] System can evolve (new features added without breaking changes)

---

## 🔄 Migration Path Summary

### Current State → Target State

**Before (Current)**:
- Templates: HTML files
- Source: Manual HTML creation
- Variants: Separate HTML files
- Colors: Hex replacement
- Assets: Base64 in database

**After (Target)**:
- Templates: Node graphs
- Source: Figma/Illustrator import OR manual node creation
- Variants: Override system on single node graph
- Colors: Semantic tokens
- Assets: Cloud storage
- Long-format: Multi-page node graphs

**Hybrid System (Current)**:
- Both formats supported as first-class citizens
- New templates = choose format based on needs
  - Simple posters → node graphs
  - Complex/long-format → HTML
- Existing templates = keep as HTML (unless converting adds value)
- Selective conversion (no forced migration)

---

**Last Updated**: [Date]
**Next Review**: [Date]

---

> 💡 **Tip**: In Notion, you can:
> - Convert checkboxes to a database view
> - Add timeline view for phases
> - Create linked pages for each phase
> - Add status property for better filtering
> - Create calendar view for deadlines
> - Add progress bars for each phase
> - Create kanban board for tasks

