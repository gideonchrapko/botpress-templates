# Migration Guide: Current System → Node-Based System

## 🎯 The Big Picture (In Plain English)

### What You Have Now
Right now, your app works like a **find-and-replace tool**:
- You have HTML files with placeholder text like "Placeholder Text"
- When someone fills out the form, the app finds "Placeholder Text" and replaces it with their actual text
- Colors work the same way: find "#3D9DFF" and replace with the user's color
- Each layout variation (1 speaker, 2 speakers, 3 speakers) needs a separate HTML file

**The Problem**: This works great for simple templates you create yourself, but it breaks when:
- You want to import designs from Figma/Illustrator (they don't have consistent naming)
- Text is too long and breaks the layout
- You want multiple layout variations (currently you need separate HTML files)
- Colors are in gradients or effects (not just simple hex codes)
- You want to support long-format content (multi-page documents)

### What You're Moving To
A **node-based system** where:
- **Nodes are the source of truth** - Templates are stored as a "graph" of elements (like a blueprint)
- **HTML is compiled output** - Generated from nodes specifically for Puppeteer rendering
- Each element (node) knows its position, size, constraints, and what it's connected to
- Variants are just "hide this element" or "move this element" rules on the same node graph
- Colors use "tokens" (like "primary color") instead of hex codes
- Text and images have rules to prevent layout breaks
- Long-format content flows across multiple pages automatically

**The Benefit**: 
- ✅ Import from Figma/Illustrator directly
- ✅ Handle complex layouts and variants easily
- ✅ Support multi-page documents
- ✅ Scale much easier
- ✅ Better user experience

---

## 🏗️ Core Architecture Principle

**Nodes are the source of truth. HTML is compiled output.**

```
┌─────────────────────────────────────┐
│   Source of Truth: Node Graphs       │
│   (From Figma/Illustrator/Manual)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Compiler: Node → HTML              │
│   (Generates HTML for Puppeteer)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Rendering: Puppeteer               │
│   (HTML → PNG/PDF/WebP)             │
└─────────────────────────────────────┘
```

**Key Points**:
- You edit/manage templates as **node graphs** (not HTML)
- HTML is automatically generated when needed for rendering
- Legacy HTML templates work during migration (backwards compatibility)
- Eventually, all templates will be node graphs

---

## 🔄 What's Actually Changing?

### 1. How Templates Are Stored

**Now**: HTML files (`template-1.html`, `template-2.html`, etc.)
- You edit HTML directly
- Each variant needs a separate file
- Hard to maintain consistency

**Future**: Node graph (stored in database)
- You edit a visual structure (or import from Figma/Illustrator)
- Variants are just "show/hide" rules on the same structure
- Single source of truth

**What This Means For You**:
- ✅ You won't need to maintain 3 separate HTML files per template
- ✅ You can import from Figma/Illustrator instead of manually coding HTML
- ✅ Changes to design update all variants automatically
- ❌ You'll need to convert existing templates once (one-time work)

---

### 2. How Templates Are Created

**Now**: 
1. Design in Figma/Illustrator
2. Manually recreate in HTML
3. Hardcode replacement rules
4. Create separate HTML file for each variant

**Future**:
1. Design in Figma/Illustrator
2. Import directly (Figma plugin or Illustrator export)
3. Map layers to fields (visual editor)
4. Variants created automatically (override rules)

**What This Means For You**:
- ✅ Much faster template creation (minutes vs hours)
- ✅ No manual HTML coding
- ✅ Design changes sync automatically
- ✅ Less room for error

---

### 3. How Colors Work

**Now**: Find and replace hex codes
- Template has `#3D9DFF` hardcoded
- User picks a color, system finds all `#3D9DFF` and replaces them
- Problem: Same visual color might be `#3D9FF0` in gradients or effects
- Problem: Can't easily change "all primary colors" at once

**Future**: Semantic color tokens
- Template uses token: `{ token: "primary" }`
- User picks "Primary Color" (semantic name, not hex)
- System applies to all elements using that token
- Works with gradients, effects, shadows

**What This Means For You**:
- ✅ Better UX (users see "Primary Color" not "#3D9FF0")
- ✅ Colors update everywhere consistently
- ✅ Works with gradients and effects
- ✅ Can lock certain colors (don't allow editing)

---

### 4. How Variants Work

**Now**: Separate HTML files
- `template-1.html` (1 speaker)
- `template-2.html` (2 speakers)
- `template-3.html` (3 speakers)
- Changes to design = update 3 files

**Future**: Override system on single node graph
- One node graph with all elements
- Variant "2-speakers" = hide speaker[2], show speaker[1]
- Variant "3-speakers" = show all speakers
- Changes to design = update once, all variants update

**What This Means For You**:
- ✅ Easier to maintain (one source of truth)
- ✅ Easier to create new variants
- ✅ Consistent design across variants
- ✅ Less code duplication

---

### 5. How Text and Images Work

**Now**: Simple replacement
- Find "Placeholder Text" → replace with user text
- Problem: Long text breaks layout
- Problem: Images might not fit correctly

**Future**: Constraint-based layout
- Text nodes have rules: max lines, truncation, auto-fit
- Image nodes have rules: fit mode (cover/contain), focal point
- System prevents layout breaks automatically

**What This Means For You**:
- ✅ No more broken layouts from long text
- ✅ Images always fit correctly
- ✅ Better user experience
- ✅ Less manual testing needed

---

### 6. How Long-Format Content Works (New!)

**Now**: Not supported
- Only single-page posters
- Can't handle multi-page documents

**Future**: Multi-page node graphs
- Page nodes (containers)
- Content flows across pages automatically
- Text auto-flows with page breaks
- Headers/footers on each page
- PDF output for documents

**What This Means For You**:
- ✅ Support for reports, catalogs, brochures
- ✅ Long-form content (articles, documents)
- ✅ Automatic page breaks
- ✅ Professional document output

---

## 📋 Migration Phases Overview

### Phase 1: Foundation (Weeks 1-4)
Build the node graph system without breaking current templates
- Create node graph data structure
- Build compiler (nodes → HTML)
- Support both formats (nodes + legacy HTML)

### Phase 2: Convert Templates (Weeks 5-6)
Convert your existing HTML templates to node graphs
- Convert `mtl-code` template
- Convert `code-a-quebec` template
- Test that everything still works

### Phase 3: Design Tool Import (Weeks 7-12)
Allow importing from Figma and Illustrator
- Build Figma plugin
- Build Illustrator import (via SVG/PDF)
- Create template editor UI

### Phase 4: Variants (Weeks 13-14)
Replace separate HTML files with variant overrides
- Update compiler for variants
- Remove separate HTML files
- Test all variants

### Phase 5: Tokens (Weeks 15-16)
Replace hex colors with semantic tokens
- Update to use tokens
- Update UI to show token picker
- Test color changes

### Phase 6: Cloud Storage (Week 17)
Move assets to cloud storage
- Set up S3/R2
- Migrate assets
- Update code to use cloud URLs

### Phase 7: Render Queue (Weeks 18-20)
Make rendering more reliable
- Build job queue
- Add status tracking
- Add retry logic

### Phase 8: Long-Format Content (Weeks 21-24)
Support multi-page documents
- Extend node graph for pages
- Build document renderer
- Test with long content

---

## 🚀 What You Need to Do

### During Migration

**Your Responsibilities**:
1. **Test each phase** - Make sure converted templates work the same
2. **Provide feedback** - Does the new system make sense?
3. **Test imports** - Try importing from Figma/Illustrator
4. **Report issues** - If something breaks, let me know immediately

**What You DON'T Need to Do**:
- ❌ Write code (I'll handle that)
- ❌ Understand the technical details (this guide explains it)
- ❌ Migrate templates manually (tools will do it)

### After Migration

**You'll Be Able To**:
- ✅ Import templates from Figma in minutes
- ✅ Import templates from Illustrator (via SVG/PDF)
- ✅ Create variants easily (no separate files)
- ✅ Change colors globally (tokens)
- ✅ Support long-format content (documents)
- ✅ Create templates much faster

---

## ⚠️ Important Notes

### Backwards Compatibility

**During Migration**:
- ✅ Current HTML templates keep working
- ✅ No breaking changes
- ✅ Gradual migration (one template at a time)

**After Migration** (Hybrid System):
- ✅ Templates can be node graphs OR HTML (explicit choice per template)
- ✅ HTML templates remain first-class citizens (not deprecated)
- ✅ Use node graphs for simple posters, HTML for complex/long-format
- ✅ HTML files can be kept or removed (optional, based on template needs)

### Breaking Changes

**None during migration!** The system supports both formats:
- New templates = node graphs
- Old templates = HTML (still work)
- Gradual conversion

### Timeline

**Total**: 24 weeks (~6 months)
- Phases 1-2: Foundation + conversion (6 weeks)
- Phases 3-5: Core features (10 weeks)
- Phases 6-7: Infrastructure (4 weeks)
- Phase 8: Long-format (4 weeks)

**You can use the system throughout** - no downtime!

---

## 🎯 Success Criteria

The migration is successful when:

- [ ] All existing templates work (no regression)
- [ ] Can import from Figma (node graphs)
- [ ] Can import from Illustrator (node graphs)
- [ ] Nodes are source of truth (not HTML)
- [ ] HTML is just compiled output (for Puppeteer)
- [ ] Variants are easier to manage (overrides, not separate files)
- [ ] Colors work with tokens (gradients/effects supported)
- [ ] Rendering is more reliable (queue system)
- [ ] System is faster (cloud storage, caching)
- [ ] Long-format content works (multi-page documents)
- [ ] User experience is better (easier template creation)

---

## 📚 Technical Details (Optional Reading)

### Node Graph Structure

A node graph is a tree of elements:

```
Template (Root Node)
├── Page (Container Node)
│   ├── Text Node (eventTitle)
│   │   ├── Position: {x: 100, y: 50}
│   │   ├── Size: {width: 400, height: 60}
│   │   ├── Binding: "eventTitle"
│   │   └── Constraints: {maxLines: 2, truncate: true}
│   ├── Image Node (logo)
│   │   ├── Position: {x: 50, y: 50}
│   │   ├── Size: {width: 200, height: 200}
│   │   ├── Binding: "logo"
│   │   └── Fit: "contain"
│   └── Group Node (speakers)
│       ├── Layout: "vertical"
│       └── Children: [speaker1, speaker2, speaker3]
```

### Variant Overrides

Variants are just sets of overrides:

```javascript
{
  variant: "2-speakers",
  overrides: [
    { node: "speaker[2]", action: "hide" },
    { node: "speaker[1]", action: "show" }
  ]
}
```

### Token System

Colors stored as tokens:

```javascript
// Instead of:
{ fill: "#3D9FF0" }

// We use:
{ fill: { token: "primary" } }

// Then resolve:
const color = tokens.primary; // "#3D9FF0"
```

### Compiler Process

1. Load node graph
2. Apply variant overrides
3. Resolve tokens to colors
4. Apply bindings (field values)
5. Generate HTML with CSS
6. Output ready for Puppeteer

---

## 🔍 FAQ

### Q: Will my existing templates break?
**A**: No! They'll keep working. We'll convert them gradually.

### Q: Do I need to learn node graphs?
**A**: No! You'll use visual tools (Figma import, template editor).

### Q: Can I still edit HTML directly?
**A**: During migration, yes. After migration, templates will be node graphs (but you can still export HTML if needed).

### Q: What if I want to create a template manually?
**A**: You can use the template editor UI (no coding required).

### Q: How long will migration take?
**A**: About 6 months, but you can use the system throughout.

### Q: What happens to my HTML files?
**A**: They'll be converted to node graphs. You can keep them as backup.

### Q: Can I import from other design tools?
**A**: Figma and Illustrator are first. Others can be added later.

### Q: Will long-format content work with current templates?
**A**: Current templates are single-page. Long-format is for new document templates.

### Q: What if something goes wrong?
**A**: We support both formats during migration, so we can roll back if needed.

---

## 📞 Getting Help

If you have questions or issues:

1. **Check the roadmap** - See what phase we're in
2. **Check this guide** - Your question might be answered here
3. **Test and report** - If something doesn't work, let me know
4. **Provide feedback** - Your input shapes the system

---

## ✅ Next Steps

1. **Read the roadmap** - Understand the phases
2. **Wait for Phase 1** - Foundation will be built first
3. **Test Phase 2** - When templates are converted, test them
4. **Try Phase 3** - Import a design from Figma/Illustrator
5. **Enjoy the benefits** - Faster template creation, better system

---

**Last Updated**: [Date]
**Current Phase**: Phase 1 - Foundation

---

> 💡 **Remember**: This is a gradual migration. Your current system keeps working while we build the new one. No rush, no pressure - just steady progress toward a better system!
