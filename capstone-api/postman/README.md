# Postman Quick Start

1. Start API from `capstone-api`:
   ```bash
   npm run dev
   ```
2. In Postman, import:
   - `Policy-Claims-Tracker.postman_collection.json`
   - `Policy-Claims-Tracker.local.postman_environment.json`
3. Select environment **Policy Claims Tracker Local**.
4. Run requests in this order:
   - `Health`
   - `Auth > Login (seed admin)`
   - `Policies > List Policies` (sets `policyId`)
   - `Claims > Create Claim` (sets `claimId`)
   - Remaining endpoints as needed.

## Run with Newman

From `capstone-api`:

```bash
npm install
npm run postman:test
```

Fail fast on first error:

```bash
npm run postman:test:bail
```

## Notes

- If your API is on port 4000, change `baseUrl` in the environment to:
  - `http://localhost:4000/api`
- Seed credentials in collection/environment:
  - `admin@capstone.local` / `Password123!`
- For fresh sample data:
  ```bash
  SEED_CONFIRM=true npm run seed
  ```
