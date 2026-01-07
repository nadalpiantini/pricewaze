#!/bin/bash
# PriceWaze CrewAI Setup Script

set -e

echo "🏠 PriceWaze CrewAI Setup"
echo "========================="

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
REQUIRED_VERSION="3.11"

echo "📍 Python version: $PYTHON_VERSION"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -e ".[dev]"

# Check for .env.local
if [ ! -f "../.env.local" ]; then
    echo "⚠️ Warning: .env.local not found in parent directory"
    echo "   The CrewAI server reads configuration from ../env.local"
    echo "   Make sure your Supabase and DeepSeek credentials are configured there"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server:"
echo "  cd crewai"
echo "  source venv/bin/activate"
echo "  python run.py"
echo ""
echo "API documentation will be available at:"
echo "  http://localhost:8000/docs"
