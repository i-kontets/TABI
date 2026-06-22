# Repository Guidelines

## Project Structure & Module Organization

TABI is a React 19 single-page application built with Vite. Application startup and routing live in `src/main.jsx` and `src/App.jsx`. Route-level screens are grouped under `src/pages/<Feature>/`; reusable UI belongs in `src/components/<Component>/`. Keep component-specific styles beside their JSX as `*.module.css`. Shared styles and color variables are in `src/index.css`. Static files served unchanged belong in `public/`; imported icons and other bundled assets belong in `src/assets/`. Production output is generated in `dist/` and should not be edited directly.

## Build, Test, and Development Commands

Run commands from the repository root:

- `npm install` installs dependencies from `package-lock.json`.
- `npm run dev` starts the Vite development server.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the production bundle locally.
- `npm run lint` checks all JavaScript and JSX with ESLint.
- `docker compose up --build` runs the development server in Docker on port 5173.

The app is deployed below `/TABI/`. Keep Vite's `base` and React Router's basename aligned when changing the deployment path.

## Coding Style & Naming Conventions

Use ES modules, functional React components, and four-space indentation. Name components and component files in PascalCase, such as `BottomNav.jsx`; use camelCase for functions, variables, and hooks. Follow the naming already established by a feature when modifying older lowercase files. Import CSS Modules as `styles`, reuse variables from `src/index.css`, and use SVGR for SVGs that need to behave as React components. Keep user-facing text consistent with the existing Japanese interface. Run `npm run lint` before committing; unused variables are treated as errors.

## Testing Guidelines

No automated test framework or `npm test` script is currently configured. For every change, run `npm run lint` and `npm run build`, then manually verify affected routes and responsive behavior through `npm run dev`. If tests are introduced, place them beside the implementation as `Component.test.jsx` and add the corresponding script to `package.json`.

## Commit & Pull Request Guidelines

Recent commits use concise, imperative English subjects such as `Add fixed footers...` and `Move progress tracker styles...`. Keep each commit focused on one logical change and explain non-obvious behavior in the body. Pull requests should include a clear summary, verification steps, linked issues when applicable, and screenshots or recordings for visible UI changes. Call out changes to routing, deployment paths, or JSON data files explicitly.

## Agent Git & Change Reporting Rules

Do not run `git commit`, `git pull`, or `git push` unless the user explicitly requests that specific operation. Never create or update a pull request without explicit approval. After modifying files, show the user a clear comparison of the changed code, preferably as a unified diff or a concise before/after excerpt. Also list the affected files and report any lint, build, or test results.
