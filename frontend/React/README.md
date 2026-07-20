# XPawSure Frontend

Veterinary management system frontend built with React, TypeScript, Vite, and Tailwind CSS.

## Getting started

```bash
npm install
npm run dev
```

Opens at http://localhost:5173. API requests are proxied to http://localhost:8000.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Architecture

- `src/features/` — feature-based modules (auth, super-admin)
- `src/components/ui/` — shared presentational components
- `src/services/` — HTTP client with auth interceptor
- Each feature has `pages/`, `components/`, `services/`, `schemas/` subdirectories
- Forms use React Hook Form with Zod validation
- API calls use TanStack Query-ready service layer
- Routes are code-split with `React.lazy()`

## Tech stack

React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router 7, React Hook Form 7, Zod 4, Axios, TanStack Query 5.
