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
Container runtime note: Nginx in this client image proxies `/api` to the `api` service on port `4000`.

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Type-check and build production assets
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm test` - Run Vitest component tests
- `npm run test:watch` - Run Vitest in watch mode

## Testing

Component tests use Vitest + React Testing Library.

Current test coverage includes:

- Login page field rendering and invalid email validation
- Register page role visibility and name/email validation
- Profile page rendering and profile email validation
- Navbar branding/navigation rendering
- Protected route redirect for unauthenticated users
- Role-based UI behavior for policies and claim detail actions

## User Creation and Profile UX

Registration and profile edit UI enforce:

- Name: letters and spaces only.
- Email: valid email format with a domain suffix (for example, `.com`, `.net`).

Auth and profile pages:

- `/register`: non-admin users can only create adjuster accounts; admin option is visible only to admins.
- `/login`: email format is validated before submit.
- `/profile`: authenticated users can update their own name and email.

Role-based UI behavior:

- Policies page: create/delete controls visible only to admins.
- Claim detail page: update controls visible to admins or assigned adjuster; delete visible only to admins.
- Users page (`/users`): visible only to admins for viewing/editing other user accounts.

## How to Test User Creation/Profile Changes (Client)

Manual UI checklist:

1. Open `/register` and enter invalid name (for example, `Jane1!`) -> expect name validation error.
2. Open `/register` and enter invalid email (for example, `jane@domain`) -> expect email validation error.
3. Verify non-admin registration cannot choose `Admin` role.
4. Login as admin and verify `Admin` role option is visible on register page.
5. Open `/login` with invalid email format and confirm validation error.
6. Open `/profile`, test invalid name/email values, and confirm validation errors.
7. Save valid profile updates and confirm success message + updated displayed user info.
8. Verify role-based controls:
   - adjuster does not see policy create/delete actions
   - admin sees policy create/delete actions
   - claim delete visible only to admin
9. Login as admin and open `/users`:
   - verify the Users tab is visible in navbar
   - verify user list loads and Edit opens inline form
   - verify updating another user's name/email/role succeeds
10. Login as adjuster and verify Users tab/page is not accessible.

Run from `capstone-client`:

```bash
npm test
```

## Docker

Build image from project root:

```bash
docker build -f capstone-client/Dockerfile -t capstone-client:local capstone-client
```

Run container (maps host port `3000` to container port `80`):

```bash
docker run --rm -p 3000:80 capstone-client:local
```

Open `http://localhost:3000` in your browser.

## Production SSL Runtime

When running with `docker-compose.prod.yml`:

- `nginx-ssl.conf` is mounted as the active Nginx config
- TLS certs are mounted from `../certs` into `/etc/nginx/certs`
- app is served at `https://localhost:8443`
- `http://localhost:8080` redirects to HTTPS

## Kubernetes Runtime

In Kind/Kubernetes, the client is exposed on NodePort `30080`.

Use:

```text
http://localhost:30080/login
```

In EKS, the client Service uses `type: LoadBalancer`.

Get the load balancer hostname:

```bash
kubectl -n policy-claims get svc client -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
echo
```

Open:

```text
http://<load-balancer-hostname>/login
```

EKS deployment/smoke-test references (run from repo root):

- `./scripts/deploy-eks.sh`
- `npm run smoke:eks`
- `k8s/eks/README.md`
