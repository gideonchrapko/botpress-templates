# Botpress Poster Generator

Internal poster generation web app for creating LinkedIn event posters.

## Features

- Google OAuth authentication (Botpress employees only)
- Template-based poster generation
- Support for 1-3 speakers per poster
- Customizable colors and output formats (PNG, JPG, WebP, PDF)
- Multiple scale options (1x, 2x, 3x)

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
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── templates/         # Template pages
│   └── results/           # Results pages
├── components/            # React components
│   └── ui/                # shadcn/ui components
├── lib/                   # Utility functions
└── prisma/                # Prisma schema

Note: HTML templates are located in `../41-mtl-code/templates/templates/`
```

## Usage

1. Sign in with your @botpress.com Google account
2. Select the LinkedIn template
3. Fill in the form:
   - Choose primary color
   - Select number of people (1-3)
   - Set scale and output format
   - Enter event information
   - Add speaker details and headshots
4. Submit to generate your poster
5. View and download from the results page

## Development

- Database: SQLite (dev) - use `bun run db:studio` to view
- Storage: Local filesystem (`/storage` directory)
- Rendering: Playwright for HTML to image/PDF conversion

## Notes

- Only @botpress.com email addresses can sign in
- Headshots must be PNG, JPG, or WebP, max 10MB
- Templates are stored in `../41-mtl-code/templates/templates/`
- Generated files are stored in `/storage/outputs/`

