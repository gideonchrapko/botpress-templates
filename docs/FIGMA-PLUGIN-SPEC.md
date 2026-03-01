# Figma Plugin Spec: Template Export to Botpress Templates

This document describes how to build a **Figma plugin** that exports one or more frames as templates and sends them to the Botpress Templates project (production or local). Use it to implement a plugin that designers can run inside Figma to push designs directly into the app.

**Single source of truth:** This file lives in the **Botpress Templates** repo (`docs/FIGMA-PLUGIN-SPEC.md`). When the import API or payload format changes, update this doc here first. The Figma plugin project should sync from this file (copy, submodule, or link) so both sides stay aligned.

---

## 1. Goal

- **In Figma:** User selects one or more frames (each frame = one template).
- **Plugin:** For each selected frame, builds the export payload (node tree + SVGs + images), then sends it to a configurable backend URL.
- **Backend:** Accepts the payload at `POST /api/import/figma`, creates/updates the template, and returns success.
- **Environments:** User can choose **Production** (e.g. `https://your-app.com`) or **Local** (e.g. `http://localhost:3000`) so the same plugin works for both.

---

## 2. Backend API Contract

### Endpoint

```
POST {baseUrl}/api/import/figma
```

- **Production:** `baseUrl` = e.g. `https://templates.botpress.com`
- **Local:** `baseUrl` = `http://localhost:3000` (or whatever the dev server uses)

### Request

