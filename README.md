# Policy Claims Tracker API

Backend API for managing insurance users, policies, and claims.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Role-based authorization (`admin`, `adjuster`)

## Data Models

### User
- `name`
- `email` (unique)
- `password` (hashed)
- `role` (`adjuster` or `admin`)

### Policy
- `policyNumber` (unique)
- `holderName`
- `type` (`auto`, `home`, `life`)
- `premiumAmount`
- `status` (`active`, `expired`, `cancelled`)
- `effectiveDate`
- `expirationDate`
- `owner` (ref to `User`)

### Claim
- `claimNumber` (auto-generated like `CLM-1001`)
- `policy` (ref to `Policy`)
- `description`
- `incidentDate`
- `claimedAmount`
- `status` (`submitted`, `under-review`, `approved`, `denied`, `closed`)
- `assignedAdjuster` (ref to `User`)
- `notes[]` with:
  - `author` (ref to `User`)
  - `text`
  - `timestamp`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env template:
   ```bash
   cp .env.example .env
   ```
3. Ensure MongoDB is running and set `MONGODB_URI`.
4. Start in development mode:
   ```bash
   npm run dev
   ```

API base URL: `http://localhost:4000`

## Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token required)

> First admin can be created via register by sending `role: "admin"` when no admin exists yet.

## Users

- `GET /api/users` (admin only)
- `GET /api/users/adjusters` (authenticated users)

## Policies

- `POST /api/policies` (admin only)
- `GET /api/policies`
- `GET /api/policies/:id`
- `PUT /api/policies/:id` (admin only)
- `DELETE /api/policies/:id` (admin only)

## Claims

- `POST /api/claims`
- `GET /api/claims`
- `GET /api/claims/:id`
- `PUT /api/claims/:id` (admin or assigned adjuster)
- `POST /api/claims/:id/notes`
- `DELETE /api/claims/:id` (admin only)

## Health Check

- `GET /health`
