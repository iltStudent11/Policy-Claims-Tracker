# capstone-client

React + TypeScript frontend for the Policy Claims Tracker.

For backend setup and seeding safeguards, see [../capstone-api/README.md](../capstone-api/README.md).

## Prerequisites

- Node.js 18+
- API running locally (default: `http://localhost:5000`)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Ensure backend API is running on `http://localhost:5000` (or update the `/api` proxy target in `vite.config.ts`).
3. Start development server:
   ```bash
   npm run dev
   ```

Dev proxy note: `vite.config.ts` proxies `/api` to `http://localhost:5000`.
Docker runtime note: Nginx in the client container proxies `/api` to the `api` service on port `5000`.

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Type-check and build production assets
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Docker

Build image from project root:

```bash
docker build -f capstone-client/Dockerfile -t capstone-client:local capstone-client
```

Run container (maps host port `8080` to container port `80`):

```bash
docker run --rm -p 3000:80 capstone-client:local
```

Open `http://localhost:3000` in your browser.
