#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${CLUSTER_NAME:-policy-claims-eks}"
NODE_TYPE="${NODE_TYPE:-t3.medium}"
NODES="${NODES:-2}"
JWT_SECRET_VALUE="${JWT_SECRET:-change-me-in-production}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd aws
require_cmd eksctl
require_cmd kubectl
require_cmd docker
require_cmd sed

aws sts get-caller-identity >/dev/null
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"

API_REPO="policy-claims-api"
CLIENT_REPO="policy-claims-client"
API_IMAGE="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$API_REPO:latest"
CLIENT_IMAGE="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$CLIENT_REPO:latest"

echo "Using account: $ACCOUNT_ID"
echo "Using region:  $AWS_REGION"
echo "Cluster name:  $CLUSTER_NAME"

aws ecr describe-repositories --repository-names "$API_REPO" --region "$AWS_REGION" >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name "$API_REPO" --region "$AWS_REGION" >/dev/null

aws ecr describe-repositories --repository-names "$CLIENT_REPO" --region "$AWS_REGION" >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name "$CLIENT_REPO" --region "$AWS_REGION" >/dev/null

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker build -t "$API_REPO:latest" "$REPO_ROOT/capstone-api"
docker tag "$API_REPO:latest" "$API_IMAGE"
docker push "$API_IMAGE"

docker build -t "$CLIENT_REPO:latest" "$REPO_ROOT/capstone-client"
docker tag "$CLIENT_REPO:latest" "$CLIENT_IMAGE"
docker push "$CLIENT_IMAGE"

if ! eksctl get cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  eksctl create cluster \
    --name "$CLUSTER_NAME" \
    --region "$AWS_REGION" \
    --nodes "$NODES" \
    --node-type "$NODE_TYPE" \
    --managed
fi

aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION"

kubectl apply -f "$REPO_ROOT/k8s/eks/namespace.yaml"

kubectl -n policy-claims create secret generic jwt-secret \
  --from-literal=JWT_SECRET="$JWT_SECRET_VALUE" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n policy-claims create secret generic mongodb-secret \
  --from-literal=MONGODB_URI="mongodb://mongo:27017/policy-claims" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n policy-claims create secret generic api-config-secret \
  --from-literal=PORT="4000" \
  --from-literal=NODE_ENV="production" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f "$REPO_ROOT/k8s/eks/mongo.yaml"

sed "s|__API_IMAGE__|$API_IMAGE|g" "$REPO_ROOT/k8s/eks/api.yaml" | kubectl apply -f -
sed "s|__CLIENT_IMAGE__|$CLIENT_IMAGE|g" "$REPO_ROOT/k8s/eks/client.yaml" | kubectl apply -f -

kubectl -n policy-claims rollout status deployment/mongo --timeout=180s
kubectl -n policy-claims rollout status deployment/api --timeout=180s
kubectl -n policy-claims rollout status deployment/client --timeout=180s

echo "Deployment complete."
echo "Check service endpoint with: kubectl -n policy-claims get svc client"
echo "Seed once (destructive): kubectl exec -n policy-claims deployment/api -- sh -lc 'SEED_CONFIRM=true node dist/seed.js'"
