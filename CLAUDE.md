# CLAUDE.md — AI Site Builder

> Project conventions, architecture, and coding guidelines for AI assistants working on this codebase.

---

## Project Overview

**AI Site Builder** is a full-stack web application that lets users describe a website in plain English and have an AI generate the full HTML/CSS/JS code. Users can iterate on the generated code through conversation, manage versions, preview live output, publish projects to a community gallery, and purchase credits via Stripe.

---

## Repository Layout

```
AI SITE BUILDER/
├── client/          # React + Vite frontend (TypeScript)
├── server/          # Express backend (TypeScript)
├── *.pdf / *.docx   # Project documentation & diagrams (not code)
└── CLAUDE.md        # ← you are here
```

### Client (`client/`)

```
client/
├── src/
│   ├── main.tsx              # Entry point — BrowserRouter + Providers
│   ├── App.tsx               # Route definitions
│   ├── providers.tsx         # AuthUIProvider wrapper (better-auth-ui)
│   ├── index.css             # Global styles (Tailwind v4)
│   ├── pages/
│   │   ├── Home.tsx          # Landing page
│   │   ├── Builder.tsx       # Main AI builder page (chat + code editor + preview)
│   │   ├── MyProjects.tsx    # Dashboard listing user's projects
│   │   ├── Projects.tsx      # Single project detail view
│   │   ├── Preview.tsx       # Full-screen project preview
│   │   ├── Community.tsx     # Public gallery of published projects
│   │   ├── view.tsx          # Public view of a single published project
│   │   ├── Pricing.tsx       # Credit purchase plans
│   │   ├── Settings.tsx      # Account settings
│   │   └── Auth/AuthPage.tsx # Login / signup via better-auth-ui
│   ├── components/
│   │   ├── Navbar.tsx        # Top navigation bar
│   │   ├── Sidebar.tsx       # Builder sidebar (chat + version history)
│   │   ├── EditorPanel.tsx   # Code editor panel
│   │   ├── ProjectPreview.tsx# Live preview iframe
│   │   ├── UserProfile.tsx   # User profile dropdown
│   │   └── ui/              # shadcn/ui primitives (button, avatar, dropdown-menu)
│   ├── config/               # Client-side config files
│   ├── lib/                  # Utility modules (auth-client, etc.)
│   └── types/                # TypeScript type declarations
├── .env                      # VITE_BASEURL (server URL)
├── vite.config.ts            # Vite + React + Tailwind v4 plugin
├── components.json           # shadcn/ui config
└── package.json
```

### Server (`server/`)

```
server/
├── server.ts                 # Express app entry point (port 3000)
├── prisma.config.ts          # Prisma CLI config
├── prisma/
│   ├── schema.prisma         # Database schema (PostgreSQL)
│   └── migrations/           # Prisma migrations
├── generated/prisma/         # Generated Prisma client (do NOT edit)
├── lib/
│   ├── prisma.ts             # Prisma client instance (PrismaPg adapter)
│   └── auth.ts               # better-auth config (email/password, Prisma adapter)
├── config/
│   └── openai.ts             # OpenAI client (pointed at OpenRouter)
├── middleware/
│   └── auth.ts               # `protect` middleware — session validation
├── controllers/
│   ├── userController.ts     # User CRUD, project creation (AI generation), credit purchase
│   ├── projectController.ts  # Revision, rollback, save, delete, preview, publish
│   └── webhookControllers.ts # Stripe webhook handler
├── routes/
│   ├── userRoutes.ts         # /api/user/*
│   └── projectRoutes.ts      # /api/project/*
├── types/                    # Custom type declarations (e.g., Express req.userId)
├── tsconfig.json
└── package.json
```

---

## Tech Stack

