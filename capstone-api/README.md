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

## Docker

Build image from project root:

```bash
docker build -f capstone-api/Dockerfile -t capstone-api:local capstone-api
```

Run container (maps host port `4000` to container port `4000`):

```bash
docker run --rm --name capstone-api -p 4000:4000 --env-file capstone-api/.env capstone-api:local
```

Compose notes:

- The `api` service depends on an internal `mongo` service.
- By default, `MONGODB_URI` is set to `mongodb://mongo:27017/capstone-api` inside Compose.

## Seeding Data

The seed script is destructive and deletes all existing users, policies, claims, and counters before inserting sample data.

Run from `capstone-api`:

```bash
SEED_CONFIRM=true npm run seed
```

Safety guards:

- Seeding is blocked when `NODE_ENV=production`.
- Seeding is blocked unless `SEED_CONFIRM=true` is provided.
