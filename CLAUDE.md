# CLAUDE.md — SupaRalph

> Active penetration testing tool for Supabase projects. "Don't guess what's broken. Break it and prove it."

## Project Overview

SupaRalph is a security scanner that runs 277+ attack vectors against Supabase projects to find vulnerabilities in RLS policies, auth, storage, functions, realtime, APIs, and more. It operates on a **zero-persistence model** — credentials are never stored server-side and scan results exist only in the browser session.

Part of the **Vibeship ecosystem**. Repository: `vibeforge1111/vibeship-suparalph`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2.0 with **Svelte 5 runes** (`$props`, `$state`, `$derived`) |
| Language | TypeScript 5.0 (**strict mode** — all strict flags enabled) |
| Build | Vite 5.4 |
| Styling | Tailwind CSS 3.4 + PostCSS + autoprefixer |
| Validation | Zod 3.23 |
| Backend Client | @supabase/supabase-js 2.45 |
| Server Adapter | @sveltejs/adapter-node (output: `build/`) |
| Linting | ESLint 9 + Prettier 3.1 (with svelte plugin) |
| Dev Port | 5500 |

## Commands

```bash
npm run dev          # Dev server on port 5500
npm run build        # Production build to build/
npm run start        # Run production build
npm run preview      # Preview production build
npm run check        # svelte-check type validation
npm run check:watch  # Type checking in watch mode
npm run lint         # ESLint
npm run format       # Prettier formatting
```

## Directory Structure

```
src/
├── app.html                        # HTML shell
├── app.css                         # Global styles, Tailwind layers, CSS vars
├── app.d.ts                        # SvelteKit app type declarations
├── lib/
│   ├── components/
│   │   └── Navbar.svelte           # Top navigation bar
│   ├── engine/
│   │   ├── breach-engine.ts        # Core scan orchestrator
│   │   ├── attacks/
│   │   │   ├── index.ts            # ALL_ATTACKS registry + helpers
│   │   │   ├── rls-attacks.ts      # RLS bypass vectors
│   │   │   ├── auth-attacks.ts     # Auth weakness vectors
│   │   │   ├── storage-attacks.ts  # Storage bucket vectors
│   │   │   ├── vibecoder-attacks.ts # AI-generated code vectors
│   │   │   └── ... (40+ modules, 15,700+ lines)
│   │   ├── fixes/
│   │   │   └── index.ts            # Fix rulesets with SQL + steps
│   │   └── reports/
│   │       └── index.ts            # JSON/Markdown/HTML report generators
│   └── types/
│       └── attacks.ts              # Core type definitions
├── routes/
│   ├── +page.svelte                # Main scanner page (landing + UI)
│   ├── +layout.svelte              # Root layout (header/footer)
│   ├── api/scan/+server.ts         # POST (JSON) + GET (SSE) scan endpoints
│   ├── privacy/+page.svelte        # Privacy policy page
│   └── terms/+page.svelte          # Terms of service page
static/
├── favicon.svg
└── ralph-wiggum.avif               # Hero image
```

## Architecture

### Scan Flow

1. User enters Supabase project URL + anon key on the main page
2. URL is validated and auto-fixed (adds `https://`, appends `.supabase.co` if needed)
3. Reachability check confirms the target responds
4. `BreachEngine` orchestrates attacks with configurable concurrency (default 3), timeout (30s)
5. Results stream to the terminal UI in real-time
6. Vulnerabilities are collected with severity, evidence, and fix recommendations

### API Endpoints

- **POST `/api/scan`** — Full scan returning JSON. Rate limit: 5/15min per IP.
- **GET `/api/scan?targetUrl=...&anonKey=...`** — SSE streaming with events: `attack_start`, `attack_complete`, `breach_found`, `progress`, `scan_complete`, `error`. Rate limit: 10/15min per IP. Heartbeat every 15s.

### Core Types (src/lib/types/attacks.ts)

- `AttackVector` — id, name, description, category, severity, tags, execute()
- `AttackContext` — targetUrl, anonKey, serviceKey, target, testData, signal
- `AttackResult` — status, breached, summary, details, evidence, timestamp, duration
- `Vulnerability` — id, attackId, category, severity, title, description, impact, fix, evidence
- `BreachReport` — id, projectId, stats, byCategory, bySeverity, results, vulnerabilities
- `AttackCategory` — `'rls' | 'auth' | 'storage' | 'functions' | 'realtime' | 'vibecoder' | 'api' | 'database'`
- `AttackSeverity` — `'critical' | 'high' | 'medium' | 'low' | 'info'`
- `AttackStatus` — `'pending' | 'running' | 'breached' | 'secure' | 'error' | 'skipped'`

