# Policy Claims Tracker

Monorepo for the Policy Claims Tracker frontend and backend.

## Project Docs

- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- High-level architecture diagram: [ARCHITECTURE.md#architecture-diagram](ARCHITECTURE.md#architecture-diagram)
- Auth request sequence: [ARCHITECTURE.md#auth-request-sequence](ARCHITECTURE.md#auth-request-sequence)
- Backend (TypeScript API): [capstone-api/README.md](capstone-api/README.md)
- Frontend (React + Vite): [capstone-client/README.md](capstone-client/README.md)

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

## Docker Quick Start

From the repository root, build both images:

```bash
docker build -f capstone-api/Dockerfile -t capstone-api:local capstone-api
docker build -f capstone-client/Dockerfile -t capstone-client:local capstone-client
```

Run API (port `4000`) and client (port `8080`) in separate terminals:

```bash
docker run --rm --name capstone-api -p 4000:4000 --env-file capstone-api/.env capstone-api:local
```

```bash
docker run --rm --name capstone-client -p 8080:80 capstone-client:local
```

App URLs with Docker:

- API: `http://localhost:4000`
- Client: `http://localhost:8080`

Stop containers:

```bash
docker stop capstone-client capstone-api
```

Or run both services with Docker Compose:

```bash
docker compose up --build
```

Stop Compose services:

```bash
docker compose down
```

Compose notes:

- The `api` service depends on an internal `mongo` service.
- By default, `MONGODB_URI` is set to `mongodb://mongo:27017/capstone-api` inside Compose.

## Notes

- Seed instructions and safeguards are documented in [capstone-api/README.md](capstone-api/README.md).
- The frontend proxies `/api` requests to the backend in development.
