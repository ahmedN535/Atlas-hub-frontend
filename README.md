# Atlas Hub Frontend

Vite + React frontend for Atlas Hub.

## Local development

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:5000` by default, so run the Express backend locally when you want live data.

## Backend URL

For deployed builds, set:

```bash
VITE_API_BASE_URL=https://your-render-backend.onrender.com
```

Leave `VITE_API_BASE_URL` empty for local development with the Vite proxy.

## Current API contract

- `GET /api/agents`
- `GET /api/agents/:id`
- `POST /api/agents/search`
- `POST /api/agents/upload`
