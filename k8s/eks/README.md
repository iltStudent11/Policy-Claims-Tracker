# EKS Deployment Assets

This folder contains EKS-ready manifests for the Policy Claims Tracker.

## Files

- `namespace.yaml` - Namespace for the app
- `mongo.yaml` - MongoDB Deployment + PVC + ClusterIP Service
- `api.yaml` - API Deployment + ClusterIP Service (image placeholder: `__API_IMAGE__`)
- `client.yaml` - Client Deployment + LoadBalancer Service (image placeholder: `__CLIENT_IMAGE__`)

## Fastest path

From repo root, run:

```bash
./scripts/deploy-eks.sh
```

Environment variables you can override:

- `AWS_REGION` (default: `us-east-1`)
- `CLUSTER_NAME` (default: `policy-claims-eks`)
- `NODE_TYPE` (default: `t3.medium`)
- `NODES` (default: `2`)
- `JWT_SECRET` (default: `change-me-in-production`)

After deployment, get the frontend URL:

```bash
kubectl -n policy-claims get svc client
```

Print only the load balancer hostname:

```bash
kubectl -n policy-claims get svc client -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
echo
```

Seed data once (destructive):

```bash
kubectl exec -n policy-claims deployment/api -- sh -lc 'SEED_CONFIRM=true node dist/seed.js'
```

Run post-deploy smoke test with `./scripts/smoke-test-eks.sh` (or `npm run smoke:eks` from repo root).

Optional overrides:

- `NAMESPACE` (default: `policy-claims`)
- `TIMEOUT` (default: `180s`)
