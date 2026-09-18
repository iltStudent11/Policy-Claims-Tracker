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

Default local runtime:

- API base: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`
- Default DB fallback when `MONGODB_URI` is unset: `mongodb://127.0.0.1:27017/policy-claims`

## Scripts

- `npm run dev` - Run API with ts-node-dev
- `npm run build` - Compile TypeScript
- `npm run start` - Run compiled output from `dist/server.js`
- `npm test` - Run Vitest API integration tests
- `npm run test:watch` - Run Vitest in watch mode
- `npm run seed` - Seed database (destructive; confirmation required)
- `npm run verify:auth-password` - Verify `/auth/login` and `/auth/me` responses never expose a `password` field

Repository-level dev environment scripts (run from repo root):

- `npm run devenv:start`
- `npm run devenv:status`
- `npm run devenv:restart`
- `npm run devenv:stop`

Notes:

- `devenv:stop` stops PID-tracked processes first, then safely stops unmanaged listeners on `:5000`/`:5173` only when they belong to this workspace.
- `devenv:status` can report frontend/API listeners as `managed` or `unmanaged process detected`.

## Auth and User Rules

Registration and profile update enforce:

- Name: letters and spaces only.
- Email: valid email format with a domain suffix (for example, `.com`, `.net`).

Login enforces:

- Email format validation before credential lookup.

Role constraints:

- The first admin can be created during registration.
- After an admin exists, only an authenticated admin can create additional admin users.

Profile endpoint:

- `PUT /api/auth/me` (auth required) updates the authenticated user's name and email.

API permission highlights:

- Policies (`POST/PUT/DELETE /api/policies/*`): admin only.
- Claim delete (`DELETE /api/claims/:id`): admin only.
- Claim update (`PUT /api/claims/:id`): admin or assigned adjuster.
- User management (`GET /api/users`, `PUT /api/users/:id`): admin only.

Users management endpoints:

- `GET /api/users`: returns all users except the currently authenticated admin.
- `PUT /api/users/:id`: updates another user's name, email, and role.
- Self-edit via `/api/users/:id` is blocked; use `PUT /api/auth/me` for current user profile updates.

## How to Test User Creation/Profile Changes (API)

Quick API checks:

1. Run integration tests:
   ```bash
   npm test
   ```
2. Confirm registration rejects invalid name (`name may only contain letters and spaces`).
3. Confirm registration rejects invalid email format (`email must be a valid email address`).
4. Confirm login rejects invalid email format.
5. Confirm non-admin cannot create additional admin users after first admin exists.
6. Confirm `PUT /api/auth/me` updates valid name/email for authenticated user.
7. Confirm `PUT /api/auth/me` rejects invalid name/email and duplicate email conflicts.
8. Confirm admin can list users via `GET /api/users`.
9. Confirm admin can update another user via `PUT /api/users/:id`.
10. Confirm non-admin access to `/api/users` returns `403`.

## Docker

Build image from project root:

```bash
docker build -f capstone-api/Dockerfile -t capstone-api:local capstone-api
```

Run container (maps host port `5000` to container port `5000`):

```bash
docker run --rm --name capstone-api -p 5000:5000 --env-file capstone-api/.env capstone-api:local
```

Compose notes:

- The `api` service depends on an internal `mongo` service.
- `MONGODB_URI` is set to `mongodb://mongo:27017/policy-claims`.
- API listens on port `5000` in `docker-compose.yml` and port `4000` in `docker-compose.prod.yml`.

## Testing

API integration tests use Vitest + Supertest + `mongodb-memory-server` so tests run independently of your local Mongo instance.

Run from `capstone-api`:

```bash
npm test
```

## Kubernetes

Local Kind manifests run this API with:

- image: `capstone-api:latest`
- `imagePullPolicy: Never` (requires `kind load docker-image`)
- replicas: `2`
- health checks on `GET /api/health` at port `4000`

Manifest references:

- API deployment/service: `../k8s/api.yaml`
- Secrets used by API: `../k8s/secrets.yaml`

EKS references:

- EKS API deployment/service template: `../k8s/eks/api.yaml`
- EKS namespace/storage/client manifests and deployment notes: `../k8s/eks/README.md`
- Automated EKS deployment script (run from repo root): `./scripts/deploy-eks.sh`
- Post-deploy smoke test (run from repo root): `./scripts/smoke-test-eks.sh` or `npm run smoke:eks`

## Seeding Data

The seed script is destructive and deletes all existing users, policies, claims, and counters before inserting sample data.

Run from `capstone-api`:

```bash
SEED_CONFIRM=true npm run seed
```

Safety guards:

- Seeding is blocked unless `SEED_CONFIRM=true` is provided.

Kubernetes seeding example:

```bash
kubectl exec -n policy-claims deployment/api -- sh -lc 'SEED_CONFIRM=true node dist/seed.js'
```
