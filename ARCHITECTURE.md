# Policy Claims Tracker Architecture

## Overview

Policy Claims Tracker is a two-application monorepo:

- `capstone-client`: React + TypeScript frontend (Vite)
- `capstone-api`: Node.js + Express + TypeScript backend
- MongoDB: persistent data store accessed by the API through Mongoose

Supported runtime modes:

- Local dev: Vite (`5173`) + API (`5000`) + Mongo (`27017`)
- Docker Compose: Client (`3000`) + API (`5000`) + Mongo (`27017`)
- Kubernetes (kind): ClusterIP services for `client` (`80`), `api` (`5000`), and `mongo` (`27017`)

In development, the frontend serves on `http://localhost:5173` and proxies `/api` calls to the backend at `http://localhost:5000`.

## High-Level Component Model

1. Browser loads the React app from Vite.
2. React app calls backend endpoints under `/api` using Axios.
3. Express routes validate/authenticate requests and invoke controller logic.
4. Mongoose models read/write MongoDB collections.
5. API returns JSON responses to the client.

In containerized runtime, browser traffic hits Nginx in the client container, and Nginx forwards `/api` to the API container/service.

## Architecture Diagram

```mermaid
flowchart LR
  User[User Browser]
  Client[capstone-client\nReact + Vite]
  Proxy[Vite Dev Proxy\n/api]
  Nginx[Client Nginx\n/api reverse proxy]
  API[capstone-api\nExpress + TypeScript]
  Auth[Auth Middleware\nJWT Validation]
  Routes[Route Modules\nauth/policies/claims/dashboard]
  Models[Mongoose Models\nUser/Policy/Claim/Counter]
  DB[(MongoDB)]

  User --> Client
  Client -->|HTTP /api| Proxy
  Proxy --> API
  User -->|Docker/K8s HTTP| Nginx
  Nginx -->|/api| API
  API --> Auth
  Auth --> Routes
  Routes --> Models
  Models <--> DB
  API -->|JSON responses| Client
```

## Auth Request Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant C as capstone-client
  participant A as capstone-api
  participant M as MongoDB

  U->>C: Submit login form (email/password)
  C->>A: POST /api/auth/login
  A->>M: Find user and verify password
  M-->>A: User record
  A-->>C: 200 + JWT
  C->>C: Store JWT in localStorage

  U->>C: Open protected page / trigger data load
  C->>A: GET /api/claims with Authorization: Bearer <token>
  A->>A: Auth middleware validates JWT
  A->>M: Query claims and related documents
  M-->>A: Claims data
  A-->>C: 200 + JSON payload

  alt Token invalid or expired
    A-->>C: 401 Unauthorized
    C->>C: Axios interceptor redirects to /login
  end
```

## Backend Architecture (`capstone-api`)

### Runtime and entrypoint

- Entrypoint: `src/server.ts`
- Startup flow:
  1. Load environment variables.
  2. Configure CORS and JSON middleware.
  3. Register API routers under `/api`.
  4. Connect to MongoDB.
  5. Start HTTP server.

Key runtime defaults:

- `PORT` defaults to `5000` when unset.
- `MONGODB_URI` fallback points to `mongodb://127.0.0.1:27017/policy-claims`.
- Health endpoint is exposed at `/api/health`.

### Route modules

- `routes/auth.ts`: authentication endpoints (register/login/me)
- `routes/policies.ts`: policy CRUD operations
- `routes/claims.ts`: claim CRUD + claim notes
- `routes/dashboard.ts`: dashboard/summary data

### Cross-cutting middleware

- `middleware/auth.ts`: JWT token validation and user context loading
- `middleware/validate.ts`: request validation handling
- `middleware/errorHandler.ts`: centralized API error formatting

### Data layer

Mongoose models define persistence schemas and relationships:

- `models/User.ts`
- `models/Policy.ts`
- `models/Claim.ts`
- `models/Counter.ts` (sequence support, e.g., claim numbering)

## Frontend Architecture (`capstone-client`)

### Runtime and entrypoint

- Entrypoint: `src/main.tsx`
- Root app: `src/App.tsx`
- HTTP client: `src/api.ts` (Axios instance targeting `/api`)

Proxy behavior:

- Local dev: Vite proxies `/api` to `http://localhost:5000`.
- Docker/Kubernetes runtime: Nginx proxies `/api` to `api:5000`.

### UI composition

- `pages/`: route-level screens (login/register/dashboard)
- `components/ProtectedRoute.tsx`: guards authenticated routes
- `context/AuthContext.tsx`: auth state and token lifecycle

### API communication model

- Client stores JWT in `localStorage`.
- Axios request interceptor adds `Authorization: Bearer <token>`.
- Axios response interceptor redirects to `/login` on `401`.

## Security and Access Control

- JWT-based authentication for protected endpoints.
- Role-based authorization (`admin`, `adjuster`) in backend route logic.
- CORS is configured in backend using `CLIENT_ORIGIN`.
- Passwords are hashed in user model logic before persistence.

## Data and Seeding Strategy

- Primary DB connection configured via `MONGODB_URI`.
- Seed script: `capstone-api/src/seed.ts`.
- Seed behavior is intentionally destructive (`deleteMany` before inserts).
- Safety guards in seed script:
  - blocked when `NODE_ENV=production`
  - blocked unless `SEED_CONFIRM=true`

Database naming:

- The stack is standardized on the `policy-claims` database name.

## Operational Notes

- Backend health endpoint: `/api/health`
- Frontend relies on Vite proxy for local development API calls.
- Containerized frontend uses Nginx reverse proxy for `/api`.
- Build outputs:
  - API: TypeScript compile output in `capstone-api/dist`
  - Client: Vite build output in `capstone-client/dist`

## Kubernetes Deployment Model

Kubernetes resources are defined in `k8s/manifests.yaml`:

- Namespace: `policy-claims`
- Deployments: `mongo`, `api`, `client` (each with one replica)
- Services (ClusterIP): `mongo:27017`, `api:5000`, `client:80`

Object relationship:

1. Deployment declares desired pod template and replica count.
2. Kubernetes creates Pods from each Deployment.
3. Service selects Pods by label and provides stable networking.

Typical verification commands:

- `kubectl -n policy-claims get pods`
- `kubectl -n policy-claims get deployments`
- `kubectl -n policy-claims get services`

## Repository Layout (Key Paths)

- `README.md`: monorepo landing and quick start
- `ARCHITECTURE.md`: this architecture reference
- `capstone-api/README.md`: backend setup and seed safeguards
- `capstone-client/README.md`: frontend setup and run guide