## Attack System

### Registration Pattern

All attacks are defined as arrays of `AttackVector` objects in individual module files under `src/lib/engine/attacks/`. The `index.ts` file aggregates them into `ALL_ATTACKS` and exports helpers:

```typescript
import { ALL_ATTACKS } from '$lib/engine/attacks';
getAttacksByCategory(category)   // Filter by category
getAttackById(id)                // Lookup single attack
getTotalAttackCount()            // Total vector count
getAttackCountByCategory()       // Count per category
```

### Adding a New Attack

1. Create or edit a file in `src/lib/engine/attacks/` (e.g., `my-attacks.ts`)
2. Export an array of `AttackVector` objects:
   ```typescript
   import type { AttackVector } from '$lib/types/attacks';

   export const MY_ATTACKS: AttackVector[] = [
     {
       id: 'my-unique-id',
       name: 'Attack Name',
       description: 'What this tests',
       category: 'rls',           // One of AttackCategory
       severity: 'high',          // One of AttackSeverity
       tags: ['rls', 'bypass'],
       execute: async (context) => {
         // Test logic using context.targetUrl, context.anonKey, etc.
         return {
           status: 'breached',    // or 'secure', 'error', 'skipped'
           breached: true,
           summary: 'Description of finding',
           details: { request: '...', response: '...' },
           evidence: ['Evidence item'],
           timestamp: new Date().toISOString(),
           duration: 0
         };
       }
     }
   ];
   ```
3. Import and spread into `ALL_ATTACKS` in `src/lib/engine/attacks/index.ts`

### Attack Categories (40+ modules)

- **RLS**: rls-attacks, rls-advanced-attacks, rls-analyzer-attacks
- **Auth**: auth-attacks, auth-advanced-attacks, auth-edge-attacks, auth-edge-cases-attacks, auth-provider-attacks
- **Storage**: storage-attacks, storage-advanced-attacks, storage-transform-attacks
- **Database**: database-attacks, database-deep-attacks
- **API**: api-attacks, postgrest-advanced-attacks, postgrest-edge-attacks, graphql-attacks, management-api-attacks
- **Functions**: functions-attacks, edge-functions-deep-attacks
- **Realtime**: realtime-attacks, realtime-advanced-attacks
- **Vibecoder**: vibecoder-attacks, vibecoder-advanced-attacks
- **Infrastructure**: infrastructure-attacks, network-attacks, extension-attacks, vault-attacks
- **Security**: injection-attacks, data-exposure-attacks, dos-attacks, credentials-scanner-attacks, logging-attacks
- **Business Logic**: business-logic-attacks, scheduled-job-attacks, webhook-attacks, backup-recovery-attacks, ai-vector-attacks, multi-tenant-attacks, service-role-attacks

## Design System Conventions

### CRITICAL: No Rounded Corners