- **Content-Type:** `application/json`
- **Body:** Single JSON object matching the [Export payload schema](#4-export-payload-schema) below.
- **Auth:** The endpoint is protected by **session auth** (user must be logged in). The server reads the session from the request (e.g. cookie).  
  - **Implication for the plugin:** A direct `fetch()` from the Figma plugin sandbox does not send the user’s browser cookies. You have two options:
    1. **Open in browser:** Plugin generates the payload, then opens a URL on your app (e.g. `https://your-app.com/import/figma?payload=...` or a form that POSTs the payload). The user is already logged in there, so the request is authenticated.
    2. **API key (if you add it):** Backend could support an optional header (e.g. `Authorization: Bearer <api_key>`) for programmatic import; the plugin would then need a settings screen where the user pastes an API key. This would require a small backend change.

### Response

- **200:** `{ "success": true, "templateId": "...", "templatePath": "...", "configPath": "...", "htmlPath": "...", "message": "..." }`
- **400:** `{ "error": "Invalid Figma export format. Required: name, width, height, nodes[]" }`
- **401:** `{ "error": "Unauthorized" }`
- **500:** `{ "error": "Failed to import Figma template", "details": "..." }`

---

## 3. What the Backend Expects (High Level)

- **name:** Template name (e.g. from the frame name; used for template id and display).
- **width / height:** Frame dimensions in pixels.
- **nodes:** A single **root frame** node (the selected frame) with a **tree of children**. Coordinates inside the tree are **relative to the frame’s top-left** (origin at `(0, 0)`).
- **images:** Optional map `imageRef → base64 data URI` for bitmap images (e.g. photo fills).
- **svgs:** Optional map `nodeId → raw SVG string` for vector layers and for **masked image groups** (see below). Required for correct rendering of shapes and masked photos.

---

## 4. Export Payload Schema

TypeScript-style description of the JSON body:

```ts
interface FigmaExportPayload {
  name: string;   // e.g. "event-poster" (used for template id: slugified)
  width: number;  // frame width px
  height: number; // frame height px
  nodes: [        // array with exactly one root node (the frame)
    {
      id: string;
      name: string;
      type: "FRAME" | "GROUP" | "TEXT" | "RECTANGLE" | "VECTOR" | "ELLIPSE" | "COMPONENT" | "INSTANCE";
      x: number;   // relative to frame origin
      y: number;
      width: number;
      height: number;
      children?: FigmaExportNode[];
      // TEXT
      characters?: string;
      style?: {
        fontFamily?: string;
        fontSize?: number;
        fontWeight?: number;
        textAlign?: "LEFT" | "CENTER" | "RIGHT";
        fill?: string; // hex e.g. "#000000"
      };
      // Fills (SOLID or IMAGE)
      fills?: Array<
        | { type: "SOLID"; color: { r: number; g: number; b: number; a?: number } }
        | { type: "IMAGE"; imageRef: string }
      >;
    }
  ];
  images?: Record<string, string>; // imageRef → "data:image/png;base64,..." or similar
  svgs?: Record<string, string>;  // nodeId → raw SVG string (e.g. "<svg>...</svg>")
}
```

- **Coordinates:** All `x`, `y` (and sizes) for the root and every descendant must be in the same coordinate system: **relative to the exported frame’s top-left**. So when you export a frame, use its `absoluteBoundingBox` (or equivalent) as the origin and subtract that from every child’s position.
- **Ids:** Use the Figma node `id` (e.g. `"540:1850"`) for every node. The same ids are used in `svgs` and (for images) in `fills[].imageRef` / `images`.

---

## 5. Bindings (Dynamic Fields)

Layer **names** drive form fields and replacements:

- Names like `{{eventTitle}}`, `{{speakerImage-2}}`, `{{logo}}` are parsed as **bindings**.
- The backend creates a form field per unique binding and replaces these placeholders when users fill the form and generate the template.
- **Text:** `{{fieldName}}` on a TEXT node or a FRAME that contains a TEXT node.
- **Image:** `{{fieldName}}` on a RECTANGLE (or similar) with an IMAGE fill; the image can be swapped at generation time (e.g. speaker photo, logo).

Keep layer names exactly as in Figma (including `{{` and `}}`) in the exported `name` field.

---

## 6. What to Export as SVG (`svgs`)

To get correct rendering (and especially **masked images**), the backend needs SVG for:

1. **Vector/shape nodes:** Every node with `type` in `["VECTOR", "RECTANGLE", "ELLIPSE"]` that is part of the frame tree.  
   - Key in `svgs`: that node’s `id`.  
   - Value: raw SVG string for that node (e.g. via Figma’s `exportAsync(..., { format: 'SVG' })` for that node).

2. **Masked image groups:** Any **GROUP** that is a “masked image group”:
   - The group has exactly two children: one is a **shape** (VECTOR / RECTANGLE / ELLIPSE), the other is a **RECTANGLE with an IMAGE fill**.
   - For that **GROUP** node, export the **group** as SVG and put it in `svgs` under the **group’s** `id`.  
   - The backend uses this group SVG to get the real mask path (the Figma API often does not return SVG for the mask layer itself). If you only export the mask node, the backend may fall back to an ellipse.

So:

- Collect all node ids that are `VECTOR`, `RECTANGLE`, or `ELLIPSE` (for direct SVG export).
- Collect all GROUP ids that qualify as “masked image group” (two children: one shape, one image rect).
- For each of these ids, run SVG export and set `svgs[nodeId] = "<svg>...</svg>"`.

---

## 7. What to Export as Images (`images`)

- Any node with a fill of type `IMAGE` and an `imageRef` (paint hash) must have its bitmap in `images`.
- Key: the same `imageRef` used in `fills[].imageRef` in the node tree.
- Value: base64 data URI, e.g. `data:image/png;base64,...` or `data:image/jpeg;base64,...`.
- In a Figma plugin you can get the image bytes (e.g. via `figma.getImageByHash` + image bytes, or by exporting the node as PNG/JPEG) and then base64-encode and prefix with the appropriate data URI.

---

## 8. Plugin UX Suggestions

- **Selection:** User selects one or more frames. Plugin validates that selection is only frames (or only frames and no unrelated nodes).
- **Environment:**
  - Dropdown or buttons: **Production** vs **Local**.
  - Production URL: e.g. `https://templates.botpress.com` (could be stored in plugin settings).
  - Local URL: e.g. `http://localhost:3000` (with optional port field).
- **Export:**
  - “Export selected to Production” / “Export selected to Local” (or one “Export” that uses the selected environment).
  - For each selected frame, build the payload (node tree + `svgs` + `images`), then:
    - Either **POST** to `{baseUrl}/api/import/figma` (if you add API key auth), or
    - **Open the app in the browser** with the payload (e.g. via a form POST or a dedicated import page that reads the payload and calls the API with the user’s session).
- **Feedback:** Show success/error per frame (e.g. “Template ‘event-poster’ imported” or “Unauthorized – please log in at …”).

---

## 9. Coordinate System (Important)

- The backend expects the **root** of `nodes` to be the exported frame, with `x: 0`, `y: 0`, `width` and `height` = frame size.
- All descendants must use coordinates **relative to that frame’s top-left**:
  - When traversing the frame’s subtree, for each node use its absolute bounds minus the frame’s top-left:
    - `x = nodeAbsoluteX - frameAbsoluteX`
    - `y = nodeAbsoluteY - frameAbsoluteY`
- This matches how the backend positions elements in the generated HTML.

---

## 10. Example Payload (Minimal)

```json
{
  "name": "my-template",
  "width": 1920,
  "height": 1080,
  "nodes": [
    {
      "id": "794:4044",
      "name": "my-template",
      "type": "FRAME",
      "x": 0,
      "y": 0,
      "width": 1920,
      "height": 1080,
      "children": [
        {
          "id": "540:1846",
          "name": "Background",
          "type": "RECTANGLE",
          "x": 0,
          "y": 0,
          "width": 1920,
          "height": 1080,
          "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1, "a": 1 } }]
        },
        {
          "id": "540:1943",
          "name": "{{eventTitle}}",
          "type": "TEXT",
          "x": 100,
          "y": 200,
          "width": 400,
          "height": 80,
          "characters": "Event Name",
          "style": { "fontFamily": "Inter", "fontSize": 48, "fontWeight": 700, "textAlign": "LEFT", "fill": "#000000" },
          "fills": [{ "type": "SOLID", "color": { "r": 0, "g": 0, "b": 0, "a": 1 } }]
        }
      ]
    }
  ],
  "images": {},
  "svgs": {
    "540:1846": "<svg width=\"1920\" height=\"1080\" viewBox=\"0 0 1920 1080\"><rect width=\"1920\" height=\"1080\" fill=\"#FFFFFF\"/></svg>"
  }
}
```

For real templates you will also have `svgs` entries for every vector/shape and for masked image groups, and `images` entries for any IMAGE fills.

---

## 11. Reference Implementation (CLI)

The Botpress Templates repo includes a **script** that converts a **raw Figma JSON** (exported from the Figma REST API) into this payload and optionally fetches SVGs via the Figma Images API. You can use it as a reference for:

- Node tree structure and coordinate normalization
- Which node ids to collect for SVG export (including masked image groups)
- Fills mapping (SOLID, IMAGE with imageRef)
- TEXT style mapping

Relevant files:

- **Import API:** `app/api/import/figma/route.ts`
- **Types:** `lib/figma-import-types.ts`
- **Conversion script:** `scripts/raw-figma-to-import.ts` (builds the same payload from a raw Figma file; plugin would do the same from the Figma Plugin API)
- **Example payload:** `examples/figma-import-test-export-import.json`

---

## 12. Checklist for Plugin Implementers

- [ ] For each selected frame, build a single root node with `id`, `name`, `type: "FRAME"`, `x: 0`, `y: 0`, `width`, `height`, and recursive `children`.
- [ ] Normalize all coordinates to be relative to the frame’s top-left.
- [ ] For TEXT nodes: include `characters`, `style` (fontFamily, fontSize, fontWeight, textAlign, fill), and `fills`.
- [ ] For nodes with fills: include `fills` with `type: "SOLID"` and `color` (r,g,b,a) or `type: "IMAGE"` and `imageRef`.
- [ ] Export SVG for every VECTOR, RECTANGLE, and ELLIPSE; add each to `svgs` by node `id`.
- [ ] Detect masked image groups (GROUP with two children: one shape, one image rect); export the **group** as SVG and add it to `svgs` under the group’s `id`.
- [ ] Export bitmap for every IMAGE fill; add to `images` by `imageRef` as base64 data URI.
- [ ] Let user choose Production vs Local base URL and send payload to `POST {baseUrl}/api/import/figma`.
- [ ] Handle auth (browser-based import with session, or API key if backend supports it) and show clear success/error messages.

If you follow this spec, the payload will be accepted by the Botpress Templates backend and templates will render correctly, including masked images and dynamic bindings.

---

## 13. Maintenance: Keeping Backend and Plugin in Sync

So that edits in this app are easy to reflect in the plugin (and vice versa), use this workflow:

- **Where to edit the spec:** Always in **this repo**, in `docs/FIGMA-PLUGIN-SPEC.md`. Treat it as the single source of truth.
- **When you change the backend (this app):**  
  - Update the import API, types, or generator in this repo as needed.  
  - In the same change (or right after), update `FIGMA-PLUGIN-SPEC.md` if the contract or payload shape changed (new/removed fields, new behavior, new SVG rules, etc.).  
  - Commit both together so the spec and code stay in sync.
- **How the plugin project gets updates:**  
  - **Option A:** Plugin repo has a copy of the spec (e.g. `docs/FIGMA-PLUGIN-SPEC.md` or `SPEC.md`). When you change it here, copy the updated file into the plugin repo (or open the plugin repo in Cursor and paste/update the section that changed).  
  - **Option B:** Plugin repo adds this repo as a **git submodule** and reads the spec from `botpress-templates/docs/FIGMA-PLUGIN-SPEC.md`; updating the submodule ref gets the latest spec.  
  - **Option C:** Plugin repo doesn’t copy the file; its README links to the spec in this repo (e.g. raw GitHub URL). They (or you) open that link when checking behavior; for bigger changes you still copy or summarize the changes into the plugin.
- **Working in Cursor across both projects:**  
  - Open **two Cursor windows**: one for this repo (Botpress Templates), one for the plugin repo.  
  - Or use a **multi-root workspace** (File → Add Folder to Workspace) with both repos; you can edit the spec in one and the plugin code in the other, and use the same chat/context if you want.  
  - When you make a “semi big change” in this app, update the spec in this repo first, then in the plugin window say e.g. “Sync with FIGMA-PLUGIN-SPEC.md: [paste or describe the changed section]” so Cursor can apply the same contract in the plugin.
- **Small “version” note (optional):** At the top of the spec you can add a line like `Spec version: 2025-03` or a short changelog (e.g. “- 2025-03: Added masked image GROUP to SVG export.”). When the plugin team (or you in the plugin repo) pulls or copies the spec, they can check that line to see if they’re up to date.

If the spec is always updated in this repo when the backend changes, communicating back and forth with Cursor is straightforward: change this app and the spec here, then in the plugin project point Cursor at the updated spec (or the relevant section) and ask it to align the plugin code.
