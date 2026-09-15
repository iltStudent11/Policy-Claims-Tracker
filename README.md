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

## Notes

- Seed instructions and safeguards are documented in [capstone-api/README.md](capstone-api/README.md).
- The frontend proxies `/api` requests to the backend in development.
