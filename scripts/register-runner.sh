#!/usr/bin/env bash
# ==============================================================================
# Helper Script to Register Azure GitHub Self-Hosted Runner
# Run this script directly on the runner VM (or via SSH / Azure Bastion)
# ==============================================================================

set -euo pipefail

RUNNER_DIR="/actions-runner"
RUNNER_USER="github-runner"
DEFAULT_LABELS="self-hosted,linux,azure,docker"
DEFAULT_NAME="$(hostname)"

echo "================================================================================"
echo "          Azure GitHub Self-Hosted Runner Registration Helper                   "
echo "================================================================================"

if [[ $EUID -ne 0 ]]; then
   echo "Error: This script must be run as root or with sudo." 
   exit 1
fi

if [[ ! -d "$RUNNER_DIR" ]]; then
  echo "Error: Runner directory $RUNNER_DIR does not exist. Ensure cloud-init has finished."
  exit 1
fi

# Parse CLI flags or prompt
REPO_URL=""
TOKEN=""
RUNNER_NAME="$DEFAULT_NAME"
RUNNER_LABELS="$DEFAULT_LABELS"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      REPO_URL="$2"
      shift 2
      ;;
    --token)
      TOKEN="$2"
      shift 2
      ;;
    --name)
      RUNNER_NAME="$2"
      shift 2
      ;;
    --labels)
      RUNNER_LABELS="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: sudo ./register-runner.sh --url <REPO_OR_ORG_URL> --token <TOKEN> [--name <NAME>] [--labels <LABELS>]"
      exit 0
      ;;
    *)
      echo "Unknown flag: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$REPO_URL" ]]; then
  read -r -p "Enter GitHub Repository or Org URL (e.g. https://github.com/my-org/my-repo): " REPO_URL
fi

if [[ -z "$TOKEN" ]]; then
  read -r -s -p "Enter short-lived Runner Registration Token from GitHub: " TOKEN
  echo ""
fi

if [[ -z "$REPO_URL" || -z "$TOKEN" ]]; then
  echo "Error: Both URL and short-lived registration token are required."
  exit 1
fi

echo ""
echo "Configuring runner under user: $RUNNER_USER..."
su - "$RUNNER_USER" -c "cd $RUNNER_DIR && ./config.sh \
  --url '$REPO_URL' \
  --token '$TOKEN' \
  --name '$RUNNER_NAME' \
  --labels '$RUNNER_LABELS' \
  --work '_work' \
  --unattended \
  --replace"

echo ""
echo "Installing runner as systemd service..."
cd "$RUNNER_DIR"
./svc.sh install "$RUNNER_USER"

echo "Starting systemd runner service..."
./svc.sh start

echo "Checking runner service status..."
./svc.sh status

echo ""
echo "================================================================================"
echo "Runner successfully registered and active!"
echo "Check your GitHub Repository: Settings -> Actions -> Runners"
echo "Labels configured: $RUNNER_LABELS"
echo "================================================================================"
