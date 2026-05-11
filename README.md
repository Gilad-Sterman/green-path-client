# GreenPath — Client

React frontend for the GreenPath plastic recycling credits platform.

## Tech Stack

- **React** (JavaScript, no TypeScript)
- **Vite** — dev server and build tool
- **Redux Toolkit** — global state management
- **React Router v6** — client-side routing
- **Axios** — API calls
- **SCSS** — styling (partials under `src/assets/scss/`)
- **Lucide React** — icons

## Getting Started

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173` by default.

## Project Structure

```
src/
├── api/              # Axios request functions (auth, users, factories)
├── assets/
│   └── scss/
│       ├── main.scss          # Imports all partials
│       ├── base/              # _vars, _mixins, _functions, _reset
│       └── pages/             # Per-page SCSS partials
├── components/       # Shared UI components (RowActionsMenu, etc.)
├── hooks/            # Custom React hooks (useRelativeTime, etc.)
├── pages/
│   ├── AdminPages/   # internal_admin role pages
│   ├── ManagerPages/ # manager role pages
│   └── EmployeePages/# employee role pages (mobile-first)
└── store/
    ├── index.js      # Redux store setup
    ├── cache.js      # Client-side TTL cache registry
    └── slices/       # authSlice, factoriesSlice, usersSlice
```

## User Roles

| Role | Access |
|------|--------|
| `internal_admin` | Full platform — factories, users, reports |
| `manager` | Own factory — intakes, batches, shipments, credits |
| `employee` | Mobile — intake scanning and submission |

## Auth Flow

Login is phone + OTP (SMS via Twilio). No passwords.
- Access token stored in Redux memory only (never localStorage)
- Refresh token stored in `httpOnly` cookie (auto-rotated on every refresh)

## Caching

Data fetches use a smart TTL cache (`src/store/cache.js`):
- Default TTL: **5 minutes**
- Automatically invalidated after mutations (create, deactivate, reactivate)
- Force-refresh available from any page via the `↺` button or `dispatch(thunk({ force: true }))`

## Build for Production

```bash
npm run build
```

Outputs to `../server/public/` — the Express server serves these static files directly.
