# Technology Stack

**Analysis Date:** 2026-05-04

## Languages

**Primary:**
- TypeScript 5.9.3 - Core library and all source code in `src/`
- HTML5 - Demo page at `demo/index.html`
- CSS3 - Styling in `demo/style.css`

**Secondary:**
- JavaScript (generated from TypeScript compilation)
- C++ - Original reference implementation (historical, see `CMakeLists.txt`, `main.cpp`)

## Runtime

**Environment:**
- Node.js (v22.17.1 detected; no minimum version enforced in package.json)

**Package Manager:**
- npm 10.x (default with Node v22)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Vite 7.2.2 - Build tool and dev server (`vite.config.ts`)
  - Configured to serve from `demo/` directory
  - Builds to `dist-demo/`
  - Handles TypeScript transpilation

**Testing:**
- Vitest 2.1.9 - Test framework and runner
  - Config: `vitest.config.ts`
  - Environment: Node.js (not jsdom)
  - Global test APIs enabled (`globals: true`)

**Build/Dev:**
- TypeScript 5.9.3 - Language compilation
- ESLint 9.39.1 - Code linting
  - Parser: @typescript-eslint/parser 8.47.0
  - Plugin: @typescript-eslint/eslint-plugin 8.47.0
  - Config: `eslint.config.mjs` (ESLint flat config format)

## Key Dependencies

**Production:**
None listed in `package.json` dependencies. Project is pure JavaScript/TypeScript with no external runtime dependencies.

**Development:**
- @typescript-eslint/eslint-plugin 8.47.0 - TypeScript linting rules
- @typescript-eslint/parser 8.47.0 - TypeScript parsing for ESLint
- eslint 9.39.1 - Linting framework
- typescript 5.9.3 - Language compilation
- vite 7.2.2 - Build and dev server
- vitest 2.1.9 - Test runner and assertion library

## Configuration

**Environment:**
- No `.env` file requirement
- No external API keys or secrets needed
- Pure computational library with no external service dependencies

**Build:**
- `tsconfig.json` - Main compilation config (strict mode enabled)
  - Target: ES2022
  - Module: ESNext
  - Strict checks enabled
  - `noUnusedLocals: true`, `noUnusedParameters: true`

- `tsconfig.lib.json` - Library build config
  - Extends main tsconfig
  - Outputs to `dist/` with declaration files
  - Excludes test files

- `vite.config.ts` - Vite build configuration
  - Root directory: `demo/`
  - Output directory: `dist-demo/`

- `vitest.config.ts` - Test runner configuration
  - Environment: Node.js
  - Global test functions enabled

- `eslint.config.mjs` - ESLint configuration (flat config format)
  - Enforces semicolons, single quotes, trailing commas
  - Strict TypeScript rules with some flexibility
  - Different rules for test files

## Platform Requirements

**Development:**
- Node.js v20+ (tested with v22.17.1)
- macOS/Linux/Windows with standard npm/Node tooling
- ~30GB for node_modules (standard npm install)

**Production:**
- Browser with ES2022 support (modern browsers)
- Or Node.js for server-side MSDF generation
- No external service dependencies
- No database requirements

## Build Outputs

**Library Build:**
- Command: `npm run build:lib`
- Output: `dist/index.js` + `dist/index.d.ts`
- Includes TypeScript declaration files

**Demo Build:**
- Command: `npm run build` (runs tsc then vite build)
- Output: `dist-demo/` with bundled HTML/CSS/JS
- Targets modern browsers with ES2022 support

---

*Stack analysis: 2026-05-04*
