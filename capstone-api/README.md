# capstone-api

TypeScript backend for the Policy Claims Tracker.

## Prerequisites

- Node.js 18+
- MongoDB running locally or a valid remote `MONGODB_URI`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (minimum: `MONGODB_URI`; optional: `PORT`, `CLIENT_ORIGIN`, `NODE_ENV`).
3. Start development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` - Run API with ts-node-dev
- `npm run build` - Compile TypeScript
- `npm run start` - Run compiled output from `dist/server.js`
- `npm run seed` - Seed database (guarded; see below)

## Seeding Data

The seed script is destructive and deletes all existing users, policies, claims, and counters before inserting sample data.

Run from `capstone-api`:

```bash
SEED_CONFIRM=true npm run seed
```

Safety guards:

- Seeding is blocked when `NODE_ENV=production`.
- Seeding is blocked unless `SEED_CONFIRM=true` is provided.