The Vibeship design system enforces `border-radius: 0` on ALL elements. This is set globally in `tailwind.config.js` — every radius token (`sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `full`) maps to `0`. Never add `rounded-*` classes expecting visible rounding. The CSS also has `border-radius: 0 !important` as a global override in `app.css`.

### Color Palette

| Token | Purpose | Key Value |
|-------|---------|-----------|
| `supa-*` | Primary brand (Supabase green) | `supa-400: #3ECF8E` |
| `vibe-*` | Alias for supa (backwards compat) | Same as supa |
| `breach-*` | Errors, vulnerabilities, danger | `breach-500: #ef4444` |
| `secure-*` | Success, safe findings | `secure-500: #22c55e` |
| `surface-*` | Dark background surfaces | `surface-900: #0a0a0a` |
| `shield-*` | Secondary green accent | `shield-500: #22c55e` |

### Theme

- **Dark mode only** — background is `surface-900` (#0a0a0a), text is `gray-100`
- **Font**: JetBrains Mono / Fira Code (monospace throughout)
- **Terminal aesthetic**: Card components styled as terminal windows with dot indicators
- **Borders**: `border-gray-800` (very subtle against dark backgrounds)

### CSS Custom Properties (app.css)

```css
--color-breach: #ef4444;
--color-secure: #22c55e;
--color-warning: #f59e0b;
--color-info: #3b82f6;
--color-supa: #3ECF8E;
```

### Component Classes (defined in app.css @layer)

- **Badges**: `badge-breach`, `badge-secure`, `badge-warning`, `badge-supa`
- **Cards**: `card`, `card-breach`, `card-secure`, `card-supa` (left-border colored)
- **Buttons**: `btn`, `btn-primary` (supa), `btn-danger` (breach), `btn-secondary`
- **Terminal**: `terminal`, `terminal-header`, `terminal-dot`, `terminal-content`
- **Progress**: `scan-progress`, `scan-progress-bar`
- **Effects**: `glow-border`, `text-gradient`, `hero-grid`

### Animations

20+ custom animations defined in Tailwind config, including laser-beam variants, scan-line sweeps, glitch effects, typing animations, float, fade-in, and slide transitions. Use `animate-*` classes.

## Svelte Conventions

- **Svelte 5 runes**: Use `$props()`, `$state()`, `$derived()`, `$effect()` — NOT legacy `export let`, `$:`, or stores
- **Snippet rendering**: Use `{@render children()}` for slot content
- **Stores**: Use `$app/stores` for `page` store only; no custom stores
- **Components**: Minimal extraction — most UI is inline in page components with Tailwind

## Commit Message Convention

Commits follow the pattern: `type: Description`

Common prefixes observed:
- `feat:` — New features
- `fix:` — Bug fixes
- `ui:` — Visual/layout changes
- `ux:` — User experience improvements
- `content:` — Copy/text changes
- `style:` — Formatting/styling changes
- `chore:` — Maintenance tasks
- `docs:` — Documentation updates
- `security:` — Security-related changes
- `revert:` — Reverting previous changes

Descriptions are concise, imperative mood (e.g., "Add URL validation" not "Added URL validation").

## Environment Variables

```bash
# Target Supabase project to scan
SUPASHIELD_TARGET_URL=https://your-project.supabase.co
SUPASHIELD_TARGET_ANON_KEY=your-anon-key
SUPASHIELD_TARGET_SERVICE_KEY=your-service-key

# SupaRalph's own Supabase instance (optional)
PUBLIC_SUPABASE_URL=https://your-supashield-instance.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-supashield-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supashield-service-key
```

Template in `.env.example`. Actual `.env` files are gitignored. The app uses a zero-persistence model — credentials are entered by the user at runtime and never stored on the server.

## CI/CD

GitHub Actions workflow at `.github/workflows/suparalph-scan.yml`:

- **Triggers**: Push to main/master/develop, PRs to main/master, manual dispatch
- **Jobs**:
  - `security-scan`: Node 20, validates secrets, runs scan, uploads results artifact, comments on PRs
  - `security-gate`: Checks for blocking vulnerabilities
- **Inputs**: `fail_on_critical` (default: true), `fail_on_high` (default: false)

## Reports & Compliance

Report generation supports JSON, Markdown, and HTML formats via `src/lib/engine/reports/index.ts`.

Compliance mappings included:
- **OWASP Top 10 2021** (A01–A10)
- **SOC2 Trust Service Criteria** (CC6.1, CC6.6, CC6.7)
- **GDPR** (Articles 32, 33)

## TypeScript Configuration

Strict mode with all flags enabled:
- `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`
- `noImplicitReturns`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`
- `noUncheckedIndexedAccess`, `forceConsistentCasingInFileNames`
- `allowJs` + `checkJs` enabled (JavaScript files are also type-checked)

## Key Constraints for AI Assistants

1. **Authorized testing only** — This tool is for scanning projects you own or have explicit permission to test. Terms of service prohibit unauthorized access, DoS, and data exfiltration.
2. **No rounded corners** — The Vibeship design system enforces `border-radius: 0` globally. Do not add rounded styling.
3. **Dark theme only** — All UI uses the dark surface/gray palette. Do not introduce light theme elements.
4. **Monospace font** — JetBrains Mono / Fira Code. Do not change the font stack.
5. **Zero persistence** — Never add server-side storage of user credentials or scan results.
6. **Svelte 5 only** — Use runes syntax (`$props`, `$state`, `$derived`), not legacy Svelte 4 patterns.
7. **Strict TypeScript** — All strict flags are on. Fix type errors, do not suppress them.
8. **Rate limiting** — API endpoints have rate limits. Respect the existing in-memory rate limit implementation.
9. **SSE heartbeat** — The GET scan endpoint sends heartbeats every 15s to prevent proxy timeouts. Maintain this pattern.
10. **Attack vector IDs must be unique** — Each attack in the system has a unique `id` string. Verify uniqueness when adding new attacks.
