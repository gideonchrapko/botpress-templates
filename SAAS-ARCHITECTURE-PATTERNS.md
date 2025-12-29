# SaaS Template Builder - Design Patterns & Architecture

## Vision
Users create templates in Figma/Illustrator → Upload → Auto-generate config → Use in app

---

## Critical Design Patterns for SaaS

### 1. **Factory Pattern** ⭐⭐⭐ (Critical)
**What**: Template creation from various sources (Figma, Illustrator, HTML upload)

**Why**:
- Users will upload from different sources
- Need to normalize different formats into your schema
- Easy to add new import sources (Canva, Sketch, etc.)

**Implementation**:
```typescript
interface TemplateFactory {
  createFromFigma(figmaFile: File): TemplateConfig
  createFromIllustrator(aiFile: File): TemplateConfig
  createFromHTML(htmlFile: File): TemplateConfig
  createFromConfig(config: JSON): TemplateConfig
}
```

**Benefits**:
- Add new import sources without changing core code
- Consistent output regardless of source
- Easy to test each import type

---

### 2. **Strategy Pattern** ⭐⭐⭐ (Critical)
**What**: Different rendering/processing strategies per template type

**Why**:
- Different templates need different processing
- Video templates vs. static posters
- Animated templates vs. static
- Different output formats per template type

**Implementation**:
```typescript
interface RenderStrategy {
  render(template: Template, data: FormData): Output
}

class StaticImageStrategy implements RenderStrategy { ... }
class VideoStrategy implements RenderStrategy { ... }
class AnimatedGifStrategy implements RenderStrategy { ... }
```

**Benefits**:
- Easy to add new template types
- Each strategy is isolated
- Can optimize per type

---

### 3. **Plugin/Extension Pattern** ⭐⭐⭐ (Critical)
**What**: Extensible field types and features

**Why**:
- Users will want custom field types
- Third-party integrations (Stripe, Mailchimp, etc.)
- Marketplace for plugins
- Community contributions

**Implementation**:
```typescript
interface FieldPlugin {
  name: string
  type: string
  render(field: Field, value: any): ReactNode
  validate(value: any): ValidationResult
  processForTemplate(value: any): string
}

// Register plugins
fieldRegistry.register(new CustomFieldPlugin())
```

**Benefits**:
- Users can extend functionality
- Marketplace potential
- Community-driven growth
- Core stays lean

---

### 4. **Repository Pattern** ⭐⭐⭐ (Critical)
**What**: Abstract data access for templates

**Why**:
- Multi-tenancy (user isolation)
- Template versioning
- Template sharing/marketplace
- Different storage backends (S3, database, CDN)

**Implementation**:
```typescript
interface TemplateRepository {
  save(userId: string, template: Template): Promise<Template>
  findById(userId: string, templateId: string): Promise<Template>
  findByUser(userId: string): Promise<Template[]>
  findPublic(): Promise<Template[]> // Marketplace
  delete(userId: string, templateId: string): Promise<void>
}
```

**Benefits**:
- Easy to swap storage (DB → S3 → IPFS)
- User isolation built-in
- Marketplace queries simple
- Versioning support

---

### 5. **Builder Pattern** ⭐⭐ (Important)
**What**: Step-by-step template construction

**Why**:
- Complex template creation process
- Validation at each step
- Undo/redo support
- Preview before finalizing

**Implementation**:
```typescript
class TemplateBuilder {
  setBaseConfig(config: Config): this
  addField(field: Field): this
  setAssets(assets: Assets): this
  validate(): ValidationResult
  build(): Template
}
```

**Benefits**:
- Fluent API for template creation
- Validation at each step
- Easy to add creation steps

---

### 6. **Observer Pattern** ⭐⭐ (Important)
**What**: Notify on template changes/updates

**Why**:
- Real-time collaboration
- Template updates notify users
- Analytics tracking
- Cache invalidation

**Implementation**:
```typescript
interface TemplateObserver {
  onTemplateCreated(template: Template): void
  onTemplateUpdated(template: Template): void
  onTemplateDeleted(templateId: string): void
}

// Observers: Analytics, Cache, Notifications, etc.
```

**Benefits**:
- Decoupled systems
- Easy to add new listeners
- Real-time features

---

### 7. **Adapter Pattern** ⭐⭐⭐ (Critical for SaaS)
**What**: Convert external formats to node-based schema

**Why**:
- Figma API → Node graph
- Illustrator SVG/PDF → Node graph
- HTML uploads → Node graph (one-time conversion)
- Future: Canva, Sketch, etc.

