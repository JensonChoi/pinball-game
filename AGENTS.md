# Repository Guidelines

## Project Structure & Module Organization

- `index.html` defines the home screen, scoreboard, controls, and game overlays.
- `src/main.js` handles Three.js rendering, input, audio, and session high scores.
- `src/physics.js` contains collision detection, ball simulation, and game rules, independent of the DOM and rendering.
- `src/style.css` provides responsive styling and optional Google Fonts.
- `test/physics.test.js` contains game-rule regression tests.

Table geometry and sounds are generated in code; there is no dedicated asset directory. Vite generates production files in `dist/`, which is ignored alongside `node_modules/`.

## Build, Test, and Development Commands

Use Node.js 20.19+ or 22.12+ with npm.

- `npm install` installs dependencies.
- `npm run dev` starts Vite, normally at `http://localhost:5173`, with network access enabled for mobile testing.
- `npm test` runs Node’s built-in test runner.
- `npm run build` bundles the application into `dist/`.
- `npm run preview` serves the production build locally; run the build first.

## Coding Style & Naming Conventions

Use JavaScript ES modules, two-space indentation, semicolons, and single-quoted strings. Prefer `const` unless reassignment is required. Use camelCase for functions and variables, PascalCase for classes, and uppercase names for shared constants such as `BUMPERS`. Use kebab-case for HTML IDs and CSS classes. No formatter or linter is configured; keep edits consistent with nearby code and avoid unrelated reformatting.

## Testing Guidelines

Use `node:test` and `node:assert/strict`. Name test files `test/*.test.js` and describe observable behavior in test names. Add regression tests for changed physics or lifecycle rules, especially launching, scoring, pause, drains, and restart. Preserve the three-life limit and fixed-timestep simulation. No numerical coverage threshold is configured.

Before submitting, run `npm test` and `npm run build`. For interface changes, manually check keyboard and touch controls, narrow layouts, pause/resume, and session-best persistence after refresh. Report any checks you could not run.

## Commit & Pull Request Guidelines

This checkout has no Git history, so no established commit convention can be inferred. Use concise, imperative subjects such as `Fix ball launch collision`. Keep commits focused. Pull requests should explain the change, link relevant issues, list validation results, and include screenshots for visual changes. Update `README.md` when controls or setup instructions change.
