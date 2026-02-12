# Template Building Strategy: Manual → Node-Based Schema

## Goal
Build templates now that will migrate smoothly to a node-based system (not string replacement).

## ⚠️ Important: Architecture Shift

**Current**: String replacement in HTML (`html.replace(pattern, value)`)
**Future**: Node-based graph → Compile to HTML

**Key Changes Coming**:
1. Templates will be node graphs, not HTML files
2. Variants will be overrides, not separate files
3. Colors will be tokens, not hex replacement
4. Text/images will have constraints and rules
5. Assets will be in object storage, not base64 in DB

---

## ✅ What to Keep Manual (For Now)

### 1. **Template-Specific Data in Config Files**
**Keep in `config.json`**:
- Field definitions (name, type, label, validation)
- Replacement patterns (what to find/replace in HTML)
- Date/time formats
- Asset mappings (logos, decorations)
- Address/location data
- Color replacements

**Why**: This is exactly what will become the schema later. Config = Schema v1.

### 2. **HTML Templates** (Temporary)
**Keep manual for now**:
- Your HTML template files (`template-1.html`, etc.)
- Inline styles (keep as-is)
- Structure and layout

**Future**: These will be compiled from node graphs, not maintained manually.

**Migration Strategy**: 
- Keep HTML files working
- When node system is ready, manually convert HTML → node graph once
- Then maintain node graph, not HTML

### 3. **Template Metadata**
**Keep in `config.json`**:
- Template name, ID
- Dimensions (width, height)
- Variants list

**Why**: This maps directly to schema properties.

---

## ❌ What NOT to Hardcode (Avoid These)

### 1. **Template-Specific Logic in Code**
**❌ DON'T DO THIS:**
```typescript
// In template-engine.ts
if (templateFamily === "mtl-code") {
  // mtl-code specific logic
} else if (templateFamily === "code-a-quebec") {
  // code-a-quebec specific logic
}
```

**✅ DO THIS INSTEAD:**
```typescript
// In config.json
{
  "dateFormat": "EEEE, MMMM d",
  "locale": "en"
}

// In template-engine.ts
const format = config.fields.find(f => f.name === "eventDate")?.format;
formatDate(date, format, locale);
```

**Why**: Schema system will read from config/schema, not conditionals.

---

### 2. **Hardcoded Field Lists**
**❌ DON'T DO THIS:**
```typescript
// In DynamicForm.tsx
if (templateFamily === "mtl-code") {
  return <MTLCodeSpecificFields />;
}
```

**✅ DO THIS INSTEAD:**
```typescript
// DynamicForm already does this correctly!
config.fields.map(field => <FieldComponent field={field} />);
```

**Why**: Already abstracted! ✅

---

### 3. **Hardcoded Replacement Patterns**
**❌ DON'T DO THIS:**
```typescript
// In template-engine.ts
if (templateFamily === "code-a-quebec") {
  html.replace(/(lundi|mardi...)/gi, formattedDate);
} else {
  html.replace(/Thursday, November 20/g, formattedDate);
}
```

**✅ DO THIS INSTEAD:**
```typescript
// In config.json
{
  "replacements": [
    { "pattern": "Thursday, November 20", "type": "date" },
    { "pattern": "(lundi|mardi...)", "type": "date", "regex": true, "flags": "gi" }
  ]
}

// In template-engine.ts
for (const replacement of field.replacements) {
  if (replacement.regex) {
    html.replace(new RegExp(replacement.pattern, replacement.flags), value);
  } else {
    html.replace(replacement.pattern, value);
  }
}
```

**Why**: Schema system will use the same replacement structure.

---

### 4. **Hardcoded Asset Swaps**
**❌ DON'T DO THIS:**
```typescript
if (assetFile === "mtl-code-wide.svg" && templateFamily === "code-a-quebec") {
  assetFile = "code-@-québec-long.svg";
}
```

**✅ DO THIS INSTEAD:**
```typescript
// In config.json
{
  "assets": {
    "logo": {
      "default": "mtl-code-wide.svg",
      "swap": {
        "code-a-quebec": "code-@-québec-long.svg"
      }
    }
  }
}

// In template-engine.ts
const logoFile = config.assets.logo.swap[templateFamily] || config.assets.logo.default;
```

**Why**: Already doing this! ✅

---

### 5. **Hardcoded Addresses**
**❌ DON'T DO THIS:**
```typescript
// In api/submit/route.ts
if (templateFamily === "mtl-code") {
  addressLine = "400 Blvd. De Maisonneuve Ouest";
} else if (templateFamily === "code-a-quebec") {
  addressLine = "875 Bd Charest O Suite 200";
}
```

**✅ DO THIS INSTEAD:**
```typescript
// In config.json
{
  "address": {
    "venueName": "Botpress HQ",
    "addressLine": "400 Blvd. De Maisonneuve Ouest",
    "cityLine": "Montreal, QC  H3A 1L4"
  }
}

// In api/submit/route.ts
const address = config.address;
```

**Why**: Already doing this! ✅

---

## 🎯 Preparing for Node-Based System

### What to Do Now (While Building Templates)

1. **Use Consistent Layer Naming**
   - Name layers with bindings: `{{eventTitle}}`, `{{primary}}`, `{{speaker[0].name}}`
   - Makes future import easier
   - Even in HTML, use `data-field` attributes

2. **Document Layout Constraints**
   - Note which elements should pin/scale
   - Document text overflow behavior
   - Note image fit requirements

