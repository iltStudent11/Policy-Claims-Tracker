#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-policy-claims}"
TIMEOUT="${TIMEOUT:-180s}"

echo "==> Smoke test for namespace: ${NAMESPACE}"

if ! kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
  echo "Namespace '${NAMESPACE}' not found"
  exit 1
fi

echo "==> Waiting for core deployments"
kubectl -n "${NAMESPACE}" rollout status deployment/mongo --timeout="${TIMEOUT}"
kubectl -n "${NAMESPACE}" rollout status deployment/api --timeout="${TIMEOUT}"
kubectl -n "${NAMESPACE}" rollout status deployment/client --timeout="${TIMEOUT}"

echo "==> Validating internal API health"
kubectl -n "${NAMESPACE}" run curlcheck --image=curlimages/curl:8.10.1 --restart=Never --rm -i --command -- sh -lc 'curl -fsS http://api:4000/api/health >/dev/null'

echo "==> Resolving client load balancer hostname"
LB_HOST="$(kubectl -n "${NAMESPACE}" get svc client -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
if [[ -z "${LB_HOST}" ]]; then
  echo "Client LoadBalancer hostname is not ready yet"
  exit 1
fi

echo "==> Validating external app and API through load balancer"
curl -fsS "http://${LB_HOST}/" >/dev/null
curl -fsS "http://${LB_HOST}/api/health" >/dev/null

echo "✅ Smoke test passed"
echo "Frontend URL: http://${LB_HOST}/"
