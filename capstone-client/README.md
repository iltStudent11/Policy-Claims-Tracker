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

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Type-check and build production assets
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
