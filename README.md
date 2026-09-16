# Policy Claims Tracker

Monorepo for the Policy Claims Tracker frontend and backend.

## Project Docs

- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- High-level architecture diagram: [ARCHITECTURE.md#architecture-diagram](ARCHITECTURE.md#architecture-diagram)
- Auth request sequence: [ARCHITECTURE.md#auth-request-sequence](ARCHITECTURE.md#auth-request-sequence)
- Backend (TypeScript API): [capstone-api/README.md](capstone-api/README.md)
- Frontend (React + Vite): [capstone-client/README.md](capstone-client/README.md)
- Kubernetes manifests: [k8s/manifests.yaml](k8s/manifests.yaml)

## Quick Start

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

## Docker Quick Start

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

## Kubernetes Quick Start (kind)

Prerequisites:

- A running kind cluster (example context: `kind-nosql-kind`)
- Local Docker images built for API and client

From the repository root:

```bash
docker build -f capstone-api/Dockerfile -t capstone-api:local capstone-api
docker build -f capstone-client/Dockerfile -t capstone-client:local capstone-client
kind load docker-image capstone-api:local capstone-client:local --name nosql-kind
kubectl apply -f k8s/manifests.yaml
```

Verification commands:

```bash
kubectl -n policy-claims get pods
kubectl -n policy-claims get deployments
kubectl -n policy-claims get services
```

Demo access (ClusterIP services):

```bash
kubectl -n policy-claims port-forward svc/client 8080:80
```

Then open `http://localhost:8080`.

## Notes

- Seed instructions and safeguards are documented in [capstone-api/README.md](capstone-api/README.md).
- The frontend proxies `/api` requests to the backend in development and in containerized runtime.
