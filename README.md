# PriceWaze (PriceMap)

AI-powered real estate intelligence platform for property pricing analysis, offer recommendations, and negotiation assistance.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📋 Tech Stack

- **Frontend**: Next.js 16.1, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes, Supabase
- **AI**: DeepSeek API, CrewAI (Python)
- **Maps**: Mapbox GL
- **State**: Zustand
- **Deployment**: Vercel

## 🔄 CI/CD

This project uses GitHub Actions for automated CI/CD:

- **Automatic builds** on push/PR
- **Automated tests** (Frontend + Backend)
- **Security scans** (weekly)
- **Auto-deployment** to Vercel (main branch)

See [docs/devops.md](./docs/devops.md) for detailed CI/CD documentation.

## 📚 Documentation

- [Architecture Overview](./docs/README.md)
- [Tech Stack](./docs/tech-stack.md)
- [DevOps & CI/CD](./docs/devops.md)
- [Design Decisions](./docs/adr/)

## 🧪 Testing

### Frontend
```bash
pnpm lint
pnpm build
```

### Backend (CrewAI)
```bash
cd crewai
pip install -e ".[dev]"
pytest tests/
```

## 🌍 Multi-Market Support

Configure via `NEXT_PUBLIC_MARKET_CODE`:
- `DO` - Dominican Republic
- `US` - United States
- `MX` - Mexico
- `ES` - Spain
- `CO` - Colombia
- `global` - Default

## 📦 Deployment

### Automatic (CI/CD)
- Push to `main` → Auto-deploy to Vercel

### Manual
```bash
vercel --prod
```

## 🔐 Environment Variables

See `.env.example` (create `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `NEXT_PUBLIC_MARKET_CODE`

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [CrewAI Documentation](https://docs.crewai.com)
