# AI Resume Analyzer — test suite

This suite contains **62 test cases** from the supplied test patch. The parameterized `it.each(...)` rows are counted as individual cases.

## Folder map

- `unit/components.test.tsx` — score badges, ATS card, summary, details accordion, score circle, and PDF upload validation.
- `unit/puter-store.test.ts` — Puter.js readiness, auth state, auth errors, sign-in/out, AI request shape, KV listing, and initialization timeout.
- `unit/utils-and-prompts.test.ts` — formatting/class utilities, UUID generation, and AI prompt/schema content.
- `integration/resume-workflow.test.tsx` — upload/analyze/persist flow, failure paths, home listing, resume detail, and auth redirect.
- `regression/defect-regressions.test.tsx` — consistent score thresholds, malformed AI output, upload retry/state, and pending-analysis behavior.
- `setup.ts` — Testing Library cleanup and jsdom SVG/object-URL shims.
- `TEST_CATALOG.md` — a case-by-case index of all 62 tests.

## Run it

From the repository root, install the test dependencies and run Vitest:

```bash
npm install -D vitest@^3.2.7 @vitest/coverage-v8@^3.2.7 jsdom@^30.1.3 @testing-library/react@^16.3.3 @testing-library/dom@^10.4.2 @testing-library/jest-dom@^7.0.1 @testing-library/user-event@^14.6.8 vite-tsconfig-paths@^5.1.4

npx vitest run
```

The project root also needs the `vitest.config.ts` file bundled beside this `tests/` folder. Add these scripts to the existing `package.json` `scripts` object (merge them; do not replace the existing scripts):

```json
"test": "vitest run",
"test:coverage": "vitest run --coverage"
```

The tests use the project's existing `~/` alias and app modules, so they are intended to be copied into this repository—not run as a standalone package. The suite has been organized from the supplied patch; it has **not** been executed against your local checkout in this environment, so use the run output to confirm any repo-version or mock compatibility issues.