| Layer          | Technology                                                        |
| -------------- | ----------------------------------------------------------------- |
| **Frontend**   | React 19, TypeScript, Vite 7, Tailwind CSS v4, shadcn/ui (Radix) |
| **Routing**    | React Router DOM v7                                               |
| **Auth (UI)**  | `@daveyplate/better-auth-ui`                                      |
| **Backend**    | Express 5, TypeScript, tsx (runtime), nodemon (dev)               |
| **Auth**       | `better-auth` (email/password, Prisma adapter)                    |
| **Database**   | PostgreSQL (Neon), Prisma ORM v7 (`@prisma/adapter-pg`)          |
| **AI**         | OpenAI SDK → routed through **OpenRouter** (`openrouter.ai`)      |
| **Payments**   | Stripe (checkout + webhooks)                                      |
| **Toasts**     | Sonner                                                            |
| **Icons**      | Lucide React                                                      |

---

## Running Locally

### Prerequisites

- Node.js ≥ 18
- A PostgreSQL database (e.g., Neon)
- OpenRouter API key
- Stripe API key + webhook secret
- `better-auth` secret

### Client

```bash
cd client
npm install
npm run dev          # Vite dev server → http://localhost:5173
```

### Server

```bash
cd server
npm install
npx prisma generate  # Generate Prisma client into generated/prisma/
npm run server       # nodemon + tsx → http://localhost:3000
```

### Environment Variables

**`client/.env`**

```
VITE_BASEURL=http://localhost:3000/
```

**`server/.env`** (required keys)

