# Architecture Decisions & Improvements

This document tracks important architectural decisions, improvements, and refactorings that affect the overall system design.

---

## 📋 Table of Contents

- [Form System](#form-system)
- [Template System](#template-system)
- [Rendering System](#rendering-system)
- [Future Improvements](#future-improvements)

---

## Form System

### DynamicForm: Fully Config-Driven Architecture

**Date**: 2026-01-14  
**Status**: ✅ Implemented (Partially) → 🔄 In Progress (Fully Config-Driven)

#### Problem

The `DynamicForm` component had hardcoded assumptions about which fields templates would have:
- Hardcoded fields: `eventTitle`, `eventDate`, `doorTime`, `primaryColor`
- Assumed all templates have a `people` field
- Schema builder was partially hardcoded
- New templates required form code changes

This caused errors when templates didn't match assumptions (e.g., `code-a-quebec-thumbnail` template without people field).

#### Solution

**Phase 1: Safety Fixes** (✅ Complete)
- Made `people` field conditional in form defaults
- Added safety checks for `data.people` access
- Made `useFieldArray` safe for templates without people

**Phase 2: Fully Config-Driven** (🔄 In Progress)
- Build schema dynamically from `config.fields`
- Render all fields from config (not hardcoded)
- Support all field types: `text`, `color`, `date`, `time`, `people`, `image`
- Smart defaults for system fields (`scale`, `formats`)

#### Benefits

- ✅ **Future-proof**: New templates work without form changes
- ✅ **Less maintenance**: One place to update (config)
- ✅ **Fewer bugs**: No hardcoded assumptions
- ✅ **Better UX**: Form matches each template's needs

#### Implementation Details

**Current State**:
- Form UI is mostly config-driven (renders fields from config)
- Schema builder still has hardcoded fields
- Default values partially hardcoded

**Target State**:
```typescript
// Schema built entirely from config.fields
function buildSchema(config: TemplateConfig) {
  const schema: Record<string, any> = {
    // System fields (always present)
    scale: z.enum(["1", "2", "3"]),
    formats: z.array(z.enum(["png", "jpg", "webp", "pdf"])).min(1),
    
    // Dynamic fields from config
    ...config.fields.reduce((acc, field) => {
      acc[field.name] = buildFieldSchema(field);
      return acc;
    }, {} as Record<string, any>)
  };
  
  return z.object(schema);
}
```

**Field Renderers**:
- `text` → `<Input>` with validation
- `color` → Color picker
- `date` → `<DatePicker>`
- `time` → Time input
- `people` → Dynamic array with `useFieldArray`
- `image` → File upload

#### Related Files

- `components/forms/DynamicForm.tsx`
- `lib/template-registry.ts` (TemplateConfig interface)
- `templates/*/config.json` (field definitions)

---

## Template System

### Hybrid System: Node Graphs + HTML Templates

**Date**: 2025-12 (Ongoing)  
**Status**: ✅ Implemented

**Key Decision**: Support both formats as first-class citizens—node-based templates (e.g. blog image generator) and HTML templates with config-driven replacement (e.g. event posters). Template registry and render pipeline handle both; developers choose per family.

---

## Rendering System

### Error Handling & Safety Checks

**Date**: 2026-01-14  
**Status**: ✅ Implemented

#### Problem

Template rendering had multiple points of failure:
- Unsafe JSON parsing (`people`, `uploadUrls`)
- Missing null checks
- No error context for debugging

#### Solution

- Added comprehensive try-catch blocks
- Type checks before calling methods (`.trim()`, `.length`)
- Detailed error logging with submission context
- Fallback values for missing data

#### Related Files

- `lib/template-engine.ts`
- `lib/template-renderer.ts`
- `lib/field-resolver.ts`
- `app/api/render/route.ts`

---

## Future Improvements

### Template Registry Auto-Discovery

**Status**: 📋 Planned

Currently templates are hardcoded in `getAllTemplateConfigs()`. Future: auto-discover templates by scanning `templates/` directory.

### Field Type Extensions

**Status**: 📋 Planned

Add support for:
- `select` / `dropdown` fields
- `textarea` for long text
- `number` fields
- `boolean` / `checkbox` fields
- Custom field types via plugins

### Form Validation Improvements

**Status**: 📋 Planned

- Client-side validation from config
- Real-time validation feedback
- Custom validation rules per field
- Conditional field visibility

---

## How to Document New Decisions

When making an architectural change:

1. **Add a new section** with:
   - Date
   - Status (✅ Complete, 🔄 In Progress, 📋 Planned)
   - Problem statement
   - Solution
   - Benefits
   - Implementation details
   - Related files

2. **Update Table of Contents** if adding a new category

3. **Link from relevant docs** (roadmap, guides, etc.)

4. **Commit with descriptive message** referencing this doc

---

## Related Documentation

- `MIGRATION-ROADMAP.md` - Migration from HTML to node-based system
- `TEMPLATE-BUILDING-STRATEGY.md` - Strategy for building templates
- `README.md` - Project overview