3. **Group Related Elements**
   - Keep speaker sections as groups
   - Makes variant overrides easier later

4. **Use Semantic Color Names**
   - Even if using hex, document: "This is primary color"
   - Makes token mapping easier

### What Will Change

- **HTML files** → Node graphs (one-time conversion)
- **String replacement** → Node binding resolution
- **Separate variant files** → Variant overrides
- **Hex colors** → Color tokens
- **Base64 in DB** → Object storage (S3/R2)

---

## 📋 Template Creation Checklist

When creating a new template, ensure:

### ✅ Config File Structure
```json
{
  "id": "template-name",
  "name": "Template Display Name",
  "width": 1080,
  "height": 1350,
  "variants": ["1", "2", "3"],
  
  "fields": [
    {
      "type": "text|color|date|time|people",
      "name": "fieldName",
      "label": "Field Label",
      "default": "defaultValue",  // if applicable
      "maxLength": 60,            // if applicable
      "format": "EEEE, MMMM d",   // for dates
      "locale": "en",             // for dates
      "prefix": "Doors open @ ",  // for times
      "replacements": [
        {
          "pattern": "Placeholder Text",
          "type": "text",
          "regex": false,          // optional
          "flags": "gi"            // if regex
        }
      ]
    }
  ],
  
  "assets": {
    "logo": {
      "default": "logo.svg",
      "swap": {}
    },
    "decoration": {
      "file": "decoration.svg",
      "colorReplacements": ["#3D9DFF"]
    }
  },
  
  "colorReplacements": {
    "#B5DAFF": "secondaryColor"
  },
  
  "address": {
    "venueName": "Venue Name",
    "addressLine": "Street Address",
    "cityLine": "City, State ZIP"
  }
}
```

### ✅ HTML Template Standards
- Use consistent placeholder text (document in config)
- Use `data-*` attributes where possible (future-proofing)
- Keep structure consistent across variants
- Document any special cases in comments

### ✅ Code Abstraction
- All template-specific logic in `config.json`
- No `if (templateFamily === "...")` conditionals
- Use config-driven logic everywhere
- Keep `template-engine.ts` generic

---

## 🔄 Migration Path (When Ready)

### Current State → Schema System

**Step 1**: Config.json → Schema.ts
- Config structure already matches schema structure
- Just convert JSON → TypeScript
- Add type annotations
- **Zero logic changes needed**

**Step 2**: DynamicForm → SchemaForm
- `DynamicForm` already reads from config
- `SchemaForm` will read from schema
- Same field rendering logic
- **Minimal changes needed**

**Step 3**: Template Engine → Schema Renderer
- Engine already uses config for replacements
- Schema renderer will use schema.replacements
- Same replacement logic
- **Minimal changes needed**

---

## 🎯 Key Principles

### 1. **Config is the Source of Truth**
Everything template-specific goes in `config.json`. Code stays generic.

### 2. **No Template-Specific Conditionals**
If you find yourself writing `if (templateFamily === "...")`, move that logic to config.

### 3. **Consistent Patterns**
Use the same field structure, replacement format, asset structure across all templates.

### 4. **Document Edge Cases**
If a template needs special handling, document it in config comments, not in code comments.

---

## ⚠️ Red Flags (Stop and Refactor)

If you catch yourself doing any of these, refactor immediately:

1. **Adding template-specific if/else in code**
   → Move to config

2. **Creating template-specific components**
   → Make it generic, use config

3. **Hardcoding values in code**
   → Move to config

4. **Duplicating logic per template**
   → Abstract to generic function, use config

---

## ✅ What You're Already Doing Right

1. ✅ **Config-driven forms** - `DynamicForm` reads from config
2. ✅ **Config-driven renderer** - `template-engine` uses config
3. ✅ **Generic field components** - Reused across templates
4. ✅ **Address in config** - Not hardcoded
5. ✅ **Asset swaps in config** - Not hardcoded

**You're 90% there!** Just avoid adding template-specific conditionals.

---

## 📝 Template Creation Workflow

### For Each New Template:

1. **Create folder structure**
   ```
   templates/{family}/
     config.json
     template-1.html
     template-2.html
     template-3.html
   ```

2. **Copy base config.json** from existing template
   - Change `id`, `name`, `width`, `height`
   - Update `fields` array
   - Update `replacements` patterns
   - Update `assets` if needed
   - Update `address` if needed

3. **Create HTML templates**
   - Use placeholders that match config `replacements`
   - Keep structure consistent
   - Add `data-*` attributes if possible

4. **Test**
   - Form generates correctly? ✅
   - Renderer replaces correctly? ✅
   - No hardcoded conditionals? ✅

5. **Done!** No code changes needed.

---

## 🚀 Scalability Checklist

Before adding a new template, ask:

- [ ] Can I do this with just a new `config.json`?
- [ ] Do I need to modify any code files?
- [ ] Are there any `if (templateFamily === "...")` checks?
- [ ] Is this logic reusable for other templates?

If you answer "yes" to modifying code, refactor to make it config-driven first.

---

## Summary

**Keep Manual (Good)**:
- Config.json files (source of truth)
- HTML templates
- Template-specific data (in config)

**Avoid Hardcoding (Bad)**:
- Template conditionals in code
- Template-specific components
- Hardcoded values in code
- Duplicated logic

**Current State**: You're already doing it right! Just maintain this pattern.

**Future Migration**: Config → Schema will be straightforward because structure matches.

