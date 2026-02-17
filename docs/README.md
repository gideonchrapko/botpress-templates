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
- PostgreSQL (local or Docker)
- Google OAuth credentials

### Installation

1. Install dependencies:
```bash
bun install
```

2. Start PostgreSQL (if not already running).

   **Option A – Docker** (Postgres on your machine; Docker Desktop must be running):
   ```bash
   docker run -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 --name postgres-dev postgres
   ```
   Then use `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"` in `.env`.

   **Option B – Hosted Postgres** (no Docker; good if you don’t want Docker Desktop running):
   - Create a free Postgres project at [Neon](https://neon.tech) or [Supabase](https://supabase.com).
   - Copy the connection string and set it in `.env` as `DATABASE_URL` (e.g. `postgresql://user:password@host/dbname?sslmode=require`).
   - Skip Docker entirely.

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

Generate a secret key:
```bash
openssl rand -base64 32
```

4. Run migrations (creates tables):
```bash
bun run db:migrate
```

5. Install Playwright browsers:
```bash
bunx playwright install chromium
```

6. Run the development server:
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
