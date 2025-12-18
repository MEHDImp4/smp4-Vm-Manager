#!/bin/bash

# Quick Start Script for Running Tests
# Usage: ./run-tests.sh [backend|frontend|vpn|all]

set -e

COMMAND=${1:-all}
COLORS='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'

echo -e "${BLUE}═══════════════════════════════════════${COLORS}"
echo -e "${BLUE}SMP4 VM Manager - Test Runner${COLORS}"
echo -e "${BLUE}═══════════════════════════════════════${COLORS}\n"

run_backend_tests() {
  echo -e "${YELLOW}🔧 Backend Tests${COLORS}"
  cd backend
  echo "Installing dependencies..."
  npm ci > /dev/null 2>&1 || true
  echo "Running tests..."
  npm test 2>&1 | tail -20
  cd ..
  echo -e "${GREEN}✓ Backend tests completed${COLORS}\n"
}

run_frontend_tests() {
  echo -e "${YELLOW}🎨 Frontend Tests${COLORS}"
  cd frontend
  echo "Installing dependencies..."
  npm ci > /dev/null 2>&1 || true
  echo "Running tests..."
  npm test -- --run 2>&1 | tail -20
  cd ..
  echo -e "${GREEN}✓ Frontend tests completed${COLORS}\n"
}

run_vpn_tests() {
  echo -e "${YELLOW}🔐 VPN Service Tests${COLORS}"
  cd vpn
  echo "Installing dependencies..."
  npm ci > /dev/null 2>&1 || true
  echo "Running tests..."
  npm test 2>&1 | tail -20
  cd ..
  echo -e "${GREEN}✓ VPN tests completed${COLORS}\n"
}

generate_coverage() {
  echo -e "${YELLOW}📊 Generating Coverage Reports${COLORS}"
  
  for service in backend frontend vpn; do
    if [ -f "$service/coverage/coverage-final.json" ]; then
      echo "  ✓ $service: $(cat $service/coverage/coverage-final.json | grep -o '"lines":{[^}]*' | head -1)"
    fi
  done
  echo -e "${GREEN}✓ Coverage reports ready${COLORS}\n"
}

case $COMMAND in
  backend)
    run_backend_tests
    ;;
  frontend)
    run_frontend_tests
    ;;
  vpn)
    run_vpn_tests
    ;;
  all)
    run_backend_tests
    run_frontend_tests
    run_vpn_tests
    generate_coverage
    ;;
  coverage)
    generate_coverage
    ;;
  *)
    echo -e "${RED}Unknown command: $COMMAND${COLORS}"
    echo "Usage: $0 [backend|frontend|vpn|all|coverage]"
    exit 1
    ;;
esac

echo -e "${GREEN}═══════════════════════════════════════${COLORS}"
echo -e "${GREEN}All tests completed! ✓${COLORS}"
echo -e "${GREEN}═══════════════════════════════════════${COLORS}"
