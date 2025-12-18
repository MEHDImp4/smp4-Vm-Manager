#!/bin/bash

# Test Coverage Report Generator
# Generates combined coverage report for all services

echo "🧪 Generating Test Coverage Reports..."
echo ""

# Backend Coverage
echo "📊 Backend Coverage:"
cd backend
npm test -- --coverage --silent 2>/dev/null | grep -E "Lines|Statements|Functions|Branches" || echo "  Run: npm test -- --coverage"
cd ..
echo ""

# Frontend Coverage
echo "📊 Frontend Coverage:"
cd frontend
npm run test:coverage -- --silent 2>/dev/null | grep -E "Lines|Statements|Functions|Branches" || echo "  Run: npm run test:coverage"
cd ..
echo ""

# VPN Service Coverage
echo "📊 VPN Service Coverage:"
cd vpn
npm test -- --coverage --silent 2>/dev/null | grep -E "Lines|Statements|Functions|Branches" || echo "  Run: npm test -- --coverage"
cd ..
echo ""

echo "✅ Coverage reports generated!"
echo ""
echo "📈 For detailed reports, open:"
echo "  - Backend:  ./backend/coverage/lcov-report/index.html"
echo "  - Frontend: ./frontend/coverage/lcov-report/index.html"
echo "  - VPN:      ./vpn/coverage/lcov-report/index.html"
