# Policy Claims Tracker

Monorepo for the Policy Claims Tracker frontend and backend.

## Project Overview

Policy Claims Tracker is a full-stack claims management application with:

- a React + Vite frontend for login, dashboard metrics, claims, and policy management
- a TypeScript + Express REST API for auth and business logic
- MongoDB for persistent data storage

## Architecture Overview

- Frontend (`capstone-client`) sends requests to `/api`.
- API (`capstone-api`) handles auth, validation, and CRUD operations.
- MongoDB stores users, policies, claims, and counters.
- Deployment targets include Docker Compose (dev/prod SSL), Kubernetes/Kind, and AWS EKS.

## Project Docs

- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- High-level architecture diagram: [ARCHITECTURE.md#architecture-diagram](ARCHITECTURE.md#architecture-diagram)
- Auth request sequence: [ARCHITECTURE.md#auth-request-sequence](ARCHITECTURE.md#auth-request-sequence)
- Backend (TypeScript API): [capstone-api/README.md](capstone-api/README.md)
- Frontend (React + Vite): [capstone-client/README.md](capstone-client/README.md)
- Kubernetes manifests (split): [k8s/](k8s)
- Kubernetes single-file manifest (legacy): [k8s/manifests.yaml](k8s/manifests.yaml)
- EKS manifests and notes: [k8s/eks/README.md](k8s/eks/README.md)

## Local Development (Without Docker)

1. Start backend:
   ```bash
   cd capstone-api
   npm install
   npm run dev
   ```
2. Start frontend (new terminal):
   ```bash
   cd capstone-client
   npm install
   npm run dev
   ```

Default local URLs:

- API: `http://localhost:5000`
- Client: `http://localhost:5173`
- API health: `http://localhost:5000/api/health`

Optional: generate local TLS certs:

```bash
./generate-certs.sh
```

This creates `certs/server.crt` and `certs/server.key` for local development only.

## Quick Start (Docker Compose)

Run the full stack (Mongo + API + client) from the repository root:

```bash
docker compose up -d --build
```

App URLs with Docker Compose:

- API: `http://localhost:5000`
- Client: `http://localhost:3000`

Stop Compose services:

```bash
docker compose down
```

Compose notes:

- The `api` service depends on an internal `mongo` service.
- `MONGODB_URI` is set to `mongodb://mongo:27017/policy-claims`.
- API listens on port `5000`.

## Production Compose (SSL)

Use the production compose file (SSL-enabled client + internal-only API/Mongo):

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

App URLs with Production Compose:

- HTTPS client: `https://localhost:8443`
- HTTP redirect endpoint: `http://localhost:8080`

Stop Production Compose services:

```bash
docker compose -f docker-compose.prod.yml down
```

Optional: provide a stronger JWT secret before startup:

```bash
export JWT_SECRET="replace-with-a-strong-secret"
docker compose -f docker-compose.prod.yml up -d --build
```

## Kubernetes Quick Start (kind)

Prerequisites:

- Kind installed
- A running Kind cluster named `policy-claims` created from `k8s/kind-config.yaml`

From the repository root:

```bash
docker build -t capstone-api:latest ./capstone-api
docker build -t capstone-client:latest ./capstone-client
kind load docker-image capstone-api:latest --name policy-claims
kind load docker-image capstone-client:latest --name policy-claims

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/client.yaml
```

Verification commands:

```bash
kubectl -n policy-claims get pods
kubectl -n policy-claims get deployments
kubectl -n policy-claims get services
```

App access (NodePort via Kind port mapping):

`http://localhost:30080/login`

Optional: apply the single-file manifest instead of split files:

```bash
kubectl apply -f k8s/manifests.yaml
```

Seed data in Kubernetes (one-time destructive reset/insert):

```bash
kubectl exec -n policy-claims deployment/api -- sh -lc 'SEED_CONFIRM=true node dist/seed.js'
```

## Kubernetes Quick Start (EKS)

Prerequisites:

- AWS CLI authenticated (`aws sts get-caller-identity` succeeds)
- `eksctl`, `kubectl`, and Docker installed

From the repository root:

```bash
./scripts/deploy-eks.sh
```

Get the AWS load balancer hostname:

```bash
kubectl -n policy-claims get svc client -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
echo
```

Run post-deploy smoke checks:

```bash
npm run smoke:eks
```

Seed data in EKS (one-time destructive reset/insert):

```bash
kubectl exec -n policy-claims deployment/api -- sh -lc 'SEED_CONFIRM=true node dist/seed.js'
```

For variable overrides and manifest details, see [k8s/eks/README.md](k8s/eks/README.md).

## Testing

Run API integration tests (Vitest + in-memory MongoDB):

```bash
cd capstone-api
npm test
```

Run client component tests (Vitest + React Testing Library):

```bash
cd capstone-client
npm test
```

## API Endpoint Reference

| Method | Endpoint | Auth Required | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | No | API health check |
| POST | `/api/auth/register` | No | Register a user and return JWT |
| POST | `/api/auth/login` | No | Login and return JWT |
| GET | `/api/auth/me` | Yes | Get current authenticated user |
| GET | `/api/dashboard` | Yes | Get dashboard summary/statistics |
| GET | `/api/claims` | Yes | List claims with filters/pagination |
| POST | `/api/claims` | Yes | Create a new claim |
| GET | `/api/claims/:id` | Yes | Get claim details |
| PUT | `/api/claims/:id` | Yes | Update claim |
| DELETE | `/api/claims/:id` | Yes | Delete claim |
| POST | `/api/claims/:id/notes` | Yes | Add a note to a claim |
| GET | `/api/policies` | Yes | List policies with filters/pagination |
| POST | `/api/policies` | Yes | Create a policy |
| GET | `/api/policies/:id` | Yes | Get policy details |
| PUT | `/api/policies/:id` | Yes | Update policy |
| DELETE | `/api/policies/:id` | Yes | Delete policy |

## Tech Stack Summary

- Frontend: React, TypeScript, Vite, React Router, Axios
- Backend: Node.js, Express, TypeScript, JWT, express-validator, bcrypt
- Database: MongoDB + Mongoose
- Testing: Vitest, Supertest, React Testing Library, mongodb-memory-server
- Containers/Orchestration: Docker, Docker Compose, Kubernetes, Kind, EKS

## Demo Talk Track (60 seconds)

Use this script when presenting the Kubernetes deployment:

1. "Everything is isolated in the `policy-claims` namespace so app resources are grouped and easy to manage."
2. "MongoDB, the API, and the client each run as separate Deployments, and each one has a matching Service selected by labels."
3. "The API reads its runtime config from environment variables, including `MONGODB_URI`, and exposes `/api/health` for readiness checks."
4. "For local Kind demos, traffic enters through NodePort `30080` and the frontend proxies `/api` to the backend service."
5. "If HTTPS ingress is needed, use the legacy `k8s/manifests.yaml` ingress with the `policy-claims-tls` secret."

Optional live verification during the demo:

```bash
kubectl -n policy-claims get all
kubectl -n policy-claims describe ingress policy-claims-ingress
kubectl -n policy-claims get endpoints
```

## Notes

- Seed instructions and safeguards are documented in [capstone-api/README.md](capstone-api/README.md).
- The frontend proxies `/api` requests to the backend in development and in containerized runtime.
