# Migration Guide: Current System → Node-Based System

## 🎯 The Big Picture (In Plain English)

### What You Have Now
Right now, your app works like a **find-and-replace tool**:
- You have HTML files with placeholder text like "Placeholder Text"
- When someone fills out the form, the app finds "Placeholder Text" and replaces it with their actual text
- Colors work the same way: find "#3D9DFF" and replace with the user's color

**The Problem**: This works great for simple templates you create yourself, but it breaks when:
- You want to import designs from Figma/Illustrator (they don't have consistent naming)
- Text is too long and breaks the layout
- You want multiple layout variations (currently you need separate HTML files)
- Colors are in gradients or effects (not just simple hex codes)

### What You're Moving To
A **node-based system** where:
- Templates are stored as a "graph" of elements (like a blueprint)
- Each element knows its position, size, and what it's connected to
- Variants are just "hide this element" or "move this element" rules
- Colors use "tokens" (like "primary color") instead of hex codes
- Text and images have rules to prevent layout breaks

**The Benefit**: You can import from Figma, handle complex layouts, and scale much easier.

---

## 🔄 What's Actually Changing?

### 1. How Templates Are Stored

**Now**: HTML files (`template-1.html`, `template-2.html`, etc.)
- You edit HTML directly
- Each variant needs a separate file

**Future**: Node graph (stored in database)
- You edit a visual structure (or import from Figma)
- Variants are just "show/hide" rules on the same structure

**What This Means For You**:
- ✅ You won't need to maintain 3 separate HTML files per template
- ✅ You can import from Figma instead of manually coding HTML
- ❌ You'll need to convert existing templates once (one-time work)

---

### 2. How Colors Work

**Now**: Find and replace hex codes
- Template has `#3D9DFF`
- User picks a color
- App finds all `#3D9DFF` and replaces them

**Future**: Color tokens
- Template says "use primary color"
- User picks what "primary color" means
- App applies that color everywhere it's used

**What This Means For You**:
- ✅ More reliable (works with gradients, effects, etc.)
- ✅ Easier for users (change one "primary color" setting)
- ❌ Need to convert existing templates to use tokens

---

### 3. How Text/Images Are Placed

**Now**: Simple replacement
- Find "Placeholder Text" → Replace with user text
- No rules about what happens if text is too long

**Future**: Smart placement with rules
- Text has max lines, auto-sizing, overflow rules
- Images have fit modes (cover, contain), focal points
- Layout won't break if content is longer

**What This Means For You**:
- ✅ Templates won't break with long text or wrong image sizes
- ✅ Better user experience
- ❌ Need to define rules for each text/image area

---

### 4. How Variants Work

**Now**: Separate HTML files
- `template-1.html` for 1 speaker
- `template-2.html` for 2 speakers
- `template-3.html` for 3 speakers
- If you change the design, you update 3 files

**Future**: One structure + override rules
- One template structure
- Variant 1: "Hide speaker 2 and 3"
- Variant 2: "Hide speaker 3"
- Variant 3: "Show all speakers"
- Change design once, all variants update

**What This Means For You**:
- ✅ Much less maintenance
- ✅ Easier to add new variants
- ❌ Need to restructure existing templates

---

### 5. How Assets Are Stored

**Now**: Base64 in database
- Images converted to text, stored in database
- Works but gets slow with many/large images

**Future**: Object storage (S3/R2)
- Images stored in cloud storage
- Database just stores URLs
- Faster and cheaper at scale

**What This Means For You**:
- ✅ Better performance
- ✅ Lower costs at scale
- ❌ Need to set up cloud storage account

---

### 6. How Rendering Works

**Now**: Direct rendering
- User submits → App renders immediately
- If it times out, user sees error

**Future**: Job queue
- User submits → Job created
- Worker processes job in background
- User sees "processing" status, then results when ready
- Automatic retries if it fails

**What This Means For You**:
- ✅ More reliable (handles timeouts gracefully)
- ✅ Better user experience
- ❌ Need to set up job queue system

---

## 📋 Migration Plan (Step by Step)

### Phase 1: Foundation (Do This First)
**Goal**: Build the node graph system without breaking current templates

**What Happens**:
1. Create node graph data structure (code)
2. Build compiler that converts node graph → HTML (code)
3. Keep current HTML templates working (no changes to your workflow)

**What You Do**:
- Nothing! This is all code work
- Keep using templates as normal

**Timeline**: 2-4 weeks (depending on complexity)

---

### Phase 2: Convert Existing Templates
**Goal**: Convert your current templates to node graphs

**What Happens**:
1. Create conversion tool (code)
2. Convert `mtl-code` template to node graph
3. Convert `code-a-quebec` template to node graph
4. Test that they render the same as before

**What You Do**:
- Review converted templates
- Test that they work correctly
- Provide feedback on any issues

**Timeline**: 1-2 weeks

---

### Phase 3: Figma Plugin (Import System)
**Goal**: Allow importing designs from Figma

**What Happens**:
1. Build Figma plugin (code)
2. Plugin exports design as node graph
3. Create template editor UI (you map layers to fields)

**What You Do**:
- Install Figma plugin
- Test importing a design
- Map layers to fields in editor
- Provide feedback on workflow

**Timeline**: 4-6 weeks

---

### Phase 4: Variant System
**Goal**: Replace separate HTML files with variant overrides

**What Happens**:
1. Update compiler to handle variants
2. Convert templates to use variant overrides
3. Remove separate HTML files

**What You Do**:
- Test that variants still work
- Verify layout is correct

**Timeline**: 1-2 weeks

---

### Phase 5: Token System
**Goal**: Replace hex colors with color tokens

**What Happens**:
1. Update templates to use tokens
2. Update UI to show token picker
3. Remove hex replacement code

**What You Do**:
- Test color changes
- Verify all colors update correctly

**Timeline**: 1-2 weeks

---

### Phase 6: Object Storage
**Goal**: Move assets to cloud storage

**What Happens**:
1. Set up S3/R2 account
2. Migrate existing assets
3. Update code to use cloud storage

**What You Do**:
- Set up cloud storage account (or approve setup)
- Test that images load correctly

**Timeline**: 1 week

---

### Phase 7: Render Queue
**Goal**: Make rendering more reliable

**What Happens**:
1. Build job queue system
2. Update rendering to use queue
3. Add status tracking UI

**What You Do**:
- Test submission flow
- Verify status updates work

**Timeline**: 2-3 weeks

---

## 🎯 Your Role in This Migration

### What You Need to Do

1. **Review & Test**
   - Test each phase as it's completed
   - Provide feedback on what works/doesn't work
   - Report any bugs or issues

2. **Make Decisions**
   - Approve design choices (UI, workflow)
   - Decide on priorities (what to build first)
   - Approve cloud storage setup

3. **Provide Content**
   - Test designs in Figma plugin
   - Create example templates
   - Document any template-specific requirements

### What You DON'T Need to Do

- ❌ Write code (unless you want to)
- ❌ Understand the technical details
- ❌ Manage the migration timeline
- ❌ Debug technical issues

---

## 📊 Timeline Overview

**Total Timeline**: ~12-20 weeks (3-5 months)

**Quick Wins** (Can do in parallel):
- Phase 1: Foundation
- Phase 6: Object Storage (setup)

**Core Features** (Sequential):
- Phase 2: Convert templates
- Phase 3: Figma plugin
- Phase 4: Variants
- Phase 5: Tokens

**Polish** (After core):
- Phase 7: Render queue

---

## 🚦 How to Stay in Sync

### Weekly Check-ins
- Review what was completed
- Test new features
- Discuss any blockers

### Decision Points
- Before Phase 3: Approve Figma plugin approach
- Before Phase 6: Approve cloud storage provider
- Before Phase 7: Approve job queue system

### Questions to Ask
- "Does this work the same as before?" (for conversions)
- "Is this easier to use?" (for new features)
- "What breaks if we do this?" (for major changes)

---

## 🎓 Key Concepts (Simple Explanations)

### Node Graph
**Think of it like**: A blueprint of your template
- Instead of HTML code, it's a list of elements with positions
- Like a floor plan showing where everything goes

### Variant Override
**Think of it like**: Showing/hiding furniture in a room
- Same room (template), different furniture arrangements (variants)
- Instead of 3 different rooms, you have 1 room with 3 arrangements

### Color Token
**Think of it like**: A paint color name
- Instead of "use this exact blue (#3D9DFF)"
- You say "use the primary color" and define what that means

### Compiler
**Think of it like**: A translator
- Takes the node graph (blueprint)
- Converts it to HTML (the actual code)
- Like translating a blueprint into construction instructions

### Job Queue
**Think of it like**: A to-do list
- Instead of doing work immediately (might fail)
- Add to list, worker does it when ready
- Can retry if it fails

---

## ✅ Success Criteria

You'll know the migration is successful when:

1. **Templates work the same** (or better) as before
2. **You can import from Figma** without coding HTML
3. **Variants are easier** to manage (one template, not three)
4. **Colors are more reliable** (work with gradients, effects)
5. **Rendering is more reliable** (handles timeouts, retries)
6. **System is faster** (object storage, better performance)

---

## 🆘 When to Ask Questions

Ask questions if:
- ❓ Something doesn't work the same as before
- ❓ A new feature is confusing or hard to use
- ❓ You're not sure what to test
- ❓ You need to make a decision but don't understand the options
- ❓ The timeline seems off

**Remember**: There are no stupid questions. If you're confused, ask!

---

## 📝 Summary

**What's Changing**:
- Templates: HTML files → Node graphs
- Variants: Separate files → Override rules
- Colors: Hex replacement → Tokens
- Storage: Database → Cloud storage
- Rendering: Direct → Job queue

**Why**:
- Import from Figma/Illustrator
- Handle complex layouts
- Scale better
- More reliable

**How**:
- Phased approach (7 phases)
- You test and provide feedback
- Code handles the technical work
- ~3-5 months total

**Your Role**:
- Test each phase
- Provide feedback
- Make decisions
- Ask questions

---

This migration will make your system much more powerful and scalable, but it's a big change. Take it one phase at a time, test thoroughly, and don't hesitate to ask questions!

