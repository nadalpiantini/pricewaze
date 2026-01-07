#!/bin/bash
# Run tests for PriceWaze CrewAI

set -e

echo "🧪 Running PriceWaze CrewAI Tests"
echo "================================="

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run pytest with coverage
pytest tests/ -v --tb=short --cov=. --cov-report=term-missing

echo ""
echo "✅ Tests complete!"
