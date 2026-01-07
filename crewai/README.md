# PriceWaze CrewAI - Multi-Agent Real Estate Analysis

A sophisticated multi-agent AI system for Dominican Republic real estate analysis, powered by CrewAI and DeepSeek.

## 🏠 Overview

PriceWaze CrewAI provides intelligent property analysis through specialized AI agents:

- **Market Analyst** - Zone and market research
- **Pricing Analyst** - Property valuation and fair price estimation
- **Negotiation Advisor** - Offer strategies and counter-offer guidance
- **Legal Advisor** - Contract drafts and due diligence guidance
- **Coordinator** - Orchestrates multi-agent workflows

## 🚀 Quick Start

### 1. Setup Environment

```bash
cd crewai
./scripts/setup.sh
```

### 2. Configure Credentials

The system reads from `../.env.local` (PriceWaze project root). Ensure these are set:

```env
# Supabase
SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key

# DeepSeek AI
DEEPSEEK_API_KEY=your-key
DEEPSEEK_MODEL=deepseek-chat
```

### 3. Start the Server

```bash
source venv/bin/activate
python run.py
```

API available at: `http://localhost:8000`
Documentation: `http://localhost:8000/docs`

## 📚 API Endpoints

### Pricing Analysis

```http
POST /api/v1/pricing/analyze
{
  "property_id": "uuid",
  "zone_id": "optional-zone-uuid"
}
```

Quick check: `GET /api/v1/pricing/quick/{property_id}`

### Negotiation Advisory

**For Buyers:**
```http
POST /api/v1/negotiation/buyer-advice
{
  "property_id": "uuid",
  "buyer_budget": 200000
}
```

**For Sellers:**
```http
POST /api/v1/negotiation/seller-advice
{
  "property_id": "uuid",
  "offer_amount": 180000,
  "offer_message": "Optional buyer message"
}
```

### Contract Generation

```http
POST /api/v1/contracts/generate
{
  "property_id": "uuid",
  "buyer": {"name": "Juan Buyer"},
  "seller": {"name": "Maria Seller"},
  "property_address": "Calle 1, Santo Domingo",
  "agreed_price": 200000,
  "deposit_percent": 10,
  "closing_days": 30
}
```

### Full Analysis

```http
POST /api/v1/analysis/full
{
  "property_id": "uuid",
  "buyer_budget": 200000,
  "generate_contract": true,
  "buyer_name": "Juan Buyer",
  "seller_name": "Maria Seller"
}
```

## 🏗️ Architecture

```
crewai/
├── agents/           # Specialized AI agents
│   ├── market_analyst.py
│   ├── pricing_analyst.py
│   ├── negotiation_advisor.py
│   ├── legal_advisor.py
│   └── coordinator.py
├── crews/            # Crew orchestration
│   ├── pricing_crew.py
│   ├── negotiation_crew.py
│   ├── contract_crew.py
│   └── full_analysis_crew.py
├── tools/            # Agent capabilities
│   ├── database_tools.py
│   ├── analysis_tools.py
│   └── contract_tools.py
├── api/              # FastAPI endpoints
│   ├── main.py
│   └── routes/
├── config/           # Configuration
└── tests/            # Test suite
```

## 🧪 Testing

```bash
./scripts/test.sh
```

Or manually:
```bash
pytest tests/ -v
```

## 🔄 Crew Workflows

### Pricing Analysis Crew
1. Market Analyst researches zone statistics
2. Pricing Analyst compares property to market
3. Pricing Analyst generates offer suggestions

### Negotiation Advisory Crew
1. Analyst evaluates property position
2. Advisor develops negotiation strategy

### Contract Generation Crew
1. Legal Advisor validates terms
2. Legal Advisor generates bilingual draft
3. Negotiation Advisor assesses risks

### Full Analysis Crew
1. Market Analyst → Market research
2. Pricing Analyst → Valuation
3. Negotiation Advisor → Strategy
4. Legal Advisor → Due diligence
5. Coordinator → Executive summary

## ⚖️ Legal Disclaimer

All contracts generated are **NON-BINDING DRAFTS** for reference only. Professional legal counsel is required for any real estate transaction in the Dominican Republic.

## 📄 License

Proprietary - PriceWaze © 2025