**Implementation**:
```typescript
interface TemplateAdapter {
  canHandle(file: File): boolean
  adapt(file: File): Promise<TemplateNodeGraph>
}

class FigmaAdapter implements TemplateAdapter {
  // Uses Figma Plugin API
  // Exports nodes with bindings from layer names
  // Maps colors to tokens
}

class IllustratorAdapter implements TemplateAdapter {
  // Parses SVG/PDF export
  // User maps layers to bindings
  // Converts to node graph
}

class HTMLAdapter implements TemplateAdapter {
  // One-time conversion tool
  // Parses HTML → Node graph
  // User confirms bindings
}
```

**Key Difference**: Output is node graph, not config JSON

**Benefits**:
- Easy to add new import sources
- Isolated conversion logic
- Testable per format
- Consistent output format (node graph)

---

### 8. **Facade Pattern** ⭐⭐ (Important)
**What**: Simple API for complex template operations

**Why**:
- Hide complexity from users
- Simple "create template" API
- Internal complexity hidden

**Implementation**:
```typescript
class TemplateService {
  // Simple API
  createTemplate(source: File): Promise<Template>
  
  // Internally uses: Factory, Builder, Adapter, Repository
}
```

**Benefits**:
- Clean public API
- Internal changes don't break API
- Easy to use

---

### 9. **Template Method Pattern** ⭐⭐ (Important)
**What**: Standardized template processing pipeline

**Why**:
- Consistent processing for all templates
- Easy to add pipeline steps
- Validation, rendering, optimization

**Implementation**:
```typescript
abstract class TemplateProcessor {
  // Template method - defines algorithm
  process(template: Template, data: FormData): Output {
    this.validate(template)
    this.prepareAssets(template)
    this.render(template, data)
    this.optimize(output)
    return output
  }
  
  // Subclasses override steps
  abstract validate(template: Template): void
  abstract render(template: Template, data: FormData): Output
}
```

**Benefits**:
- Consistent processing
- Easy to customize per template type
- Pipeline is clear

---

### 10. **Proxy Pattern** ⭐ (Nice to have)
**What**: Lazy loading, caching, access control

**Why**:
- Performance (lazy load templates)
- Caching (expensive operations)
- Access control (paid features)

**Implementation**:
```typescript
class TemplateProxy {
  private cache: Map<string, Template>
  
  getTemplate(id: string): Template {
    if (!cache.has(id)) {
      cache.set(id, this.loadTemplate(id))
    }
    return cache.get(id)
  }
}
```

**Benefits**:
- Performance optimization
- Access control layer
- Resource management

---

## Architecture Layers for SaaS

### Layer 1: Import/Adapter Layer
```
Figma → FigmaAdapter → TemplateConfig
Illustrator → IllustratorAdapter → TemplateConfig
HTML → HTMLAdapter → TemplateConfig
```

### Layer 2: Factory Layer
```
TemplateFactory → Creates Template from Config
Validates structure
Normalizes format
```

### Layer 3: Repository Layer
```
TemplateRepository → Storage
User isolation
Versioning
Marketplace queries
```

### Layer 4: Processing Layer
```
TemplateProcessor → Rendering
Strategy pattern for different types
Optimization
Output generation
```

### Layer 5: API Layer
```
TemplateService (Facade) → Public API
Simple interface
Hides complexity
```

---

## Multi-Tenancy Patterns

### 1. **Tenant Isolation**
- Every template belongs to a user/org
- Repository filters by userId
- No cross-tenant data access

### 2. **Resource Quotas**
- Strategy pattern for quota checking
- Different tiers (free, pro, enterprise)
- Plugin for quota management

### 3. **Template Sharing**
- Public/private templates
- Marketplace queries
- Sharing permissions

---

## Scalability Patterns

### 1. **Microservices-Ready**
- Template service (CRUD)
- Rendering service (heavy processing)
- Import service (Figma/Illustrator)
- Marketplace service (discovery)

### 2. **Event-Driven**
- Template created → Event → Analytics, Cache, Notifications
- Observer pattern for decoupling

### 3. **Caching Strategy**
- Template configs (Redis)
- Rendered outputs (CDN)
- User templates (in-memory cache)

---

## Security Patterns

### 1. **Sandboxing**
- User templates run in isolated environment
- No access to system files
- Resource limits

### 2. **Validation Layer**
- All user input validated
- Template configs validated
- Output sanitized

### 3. **Access Control**
- Repository pattern enforces user isolation
- Proxy pattern for permission checks

---

## Implementation Priority

