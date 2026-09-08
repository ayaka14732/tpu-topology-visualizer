# Reference sources

Reference inspected on 2026-09-08:

- Public application: https://tpu-visualizer.uc.r.appspot.com/
- Public client resource: https://tpu-visualizer.uc.r.appspot.com/assets/index-CtDouAcK.js
- Public favicon: https://tpu-visualizer.uc.r.appspot.com/favicon.svg
- Optional public hardware metadata: https://tpu-visualizer.uc.r.appspot.com/ntk-data.json — returned `{}` during inspection.

The 156 topology records and four color palettes in `src/data/` were transcribed from the public application's client data. The favicon is the original public SVG. Screenshots under `docs/reference/` record the original and this implementation. The source website retains authorship of its original materials; no ownership or affiliation is asserted.

The application logic is maintained here as readable TypeScript/React source with declared dependencies. The original JavaScript bundle is not included or loaded by this project.

Inter is distributed by `@fontsource/inter` under its included OFL license. Third-party package licenses remain with their packages.

Toolchain versions were verified against the npm registry's `latest` metadata:

- https://registry.npmjs.org/pnpm/latest
- https://registry.npmjs.org/typescript/latest
- https://registry.npmjs.org/react/latest
- https://registry.npmjs.org/tailwindcss/latest
- https://registry.npmjs.org/vite/latest
