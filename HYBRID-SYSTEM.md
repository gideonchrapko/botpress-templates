# Hybrid Template System

This system supports both **node graph** and **HTML** template rendering, allowing you to choose the right tool for each template.

## When to Use Each Format

### Use **Node Graphs** (`format: "node"`) for:
- ✅ Simple posters with fixed layouts
- ✅ Short, predictable text content
- ✅ Templates imported from Figma/Illustrator (simple designs)
- ✅ When you need programmatic template manipulation
- ✅ Single-page designs (1080×1350 posters)

### Use **HTML Templates** (`format: "html"`) for:
- ✅ Long-format content (multi-page documents)
- ✅ Dynamic text that varies significantly in length
- ✅ Complex layouts with text wrapping/overflow
- ✅ Content that needs truncation or ellipsis
- ✅ Templates with complex CSS that's hard to convert
- ✅ When you need full control over HTML/CSS

## How to Configure Format

### Option 1: Explicit Format in `config.json` (Recommended)

Add a `format` field to your template's `config.json`:

```json
{
  "id": "mtl-code",
  "name": "MTL Code Event Poster",
  "format": "node",  // or "html"
  "width": 1080,
  "height": 1350,
  ...
}
```

### Option 2: Auto-Detection (Fallback)

If `format` is not specified, the system auto-detects based on file presence:

1. **Node format** if `schema-layout-{variant}.json` or `schema.json` exists
2. **HTML format** if `template-{variant}.html` exists
3. **Defaults to HTML** for backwards compatibility

## Format Priority

The system checks in this order:

1. **`config.json` format field** (highest priority - explicit choice)
2. **File presence** (schema files = node, HTML files = html)
3. **Default to HTML** (backwards compatibility)

## Examples

### Example 1: Node Graph Template

```json
// templates/simple-poster/config.json
{
  "id": "simple-poster",
  "name": "Simple Event Poster",
  "format": "node",  // Explicitly use node renderer
  "width": 1080,
  "height": 1350,
  ...
}
```

### Example 2: HTML Template (Long-Format)

```json
// templates/newsletter/config.json
{
  "id": "newsletter",
  "name": "Monthly Newsletter",
  "format": "html",  // Explicitly use HTML renderer
  "width": 1080,
  "height": 1350,
  ...
}
```

### Example 3: Auto-Detection

```json
// templates/auto-template/config.json
{
  "id": "auto-template",
  "name": "Auto-Detected Template",
  // No format field - will auto-detect based on files
  "width": 1080,
  "height": 1350,
  ...
}
```

## Migration Path

### Current Templates (HTML)
- Keep `format: "html"` or omit format field
- HTML templates continue to work as before
- No changes required

### Converting to Node Graphs
1. Convert HTML → node schema using `scripts/convert-template.ts`
2. Add `"format": "node"` to `config.json`
3. Test rendering to ensure pixel parity
4. Keep HTML files as backup during transition

## Error Handling

- If node renderer fails, automatically falls back to HTML renderer
- If node schema not found, falls back to HTML renderer
- Logs warnings/errors for debugging

## Benefits of Hybrid System

1. **Flexibility**: Use the right tool for each template
2. **Gradual Migration**: Convert templates one at a time
3. **Backwards Compatible**: Existing HTML templates work unchanged
4. **Future-Proof**: Easy to add new formats later
5. **Best of Both Worlds**: Node graphs for simple, HTML for complex

