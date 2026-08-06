# QueueAdmin Frontend

Dispatch-queue management console for the **Queue Org Admin (role 11)** role.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- TanStack Query (server state), Zustand (client state, persisted)
- React Hook Form + Zod (forms/validation)
- axios (REST), socket.io-client (realtime), sonner (toasts), date-fns

## Setup

```bash
npm install
npm run dev          # http://localhost:5173 — proxies /api + /socket.io to localhost:3000
```

```env
# .env
VITE_API_URL=https://api.example.com    # default "/" (dev proxy)
VITE_SOCKET_URL=https://api.example.com # default "/"
```

## Scripts

- `npm run dev` — dev server
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — oxlint
- `npm run preview` — preview production build

## Docs

- `docs/queadmin-frontend.md` — full API reference (payloads/responses), auth
  workflow, socket contract, TS types, component breakdown, module standards.
- `docs/queadmin-operations.md` — operator guide for the QueueOrgAdmin role.

Backend repo: `transportBackEndNative` (sibling). Queue API scaffold lives on
branch `feature/queue-dispatch`.
