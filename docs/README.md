# Template Builder

Internal web app for template-based image generation: event posters, blog images, and other config-driven designs.

## Features

- Google OAuth authentication (Botpress employees only)
- **Template families** – Each family has its own config and HTML (e.g. event posters, blog image generator)
- **Config-driven forms** – Fields and validation come from `config.json`; no code changes for new templates
- Customizable colors and output formats (PNG, JPG, WebP, PDF)
- Multiple scale options (1x, 2x, 3x)
- **Figma import** – POST Figma export JSON to `/api/import/figma` to create templates (see FIGMA-IMPORT-MVP.md)
- Optional Drive gallery for viewing past outputs

## Setup

### Prerequisites

- Bun runtime (latest version)
- Google OAuth credentials

### Installation

1. Install dependencies:
```bash
bun install
```

2. Set up environment variables:
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

Generate a secret key:
```bash
openssl rand -base64 32
```

3. Set up the database:
```bash
bun run db:push
```

4. Install Playwright browsers:
```bash
bunx playwright install chromium
```

5. Run the development server:
```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── [family]/create/    # Create flow per template family
│   ├── api/                # submit, render, drive, import/figma
│   ├── results/[id]/       # View/download generated outputs
│   └── storage/            # Served generated assets
├── components/             # React components (forms, UI)
├── lib/                    # Template engine, registry, Figma import, etc.
├── templates/              # One folder per family (config.json + HTML)
│   ├── blog-image-generator/
│   ├── mtl-code/
│   └── ...
└── prisma/                 # Database schema
```

## Usage

1. Sign in with your @botpress.com Google account
2. Pick a template family from the home page
3. Fill in the form (fields depend on the template: title, date, colors, images, etc.)
4. Submit to generate; view and download from the results page (or Drive gallery if enabled)

## Development

- **Database**: SQLite (dev) – use `bun run db:studio` to view
- **Storage**: Local filesystem (`/storage` directory)
- **Rendering**: Playwright for HTML → image/PDF
- **Templates**: Each family lives under `templates/{family}/` with `config.json` and `template-*.html`

## Notes

- Only @botpress.com email addresses can sign in
- Image uploads: PNG, JPG, or WebP, max 10MB
- Generated files are stored under `/storage/outputs/`
