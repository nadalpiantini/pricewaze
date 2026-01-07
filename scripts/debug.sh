#!/bin/bash
# Debug script for PriceWaze CI/CD issues

set -e

echo "🔍 PriceWaze Debug Script"
echo "========================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "📦 Node.js Environment:"
node --version || echo -e "${RED}❌ Node.js not found${NC}"
pnpm --version || echo -e "${RED}❌ pnpm not found${NC}"
echo ""

# Check files
echo "📁 File Checks:"
[ -f "package.json" ] && echo -e "${GREEN}✅ package.json exists${NC}" || echo -e "${RED}❌ package.json missing${NC}"
[ -f "pnpm-lock.yaml" ] && echo -e "${GREEN}✅ pnpm-lock.yaml exists${NC}" || echo -e "${RED}❌ pnpm-lock.yaml missing${NC}"
[ -f "tsconfig.json" ] && echo -e "${GREEN}✅ tsconfig.json exists${NC}" || echo -e "${RED}❌ tsconfig.json missing${NC}"
[ -d "crewai" ] && echo -e "${GREEN}✅ crewai directory exists${NC}" || echo -e "${RED}❌ crewai directory missing${NC}"
echo ""

# Check dependencies
echo "📦 Dependency Checks:"
if [ -f "package.json" ]; then
  echo "Critical packages in package.json:"
  grep -E '"next"|"react"|"react-dom"|"typescript"|"@types/node"' package.json | head -5 || echo "⚠️ Could not find packages"
fi
echo ""

# Try to install dependencies
echo "🔧 Testing dependency installation:"
if command -v pnpm &> /dev/null; then
  echo "Attempting: pnpm install --frozen-lockfile"
  pnpm install --frozen-lockfile && echo -e "${GREEN}✅ Dependencies installed successfully${NC}" || echo -e "${RED}❌ Failed to install dependencies${NC}"
else
  echo -e "${YELLOW}⚠️ pnpm not available, skipping install test${NC}"
fi
echo ""

# Check build
echo "🔨 Build Configuration:"
if [ -f ".env.local" ] || [ -f ".env" ]; then
  echo -e "${GREEN}✅ Environment file found${NC}"
else
  echo -e "${YELLOW}⚠️ No .env.local or .env file found${NC}"
  echo "   Build may fail without proper environment variables"
fi

if [ -f "package.json" ]; then
  if grep -q '"build"' package.json; then
    echo -e "${GREEN}✅ Build script found in package.json${NC}"
    echo "   To test build: pnpm build"
  else
    echo -e "${YELLOW}⚠️ No build script found in package.json${NC}"
  fi
else
  echo -e "${RED}❌ package.json not found${NC}"
fi

if [ -d "node_modules" ]; then
  echo -e "${GREEN}✅ node_modules directory exists${NC}"
  echo "   Dependencies are installed"
else
  echo -e "${YELLOW}⚠️ node_modules not found${NC}"
  echo "   Run: pnpm install"
fi
echo ""

# Check Python
echo "🐍 Python Environment:"
if command -v python3 &> /dev/null; then
  python3 --version
  if [ -d "crewai" ]; then
    echo "Checking crewai/pyproject.toml:"
    [ -f "crewai/pyproject.toml" ] && echo -e "${GREEN}✅ pyproject.toml exists${NC}" || echo -e "${RED}❌ pyproject.toml missing${NC}"
  fi
else
  echo -e "${YELLOW}⚠️ Python3 not found${NC}"
fi
echo ""

# Check Git
echo "🔀 Git Status:"
git branch --show-current 2>/dev/null || echo "⚠️ Not a git repository"
git status --short 2>/dev/null | head -5 || echo "⚠️ Could not get git status"
echo ""

# Summary
echo "📊 Summary:"
echo "==========="
echo "Run this script to debug CI/CD issues locally."
echo "For GitHub Actions debugging, use: .github/workflows/debug.yml"
echo ""

