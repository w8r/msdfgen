# External Integrations

**Analysis Date:** 2026-05-04

## APIs & External Services

**None detected.**

This is a pure computational library with no external API integrations. All distance field generation is computed locally.

## Data Storage

**Databases:**
- Not applicable - no database integration

**File Storage:**
- Local filesystem only
- Demo loads/saves canvas data in-memory
- Library operates entirely in-memory with no persistent storage

**Caching:**
- Not used - computational results not cached

## Authentication & Identity

**Auth Provider:**
- None - library requires no authentication
- Demo is fully client-side with no auth mechanism

## Monitoring & Observability

**Error Tracking:**
- None integrated

**Logs:**
- Console logging only (see `eslint.config.mjs` - console.log triggers warning)
- No structured logging framework
- No external log aggregation

## CI/CD & Deployment

**Hosting:**
- No default hosting configured
- Demo builds as static HTML/CSS/JS suitable for any static host
- Dist outputs: `dist/` for library, `dist-demo/` for demo

**CI Pipeline:**
- None detected (no GitHub Actions, GitLab CI, or similar)

## Environment Configuration

**Required env vars:**
- None - project requires zero environment variables
- No secrets management needed

**Secrets location:**
- Not applicable - no external credentials used

## Webhooks & Callbacks

**Incoming:**
- None - library is not a service

**Outgoing:**
- None - library does not make external requests

## Module System & Bundle Configuration

**ESM (ES Module):**
- `package.json` declares `"type": "module"` for full ESM support
- All TypeScript files compiled to ES2022 modules
- Vite handles bundling for browser consumption

**Library Exports:**
- Main entry: `dist/index.js` built from `src/index.ts`
- TypeScript definitions: `dist/index.d.ts`
- Library exports core types and functions, no client instantiation needed

## Browser Integration Points

**HTML Entry:**
- `demo/index.html` - Demo page
- Script tag: `<script type="module" src="./demo-browser.ts"></script>`
- Uses Canvas API for rendering (built-in browser API, not external)

**Canvas Integration:**
- Renders MSDF/SDF output to HTML5 Canvas
- No WebGL or external rendering libraries
- Pure 2D Canvas context API usage

---

*Integration audit: 2026-05-04*
