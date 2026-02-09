# Frontend for Social App

This is a minimal static frontend that integrates with the existing backend API.

Quick start:

- Ensure the backend is running (default: `http://localhost:3000`).
- Serve the `frontend/` folder with a static server (recommended) or open `index.html` in the browser.

Examples:

Install and run a small static server (Node):

```bash
npm install -g serve
cd social_media_\ backend/frontend
serve -l 8080 .
```

Then open `http://localhost:8080` in the browser. The frontend calls API endpoints like `/api/posts`, `/api/auth/login`, etc., on the backend.

Notes:
- The frontend stores a JWT in `localStorage` under `sm_auth_token` after login and includes it in `Authorization` headers.
- CORS is already enabled on the backend (default policy).
