# Social Media App — Local run & deployment

Quick steps to run the full app (backend + static frontend) locally and deploy.

Prerequisites
- Node.js >= 18
- npm
- A PostgreSQL database (Neon recommended for production)

Local (development)
1. Install dependencies (from workspace root):

```powershell
npm install
cd social-media-app-main
npm install
cd ..
```

2. Create a `.env` in `social-media-app-main/` with your development values (or use Neon `DATABASE_URL`):

```
# Example (use Neon DATABASE_URL in production)
PORT=3002
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your_jwt_secret
LOG_LEVEL=verbose
```

3. Start the backend (from workspace root):

PowerShell (recommended):
```powershell
npm run start
```

4. Open the site in your browser:

http://localhost:3002/

Deployment notes
- If you deploy from the repository root, this repo now includes a root-level `vercel.json` that routes requests to `social-media-app-main/src/app.js`.
- Set `DATABASE_URL` as a secret in your hosting provider and do NOT commit `.env`.
- Use the same `DATABASE_URL` value Neon provides. If your password includes special characters, URL-encode them.
- Recommended process manager for production: `pm2`, or use your cloud provider's process manager.

Security
- Remove any local `.env` files before pushing to public repos.