# Repository Rules

## Review First

- For every code change, do a short, honest code review of your own changes first.
- Review focus: bugs, risks, regression potential, security issues, missing tests, and sloppy assumptions.
- Be direct and brutally honest. Do not downplay risks.
- The review comes before adjusting or writing new tests.

## Test Policy

- Every functional change needs appropriate unit tests or a conscious justification for why none are meaningful.
- Every relevant user flow change needs appropriate E2E tests or a conscious justification for why none are meaningful.
- When adding or refactoring dialogs/modals, prefer reusing `src/components/planner/ModalDialog.tsx` whenever practical instead of creating bespoke dialog shells.
- For all new UI styling and UI refactors, use Tailwind CSS by default.
- Do not add or expand component styling in `src/styles.css` unless it is truly global, required for third-party/browser quirks, or cannot be expressed cleanly in Tailwind.
- Keep Tailwind code readable: prefer consistent utility ordering and extract repeated utility groups into small reusable components when that improves maintainability.
- Standard tools:
  - Unit: Vitest + Testing Library
  - E2E: Playwright

## Execution Policy

- After changes, always run `npm run test:unit` and `npm run test:e2e`.
- If tests fail, fix the root cause in the code first instead of watering down the tests.
- Then rerun the previously failing tests until they are green.
- A change is not finished as long as the build or tests are failing.

## Frontend / React

When working on frontend code (files under `src/`), use only the Vite-relevant guidance from [REACT_BEST_PRACTICES.md](../REACT_BEST_PRACTICES.md).
- Default scope from [REACT_BEST_PRACTICES.md](../REACT_BEST_PRACTICES.md): client-side parts of Eliminating Waterfalls, Bundle Size Optimization, Client-Side Data Fetching, Re-render Optimization, Rendering Performance, JavaScript Performance, and Advanced Patterns that apply to React components/hooks in this repo.
- Ignore Next.js, React Server Components, API route, server action, request-scoped caching, serialization, and other server-only guidance unless the task explicitly touches those surfaces.
- For any React task that adds, reviews, refactors, or considers `useEffect`, always apply the guidance in [.agents/skills/react-useeffect-guide/SKILL.md](../.agents/skills/react-useeffect-guide/SKILL.md).
- For frontend reviews of changed React/TSX/TS/JS files, always apply [.agents/skills/frontend-code-review/SKILL.md](../.agents/skills/frontend-code-review/SKILL.md) as the review checklist for the final review pass.
- For tasks that translate designs or mocks into modular React components, apply [.agents/skills/react-components/SKILL.md](../.agents/skills/react-components/SKILL.md).
- Default rule for `useEffect`: only use it to synchronize with external systems. Prefer render-time derivation, event handlers, lifted state, or small helper functions whenever those solve the problem.