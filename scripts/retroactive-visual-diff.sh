#!/usr/bin/env bash
set -eux
# Retroactive Visual Diff - Generate visual diffs across git history
# Usage: ./retroactive-visual-diff.sh <start-commit> <end-commit> [interval]
#
# Author: Augment Code
# Version: 1.0.0

set -eo pipefail

# Default configuration
INTERVAL_DEFAULT=5
TEMP_DIR=".tmp/visual-tests"
TIMESTAMP=$(date +%s)
TESTING_PROJECT_NAME="visual-test-${TIMESTAMP}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cleanup() {
  log_info "Cleaning up resources..."
  cd "${ORIGINAL_DIR}" || exit 1
  if [[ -d "${TEMP_DIR}/repo-clone" ]]; then
    docker compose --project-name "${TESTING_PROJECT_NAME}" down -v 2>/dev/null || true
  fi
}

check_requirements() {
  for cmd in git docker sed; do
    if ! command -v "${cmd}" &> /dev/null; then
      log_error "${cmd} is required but not installed. Aborting."
      exit 1
    fi
  done
}

# Parse arguments
if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <start-commit> <end-commit> [interval]"
  exit 1
fi

START_COMMIT="$1"
END_COMMIT="$2"
INTERVAL="${3:-${INTERVAL_DEFAULT}}"

# Setup trap for cleanup on exit
trap cleanup EXIT INT TERM

# Check requirements
check_requirements

# Export environment variables for docker-compose
export COMPOSE_PROJECT_NAME="${TESTING_PROJECT_NAME}"
export APP_PORT="5174"  # Use different ports to avoid conflicts
export API_PORT="3001"
export VISUAL_TEST_DIR="${PWD}/${TEMP_DIR}"
export VOLUMES_EXTERNAL="false"  # Create volumes on-demand

ORIGINAL_DIR="$(pwd)"

# Create directory structure
log_info "Creating directory structure..."
mkdir -p "${TEMP_DIR}/screenshots" "${TEMP_DIR}/diffs" "${TEMP_DIR}/docker-files" "${TEMP_DIR}/repo-clone"

# Clone repository
log_info "Cloning repository for testing..."
REPO_URL=$(git remote get-url origin)
git clone "${REPO_URL}" "${TEMP_DIR}/repo-clone"
cd "${TEMP_DIR}/repo-clone" || { log_error "Failed to enter repo directory"; exit 1; }

# Backup Docker files
log_info "Backing up Docker configuration..."
cp "${ORIGINAL_DIR}/docker-compose.yml" "${ORIGINAL_DIR}/${TEMP_DIR}/docker-files/" || log_warn "docker-compose.yml not found"
cp "${ORIGINAL_DIR}/Dockerfile" "${ORIGINAL_DIR}/${TEMP_DIR}/docker-files/" || log_warn "Dockerfile not found"
cp "${ORIGINAL_DIR}/Dockerfile.visual-test" "${ORIGINAL_DIR}/${TEMP_DIR}/docker-files/" || log_warn "Dockerfile.visual-test not found"

# Get commit list
log_info "Analyzing commit history..."
COMMITS=$(git log --reverse --pretty=format:"%h" "${START_COMMIT}".."${END_COMMIT}")
COMMIT_COUNT=$(echo "${COMMITS}" | wc -l | tr -d ' ')
STEP=$((COMMIT_COUNT / INTERVAL))

if [[ ${STEP} -lt 1 ]]; then
  STEP=1
  log_warn "Interval too large for commit count, defaulting to processing all commits"
fi

log_info "Found ${COMMIT_COUNT} commits, processing every ${STEP} commit(s)"

# Process commits
COUNT=0
PREV_COMMIT_HASH=""

for commit in ${COMMITS}; do
  if [[ $((COUNT % STEP)) -eq 0 ]]; then
    log_info "Processing commit ${commit} (${COUNT} of ${COMMIT_COUNT})"

    # Clean workspace and checkout commit
    git clean -fdx
    git checkout --force "${commit}"

    # Restore Docker files
    log_info "Restoring Docker files for commit ${commit}"
    mkdir -p "$(dirname Dockerfile)"
    cp "${ORIGINAL_DIR}/${TEMP_DIR}/docker-files/docker-compose.yml" ./ 2>/dev/null || log_warn "Failed to copy docker-compose.yml"
    cp "${ORIGINAL_DIR}/${TEMP_DIR}/docker-files/Dockerfile" ./ 2>/dev/null || log_warn "Failed to copy Dockerfile"
    cp "${ORIGINAL_DIR}/${TEMP_DIR}/docker-files/Dockerfile.visual-test" ./ 2>/dev/null || log_warn "Failed to copy Dockerfile.visual-test"

    # Build and start app
    log_info "Starting application container..."
    if ! docker compose up -d app; then
      log_error "Failed to start app container for commit ${commit}, skipping"
      continue
    fi
    
    # Take screenshot using the screenshot service
    log_info "Capturing screenshot for commit ${commit}"
    export COMMIT_HASH="${commit}"
    if ! docker compose --profile visual-testing run --rm screenshot; then
      log_error "Failed to capture screenshot for commit ${commit}, skipping"
      docker compose down -v
      continue
    fi
    
    # Compare with previous if exists
    if [[ -n "${PREV_COMMIT_HASH}" ]]; then
      log_info "Comparing with previous commit screenshot"
      export PREV_COMMIT_HASH="${PREV_COMMIT_HASH}"
      if ! docker compose --profile visual-testing run --rm compare; then
        log_warn "Failed to generate diff for commit ${commit}"
      fi
    fi

    PREV_COMMIT_HASH="${commit}"

    # Clean up containers
    log_info "Cleaning up containers..."
    docker compose down -v
  fi
  COUNT=$((COUNT + 1))
done

# Return to original directory
cd "${ORIGINAL_DIR}" || exit 1

log_success "Visual history created in ${TEMP_DIR}/"
log_info "Screenshots: ${TEMP_DIR}/screenshots/"
log_info "Diffs: ${TEMP_DIR}/diffs/"