### Phase 1: Core SaaS (MVP)
1. **Node Graph Schema** - Foundation (node-based templates)
2. **Repository Pattern** - User isolation
3. **Adapter Pattern** - Figma plugin (node graph export)
4. **Compiler Pattern** - Node graph → HTML
5. **Factory Pattern** - Template creation from node graph
6. **Strategy Pattern** - Different template types

### Phase 2: Scale
7. **Variant System** - Override-based variants
8. **Token System** - Color token management
9. **Object Storage** - S3/R2 for assets
10. **Render Queue** - Job queue system
11. **Plugin Pattern** - Extensibility
12. **Observer Pattern** - Events/notifications

### Phase 3: Advanced
8. **Builder Pattern** - Complex creation
9. **Template Method** - Processing pipeline
10. **Proxy Pattern** - Performance

---

## Key Architectural Changes (Node-Based System)

### 1. Template Representation
**Current**: HTML files with string replacement
**Future**: Node-based graph with constraints

### 2. Variants
**Current**: Separate HTML files (`template-1.html`, `template-2.html`)
**Future**: Single node graph + variant overrides

### 3. Colors
**Current**: Hex replacement (`#3D9DFF` → user color)
**Future**: Token-based system (`{ token: "primary" }`)

### 4. Text/Image Handling
**Current**: Simple string replacement
**Future**: Constraints, fit modes, layout rules

### 5. Import
**Current**: Manual HTML creation
**Future**: Figma plugin → Node graph export

### 6. Storage
**Current**: Base64 in database
**Future**: Object storage (S3/R2) + metadata in DB

### 7. Rendering
**Current**: Direct Puppeteer call
**Future**: Render queue with job processing

---

## Key Differences: Current vs SaaS

| Current | SaaS |
|---------|------|
| Single tenant | Multi-tenant |
| Static templates | User-generated |
| Local config files | Database storage (node graphs) |
| HTML string replacement | Node-based compilation |
| Separate variant files | Variant overrides |
| Hex color replacement | Token-based colors |
| No import | Figma plugin import |
| Base64 in DB | Object storage (S3/R2) |
| Direct rendering | Render queue |
| No marketplace | Template marketplace |
| No versioning | Template versioning |
| No sharing | Public/private sharing |

---

## Recommended Architecture (Node-Based)

```
┌─────────────────────────────────────┐
│         Public API (Facade)          │
│      TemplateService (Simple)        │
└─────────────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼───┐    ┌───▼────────┐
│Import │    │  Template   │
│Service│    │  Repository │
│(Figma │    │ (Node Graph │
│Plugin)│    │  Storage)    │
└───┬───┘    └───┬────────┘
    │            │
┌───▼────────────▼───┐
│  Node Graph        │
│  (Source of Truth) │
└───┬───────────────┘
    │
┌───▼───────────────┐
│  Node Compiler    │
│  (Graph → HTML)   │
└───┬───────────────┘
    │
┌───▼───────────────┐
│  Render Queue     │
│  (Job Processing) │
└───┬───────────────┘
    │
┌───▼───────────────┐
│  Puppeteer       │
│  (HTML → Image)  │
└───────────────────┘
    │
┌───▼───────────────┐
│  Object Storage   │
│  (S3/R2)          │
└───────────────────┘
```

**Key Differences**:
- Import outputs node graph (not config)
- Repository stores node graphs (not HTML files)
- Compiler converts node graph → HTML
- Render queue handles async processing
- Object storage for assets/outputs

---

## Why These Patterns Matter for SaaS

1. **Multi-tenancy**: Repository pattern ensures user isolation
2. **Extensibility**: Plugin pattern allows marketplace
3. **Import flexibility**: Adapter pattern for new sources
4. **Scalability**: Strategy pattern for different processing types
5. **Maintainability**: Factory/Builder for complex creation
6. **Performance**: Proxy pattern for caching
7. **Clean API**: Facade pattern for simplicity

---

## Bottom Line

**Must Have for SaaS**:
- Repository Pattern (multi-tenancy)
- Adapter Pattern (Figma/Illustrator import)
- Factory Pattern (template creation)
- Strategy Pattern (different types)
- Plugin Pattern (marketplace/extensibility)

**Nice to Have**:
- Builder, Observer, Facade, Template Method, Proxy

These patterns will make your system:
- ✅ Scalable (handle many users/templates)
- ✅ Extensible (users can add features)
- ✅ Maintainable (clear separation of concerns)
- ✅ Testable (each pattern is isolated)
- ✅ Marketable (plugin marketplace potential)