```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
TRUSTED_ORIGINS=http://localhost:5173
AI_API_KEY=...               # OpenRouter API key
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

---

## Database Schema (Prisma)

Key models:

| Model              | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `User`              | Auth user with `credits` (default 20) counter    |
| `WebsiteProject`    | A generated website; stores `current_code`       |
| `Conversation`      | Chat messages (role: `user` \| `assistant`)      |
| `Version`           | Snapshot of code at a point in time              |
| `Transaction`       | Stripe payment records                           |
| `Session`           | Auth sessions (mapped to `session` table)        |
| `Account`           | Auth accounts (mapped to `account` table)        |
| `Verification`      | Email verification tokens                        |

After changing `schema.prisma`, run:

```bash
cd server
npx prisma migrate dev --name <migration_name>
npx prisma generate
```

---

## API Routes

### Auth (handled by better-auth)

```
ALL /api/auth/*          # better-auth's built-in auth endpoints
```

### User Routes (`/api/user`) — all protected

```
GET    /credits                  # Get user's credit balance
POST   /project                  # Create a new AI-generated project
GET    /project/:projectId       # Get a single project's full details
GET    /projects                 # List all user projects
GET    /publish-toggle/:projectId # Toggle project publish status
POST   /purchase-credits         # Initiate Stripe checkout
```

### Project Routes (`/api/project`)

```
POST   /revision/:projectId      # [protected] AI revision on existing project
PUT    /save/:projectId          # [protected] Manually save code edits
GET    /rollback/:projectId/:versionId  # [protected] Rollback to a version
DELETE /:projectId               # [protected] Delete project
GET    /preview/:projectId       # [protected] Get code for preview iframe
GET    /published                # [public] List all published projects
GET    /published/:projectId     # [public] Get a single published project
```

### Webhooks

```
POST   /api/stripe/webhook       # Stripe webhook (raw body, before express.json)
```

---

## Key Architecture Patterns

### Authentication Flow

1. `better-auth` handles signup/login at `/api/auth/*` on the server.
2. The client uses `@daveyplate/better-auth-ui` via `AuthUIProvider` in `providers.tsx`.
3. Protected routes use the `protect` middleware which extracts `session.user.id` → `req.userId`.
4. The client uses a custom `UserProfile.tsx` component (built with shadcn/ui Avatar and DropdownMenu) in the Navbar instead of the default `UserButton` from `better-auth-ui` to match the custom aesthetic.

### AI Generation Flow

1. User sends a prompt → `POST /api/user/project`.
   - During generation, the frontend displays an animated loading sequence: "Analyzing your request...", "Generating HTML...", "Uploading to NeonDB...", "Saving to database...", "Done! Opening editor...".
2. User selects an AI model (UI uses stylized radio pills matching the site's premium dark aesthetics instead of a native select dropdown):
   - **Standard Model** (`openrouter/free`): 5 credits
   - **Gemini Pro** (`google/gemini-3-flash-preview`): 10 credits
   - **Groq Fast** (`meta-llama/llama-3.3-70b-instruct`): 10 credits
3. Server enhances the prompt using AI (prompt-enhance step).
4. Server calls OpenAI (via OpenRouter) to generate a **complete, self-contained HTML document** with CSS in `<style>` tags and JavaScript in `<script>` tags.
5. Generated code is sanitized via `sanitizeAiHtmlCode()` which:
   - Strips markdown code fences
   - Validates the HTML has actual visible `<body>` content (not just CSS/JS)
   - Extracts embedded HTML from commentary text
   - Falls back to an error page if the AI returns plain text
6. Code is stored in `WebsiteProject.current_code`.
7. Revisions: `POST /api/project/revision/:projectId` sends current code + new prompt to AI.
8. Each AI response is saved as a new `Version` for rollback support.
9. If the sanitizer detects empty/broken HTML, credits are refunded and an error is returned.

> **Important**: The AI is instructed to generate **pure HTML and JavaScript** while using **Tailwind CSS via CDN** (`<script src="https://cdn.tailwindcss.com"></script>`) for styling. NO React, NO JSX, NO Bootstrap. Google Fonts are loaded via `<link>` tags.

### Website Rendering Engine (Dual-Path)

The iframe preview in `Builder.tsx`, `view.tsx`, and the `generateIframeDoc()` function uses a **dual-path rendering engine**:

- **PATH 1 (HTML)**: If the code starts with `<!DOCTYPE html>` or `<html>`, it's passed directly to the iframe via `srcDoc`. The click-to-edit script is injected before `</body>` (Builder only).
- **PATH 2 (Legacy React/JSX)**: If the code doesn't look like HTML (old projects stored as React components), it falls back to the Babel transpilation pipeline with React 18 UMD + Babel Standalone.

This ensures backward compatibility with projects generated before the HTML migration.

### Manual Editor (Click-to-Edit)

The `Builder.tsx` preview iframe injects a custom script that intercepts clicks on HTML elements and sends an `ELEMENT_SELECTED` message to the React parent. 
- Clicking an element opens a manual editor overlay.
- Users can edit **Text Content** (for text elements) or **Image URL** (for `<img>` tags).
- Users can edit **Tailwind Classes** directly.
- The manual editor includes a Presets Gallery for images, allowing users to quickly swap placeholder images with high-quality stock photos from Unsplash.
- **Event Handling**: All click handlers inside the iframe use **capture phase** (`addEventListener(..., true)`) so they fire **before** any event handlers in the generated site's own JavaScript. For `<a>` tag clicks, `preventDefault()` and `stopPropagation()` are called immediately to prevent the generated site's JS from navigating the iframe (which would load the React app inside it). Anchor links (`#`) scroll smoothly; external/non-anchor links open in a new tab via `window.open()`. Non-link clicks (buttons, menus, etc.) are not blocked, preserving the site's interactive functionality. The iframe sandbox includes `allow-popups allow-popups-to-escape-sandbox` so `window.open()` actually works.

### Stripe Webhook

- The webhook route (`/api/stripe/webhook`) is registered **before** `express.json()` middleware because Stripe requires the raw body for signature verification.

### Imports

- Server uses `.js` extensions in import paths (required by Node.js ESM with `nodenext` module resolution), even though source files are `.ts`.
- Client uses `@/` path alias mapped to `./src` via Vite config.

---

## Coding Conventions

### General

- **Language**: TypeScript everywhere (client + server).
- **Module system**: ESM (`"type": "module"` in both `package.json` files).
- **Formatting**: No Prettier/ESLint auto-format config enforced on server; client has ESLint with React hooks + refresh plugins.

### Client

- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin). Use Tailwind utility classes.
- **UI components**: Use shadcn/ui components from `src/components/ui/`. Add new ones with the `shadcn` CLI.
- **Routing**: React Router DOM v7 with `<Routes>` / `<Route>` in `App.tsx`.
- **API calls**: Use `axios` with `VITE_BASEURL` as the base URL. Always send `withCredentials: true` for auth.
- **Notifications**: Use `sonner` toast (`toast.success()`, `toast.error()`).

### Server

- **Runtime**: `tsx` (for TypeScript execution without build step in dev).
- **Dev server**: `nodemon --exec tsx server.ts` via `npm run server`.
- **Controller pattern**: Route handlers are in `controllers/`, routes in `routes/`.
- **Import extensions**: Always use `.js` in import paths (ESM requirement).
- **Prisma client**: Import from `../generated/prisma/client.js` — **never** from `@prisma/client` directly.
- **Error handling**: Controllers use try/catch with `res.status().json()` responses.

---

## Important Gotchas

1. **Prisma client output path**: The Prisma client is generated to `server/generated/prisma/` (not the default `node_modules`). Always import from `../generated/prisma/client.js`.

2. **Stripe webhook body parsing**: The Stripe webhook route must be registered BEFORE `express.json()` middleware. It uses `express.raw({ type: 'application/json' })`.

3. **CORS**: Currently configured to allow only `http://localhost:5173`. Update `corsOptions.origin` in `server.ts` when deploying.

4. **Duplicate routes in App.tsx**: Previously there were duplicate entries for `/community` and `/view/:projectId` (the latter used lowercase `<view />` — a native HTML element, not the View component). These have been removed; each route now appears exactly once.

5. **Production deployment**:
   - **Frontend (Vercel)**: A **root-level** `vercel.json` file configures the build to run from the `client/` subdirectory (`buildCommand`: `cd client && npm install && npm run build`, `outputDirectory`: `client/dist`). It includes a "rewrites" rule to route all requests to `/index.html` (this prevents 404 errors on direct navigation to React Router paths like `/preview/:id` or `/view/:id`). A secondary `client/vercel.json` with only the rewrites rule also exists for redundancy; the root-level file is authoritative.
   - **Backend (Render)**: Update `corsOptions.origin` in `server.ts` to allow the Vercel frontend domain. The client `.env` has a production URL on Render (`ai-site-builder-nmc2.onrender.com`) commented out. Toggle as needed.

6. **`req.userId`**: Added to the Express `Request` type via custom type declarations in `server/types/`. The `protect` middleware sets this.

7. **OpenRouter, not OpenAI directly**: The OpenAI SDK is configured with `baseURL: "https://openrouter.ai/api/v1"`. The API key is an OpenRouter key, not an OpenAI key.

8. **HTML generation, not React**: The AI generates pure HTML and JS with Tailwind CSS via CDN — **not** React components. The prompts explicitly forbid React, JSX, and Bootstrap. The `sanitizeAiHtmlCode()` function validates output quality.

9. **Dual-path renderer**: `Builder.tsx` and `view.tsx` both have a `generateIframeDoc()` function that detects HTML vs legacy React code. Always maintain both paths when modifying the renderer.

10. **Revision field name**: The frontend sends `{ prompt }` but the backend reads `req.body.message || req.body.prompt`. Keep both field names supported.

11. **Free model quality**: The `openrouter/free` model sometimes returns commentary text or empty HTML instead of code. The sanitizer has multiple layers of defense (fence extraction, embedded HTML detection, body content validation, commentary detection).

12. **OpenRouter `max_tokens` error (402)**: Always explicitly set `max_tokens` (e.g. `1000` or `4000`) on **every** `openai.chat.completions.create` call. If omitted, OpenRouter may default to the model's maximum context limit (e.g., 65536+), which triggers a 402 Insufficient Balance error for users whose OpenRouter account can't cover the theoretical maximum size, especially on premium models like Gemini.
